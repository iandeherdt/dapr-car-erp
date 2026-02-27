import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// Resolve the proto root directory.
// In production (Docker) protos are at /app/proto.
// In development they are two levels up from dist/ or src/.
function resolveProtoRoot(): string {
  if (process.env.PROTO_PATH) {
    return process.env.PROTO_PATH;
  }
  // Docker image copies protos to /app/proto
  if (process.env.NODE_ENV === 'production') {
    return '/app/proto';
  }
  // Development: __dirname is bff/src/clients (tsx) or bff/dist/clients (node)
  // Go up 3 levels to reach the monorepo root, then into proto/
  return path.resolve(__dirname, '..', '..', '..', 'proto');
}

const PROTO_ROOT = resolveProtoRoot();

// Dapr sidecar gRPC endpoint
const DAPR_GRPC_PORT = parseInt(process.env.DAPR_GRPC_PORT || '50001', 10);
const DAPR_ADDRESS = `localhost:${DAPR_GRPC_PORT}`;

// Shared proto-loader options matching backend service conventions
const PROTO_LOADER_OPTIONS: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [PROTO_ROOT],
};

// Cache loaded package definitions to avoid re-parsing on every request
const packageDefCache = new Map<string, protoLoader.PackageDefinition>();

function loadPackageDefinition(protoRelativePath: string): protoLoader.PackageDefinition {
  if (packageDefCache.has(protoRelativePath)) {
    return packageDefCache.get(protoRelativePath)!;
  }

  const fullPath = path.join(PROTO_ROOT, protoRelativePath);
  const packageDef = protoLoader.loadSync(fullPath, PROTO_LOADER_OPTIONS);
  packageDefCache.set(protoRelativePath, packageDef);
  return packageDef;
}

// Shared insecure credentials (Dapr sidecar on localhost)
const CREDENTIALS = grpc.credentials.createInsecure();

export interface GrpcCallOptions {
  daprAppId: string;
  timeoutMs?: number;
}

/**
 * Build gRPC Metadata that tells the Dapr sidecar which app-id to proxy to.
 * Optionally propagates a correlation ID for distributed tracing.
 */
export function buildDaprMetadata(daprAppId: string, correlationId?: string): grpc.Metadata {
  const metadata = new grpc.Metadata();
  metadata.set('dapr-app-id', daprAppId);
  if (correlationId) {
    metadata.set('x-correlation-id', correlationId);
  }
  return metadata;
}

/**
 * Map a gRPC status code to an HTTP status code.
 */
export function grpcStatusToHttp(code: grpc.status): number {
  switch (code) {
    case grpc.status.NOT_FOUND:
      return 404;
    case grpc.status.INVALID_ARGUMENT:
      return 400;
    case grpc.status.ALREADY_EXISTS:
      return 409;
    case grpc.status.PERMISSION_DENIED:
      return 403;
    case grpc.status.UNAUTHENTICATED:
      return 401;
    case grpc.status.RESOURCE_EXHAUSTED:
      return 429;
    case grpc.status.UNIMPLEMENTED:
      return 501;
    case grpc.status.UNAVAILABLE:
      return 503;
    case grpc.status.DEADLINE_EXCEEDED:
      return 504;
    default:
      return 500;
  }
}

export class GrpcClientError extends Error {
  public readonly httpStatus: number;
  public readonly grpcCode: grpc.status;

  constructor(message: string, grpcCode: grpc.status) {
    super(message);
    this.name = 'GrpcClientError';
    this.grpcCode = grpcCode;
    this.httpStatus = grpcStatusToHttp(grpcCode);
  }
}

/**
 * Wrap a gRPC service error as a GrpcClientError.
 */
function wrapGrpcError(err: grpc.ServiceError): GrpcClientError {
  return new GrpcClientError(err.details || err.message, err.code ?? grpc.status.INTERNAL);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceConstructor = new (address: string, credentials: grpc.ChannelCredentials) => any;

/**
 * Create a gRPC service client connected to the Dapr sidecar.
 *
 * @param protoRelativePath - Proto file path relative to PROTO_ROOT (e.g. "customer/v1/customer.proto")
 * @param packageName       - Fully qualified package name (e.g. "customer.v1")
 * @param serviceName       - Service name within the package (e.g. "CustomerService")
 * @param daprAppId         - Dapr app-id for the target service
 */
export function createServiceClient<T extends object>(
  protoRelativePath: string,
  packageName: string,
  serviceName: string,
  daprAppId: string,
): {
  call: <Req, Res>(
    method: string,
    request: Req,
    timeoutMs?: number,
    correlationId?: string,
  ) => Promise<Res>;
} {
  const packageDef = loadPackageDefinition(protoRelativePath);
  const grpcObject = grpc.loadPackageDefinition(packageDef);

  // Navigate the nested package structure (e.g. "customer.v1" -> grpcObject.customer.v1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pkg: any = grpcObject;
  for (const part of packageName.split('.')) {
    pkg = pkg[part];
    if (!pkg) {
      throw new Error(`Package part "${part}" not found in loaded proto for ${protoRelativePath}`);
    }
  }

  const ServiceClass: ServiceConstructor = pkg[serviceName];
  if (!ServiceClass) {
    throw new Error(`Service "${serviceName}" not found in package "${packageName}"`);
  }

  const client: T = new ServiceClass(DAPR_ADDRESS, CREDENTIALS);

  return {
    call<Req, Res>(method: string, request: Req, timeoutMs = 10_000, correlationId?: string): Promise<Res> {
      return new Promise<Res>((resolve, reject) => {
        const metadata = buildDaprMetadata(daprAppId, correlationId);

        const deadline = new Date();
        deadline.setMilliseconds(deadline.getMilliseconds() + timeoutMs);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientAny = client as any;
        if (typeof clientAny[method] !== 'function') {
          return reject(new Error(`Method "${method}" not found on client for service "${serviceName}"`));
        }

        clientAny[method](
          request,
          metadata,
          { deadline },
          (err: grpc.ServiceError | null, response: Res) => {
            if (err) {
              reject(wrapGrpcError(err));
            } else {
              resolve(response);
            }
          },
        );
      });
    },
  };
}
