import path from 'path';
import { fileURLToPath } from 'url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { withServiceLogging } from './logger.js';
import prisma from './infrastructure/db/prisma.js';
import { PrismaCustomerRepository } from './infrastructure/repositories/PrismaCustomerRepository.js';
import { PrismaVehicleRepository } from './infrastructure/repositories/PrismaVehicleRepository.js';
import { DaprEventPublisher } from './infrastructure/events/DaprEventPublisher.js';
import { CreateCustomerUseCase } from './application/use-cases/customers/CreateCustomerUseCase.js';
import { GetCustomerUseCase } from './application/use-cases/customers/GetCustomerUseCase.js';
import { ListCustomersUseCase } from './application/use-cases/customers/ListCustomersUseCase.js';
import { UpdateCustomerUseCase } from './application/use-cases/customers/UpdateCustomerUseCase.js';
import { DeleteCustomerUseCase } from './application/use-cases/customers/DeleteCustomerUseCase.js';
import { AddVehicleUseCase } from './application/use-cases/vehicles/AddVehicleUseCase.js';
import { GetVehicleUseCase } from './application/use-cases/vehicles/GetVehicleUseCase.js';
import { ListVehiclesByCustomerUseCase } from './application/use-cases/vehicles/ListVehiclesByCustomerUseCase.js';
import { UpdateVehicleUseCase } from './application/use-cases/vehicles/UpdateVehicleUseCase.js';
import { CustomerGrpcHandler } from './presentation/grpc/CustomerGrpcHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_BASE = process.env.PROTO_PATH ?? path.resolve(__dirname, '../../..', 'proto');
const CUSTOMER_PROTO_PATH = path.join(PROTO_BASE, 'customer/v1/customer.proto');

const packageDefinition = protoLoader.loadSync(CUSTOMER_PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [PROTO_BASE],
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const CustomerService = protoDescriptor.customer.v1.CustomerService;

function main() {
  // Infrastructure
  const customerRepo = new PrismaCustomerRepository(prisma);
  const vehicleRepo = new PrismaVehicleRepository(prisma);
  const eventPublisher = new DaprEventPublisher();

  // Use cases
  const createCustomerUC = new CreateCustomerUseCase(customerRepo, eventPublisher);
  const getCustomerUC = new GetCustomerUseCase(customerRepo);
  const listCustomersUC = new ListCustomersUseCase(customerRepo);
  const updateCustomerUC = new UpdateCustomerUseCase(customerRepo, eventPublisher);
  const deleteCustomerUC = new DeleteCustomerUseCase(customerRepo);
  const addVehicleUC = new AddVehicleUseCase(customerRepo, vehicleRepo);
  const getVehicleUC = new GetVehicleUseCase(vehicleRepo);
  const listVehiclesByCustomerUC = new ListVehiclesByCustomerUseCase(customerRepo, vehicleRepo);
  const updateVehicleUC = new UpdateVehicleUseCase(vehicleRepo);

  // Handler
  const handler = new CustomerGrpcHandler(
    createCustomerUC,
    getCustomerUC,
    listCustomersUC,
    updateCustomerUC,
    deleteCustomerUC,
    addVehicleUC,
    getVehicleUC,
    listVehiclesByCustomerUC,
    updateVehicleUC,
  );

  const server = new grpc.Server();
  server.addService(CustomerService.service, withServiceLogging({
    createCustomer: handler.createCustomer,
    getCustomer: handler.getCustomer,
    listCustomers: handler.listCustomers,
    updateCustomer: handler.updateCustomer,
    deleteCustomer: handler.deleteCustomer,
    addVehicle: handler.addVehicle,
    getVehicle: handler.getVehicle,
    listVehiclesByCustomer: handler.listVehiclesByCustomer,
    updateVehicle: handler.updateVehicle,
  }));

  const port = process.env.APP_PORT ?? '50051';
  const address = `0.0.0.0:${port}`;

  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('[customer-service] Failed to bind server:', err);
      process.exit(1);
    }
    console.log(`[customer-service] gRPC server listening on ${address} (bound port: ${boundPort})`);
  });
}

main();
