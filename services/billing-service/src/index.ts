import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import { connectMongo } from './infrastructure/db/mongoose';
import { MongoInvoiceRepository } from './infrastructure/repositories/MongoInvoiceRepository';
import { DaprEventPublisher } from './infrastructure/events/DaprEventPublisher';
import { getNextInvoiceNumber } from './infrastructure/schemas/InvoiceMongooseSchema';
import { CreateInvoiceUseCase } from './application/use-cases/CreateInvoiceUseCase';
import { GetInvoiceUseCase } from './application/use-cases/GetInvoiceUseCase';
import { ListInvoicesUseCase } from './application/use-cases/ListInvoicesUseCase';
import { UpdateInvoiceStatusUseCase } from './application/use-cases/UpdateInvoiceStatusUseCase';
import { GetInvoicesByCustomerUseCase } from './application/use-cases/GetInvoicesByCustomerUseCase';
import { BillingGrpcHandler } from './presentation/grpc/BillingGrpcHandler';
import { createHttpServer } from './presentation/http/EventHandler';
import { logger, withServiceLogging } from './logger';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/billing_db';
const GRPC_PORT = process.env.APP_PORT ?? '50051';
const HTTP_PORT = process.env.APP_HTTP_PORT ?? '3001';

// ---------------------------------------------------------------------------
// Proto loading
//
// The proto file imports "common/v1/types.proto" so the includeDirs must
// point to the root of the proto tree so that the relative import resolves.
//
// Resolution order (first existing path wins):
//   1. PROTO_PATH env var (explicit override)
//   2. /app/proto            (Docker runtime — see Dockerfile)
//   3. <cwd>/proto           (project-root invocation in dev)
//   4. <__dirname>/../proto  (dist/ → service root, for local `npm run dev`)
// ---------------------------------------------------------------------------

function resolveProtoRoot(): string {
  const candidates = [
    process.env.PROTO_PATH,
    '/app/proto',
    path.resolve(process.cwd(), 'proto'),
    path.resolve(__dirname, '..', 'proto'),
    path.resolve(__dirname, '..', '..', '..', 'proto'), // monorepo root
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const probe = path.join(candidate, 'billing', 'v1', 'billing.proto');
      if (fs.existsSync(probe)) return candidate;
    } catch {
      // continue
    }
  }

  // Last resort — use the relative path and let proto-loader fail with a
  // clear message rather than a cryptic one
  return path.resolve(__dirname, '..', '..', '..', 'proto');
}

const PROTO_ROOT = resolveProtoRoot();
const BILLING_PROTO_PATH = path.join(
  PROTO_ROOT,
  'billing',
  'v1',
  'billing.proto'
);

async function loadProto() {
  const packageDefinition = await protoLoader.load(BILLING_PROTO_PATH, {
    keepCase: true,        // preserve snake_case field names from the proto
    longs: String,
    enums: Number,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_ROOT],
  });

  return grpc.loadPackageDefinition(packageDefinition);
}

// ---------------------------------------------------------------------------
// gRPC server
// ---------------------------------------------------------------------------

async function startGrpcServer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proto: Record<string, any>,
  handler: BillingGrpcHandler
): Promise<grpc.Server> {
  const BillingService =
    proto['billing']['v1']['BillingService'] as grpc.ServiceClientConstructor;

  const server = new grpc.Server();

  server.addService(
    BillingService.service,
    withServiceLogging({
      CreateInvoice: handler.createInvoice,
      GetInvoice: handler.getInvoice,
      ListInvoices: handler.listInvoices,
      UpdateInvoiceStatus: handler.updateInvoiceStatus,
      GetInvoicesByCustomer: handler.getInvoicesByCustomer,
    })
  );

  await new Promise<void>((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${GRPC_PORT}`,
      grpc.ServerCredentials.createInsecure(),
      (err, port) => {
        if (err) return reject(err);
        logger.info({ action: 'grpc.start', port }, 'gRPC server listening');
        resolve();
      }
    );
  });

  return server;
}

// ---------------------------------------------------------------------------
// HTTP server (Dapr pub/sub event delivery)
// ---------------------------------------------------------------------------

function startHttpServer(createInvoiceUC: CreateInvoiceUseCase): void {
  const server = createHttpServer(createInvoiceUC);
  server.listen(parseInt(HTTP_PORT, 10), '0.0.0.0', () => {
    logger.info({ action: 'http.start', port: HTTP_PORT }, 'HTTP server listening');
  });
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function setupShutdown(grpcServer: grpc.Server): void {
  const shutdown = async (signal: string) => {
    console.log(`[index] Received ${signal}, shutting down...`);

    grpcServer.tryShutdown(async () => {
      console.log('[index] gRPC server shut down');
      await mongoose.disconnect();
      console.log('[index] MongoDB disconnected');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      console.error('[index] Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  try {
    logger.info({ action: 'mongodb.connect' }, 'Connecting to MongoDB');
    await connectMongo(MONGODB_URI);
    logger.info({ action: 'mongodb.connect' }, 'MongoDB connected');

    // Wire up infrastructure
    const invoiceRepo = new MongoInvoiceRepository();
    const eventPublisher = new DaprEventPublisher();

    // Wire up use cases
    const createInvoiceUC = new CreateInvoiceUseCase({
      invoiceRepo,
      eventPublisher,
      getInvoiceNumber: getNextInvoiceNumber,
    });
    const getInvoiceUC = new GetInvoiceUseCase(invoiceRepo);
    const listInvoicesUC = new ListInvoicesUseCase(invoiceRepo);
    const updateInvoiceStatusUC = new UpdateInvoiceStatusUseCase(invoiceRepo, eventPublisher);
    const getInvoicesByCustomerUC = new GetInvoicesByCustomerUseCase(invoiceRepo);

    // Wire up presentation layer
    const grpcHandler = new BillingGrpcHandler(
      createInvoiceUC,
      getInvoiceUC,
      listInvoicesUC,
      updateInvoiceStatusUC,
      getInvoicesByCustomerUC,
    );

    const proto = await loadProto();
    const grpcServer = await startGrpcServer(proto, grpcHandler);

    startHttpServer(createInvoiceUC);

    setupShutdown(grpcServer);

    logger.info({ action: 'service.ready' }, 'Billing service is ready');
  } catch (err) {
    logger.error({ action: 'service.start', error: { message: (err as Error).message, stack: (err as Error).stack } }, 'Failed to start billing service');
    process.exit(1);
  }
}

main();
