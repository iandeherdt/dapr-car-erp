import path from 'path';
import { fileURLToPath } from 'url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import {
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
  deleteCustomer,
  addVehicle,
  getVehicle,
  listVehiclesByCustomer,
  updateVehicle,
} from './service/customer-service.js';
import { withServiceLogging } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Proto files are copied to /proto inside the Docker image, or resolved from
// the monorepo root during local development.
const PROTO_BASE =
  process.env.PROTO_PATH ?? path.resolve(__dirname, '../../..', 'proto');

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
  const server = new grpc.Server();

  server.addService(CustomerService.service, withServiceLogging({
    createCustomer,
    getCustomer,
    listCustomers,
    updateCustomer,
    deleteCustomer,
    addVehicle,
    getVehicle,
    listVehiclesByCustomer,
    updateVehicle,
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
