import * as grpc from '@grpc/grpc-js';
import { CreateCustomerUseCase } from '../../application/use-cases/customers/CreateCustomerUseCase.js';
import { GetCustomerUseCase } from '../../application/use-cases/customers/GetCustomerUseCase.js';
import { ListCustomersUseCase } from '../../application/use-cases/customers/ListCustomersUseCase.js';
import { UpdateCustomerUseCase } from '../../application/use-cases/customers/UpdateCustomerUseCase.js';
import { DeleteCustomerUseCase } from '../../application/use-cases/customers/DeleteCustomerUseCase.js';
import { AddVehicleUseCase } from '../../application/use-cases/vehicles/AddVehicleUseCase.js';
import { GetVehicleUseCase } from '../../application/use-cases/vehicles/GetVehicleUseCase.js';
import { ListVehiclesByCustomerUseCase } from '../../application/use-cases/vehicles/ListVehiclesByCustomerUseCase.js';
import { UpdateVehicleUseCase } from '../../application/use-cases/vehicles/UpdateVehicleUseCase.js';
import { NotFoundError } from '../../domain/errors.js';
import { CustomerEntity } from '../../domain/entities/Customer.js';
import { VehicleEntity } from '../../domain/entities/Vehicle.js';

function mapVehicle(v: VehicleEntity) {
  return {
    id: v.id,
    customerId: v.customerId,
    make: v.make,
    model: v.model,
    year: v.year,
    vin: v.vin ?? '',
    licensePlate: v.licensePlate ?? '',
    mileageKm: v.mileageKm,
    color: v.color ?? '',
    engineType: v.engineType ?? '',
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

function mapCustomer(c: CustomerEntity) {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email ?? '',
    phone: c.phone ?? '',
    addressLine1: c.addressLine1,
    addressLine2: c.addressLine2 ?? '',
    city: c.city,
    postalCode: c.postalCode,
    country: c.country,
    companyName: c.companyName ?? '',
    vatNumber: c.vatNumber ?? '',
    vehicles: c.vehicles.map(mapVehicle),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function handleError(err: unknown, callback: grpc.sendUnaryData<any>): void {
  if (err instanceof NotFoundError) {
    callback({ code: grpc.status.NOT_FOUND, message: err.message });
  } else {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : 'Internal error',
    });
  }
}

export class CustomerGrpcHandler {
  constructor(
    private readonly createCustomerUC: CreateCustomerUseCase,
    private readonly getCustomerUC: GetCustomerUseCase,
    private readonly listCustomersUC: ListCustomersUseCase,
    private readonly updateCustomerUC: UpdateCustomerUseCase,
    private readonly deleteCustomerUC: DeleteCustomerUseCase,
    private readonly addVehicleUC: AddVehicleUseCase,
    private readonly getVehicleUC: GetVehicleUseCase,
    private readonly listVehiclesByCustomerUC: ListVehiclesByCustomerUseCase,
    private readonly updateVehicleUC: UpdateVehicleUseCase,
  ) {}

  createCustomer = async (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const customer = await this.createCustomerUC.execute(call.request);
      callback(null, mapCustomer(customer));
    } catch (err) {
      handleError(err, callback);
    }
  };

  getCustomer = async (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const customer = await this.getCustomerUC.execute(call.request.id);
      callback(null, mapCustomer(customer));
    } catch (err) {
      handleError(err, callback);
    }
  };

  listCustomers = async (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const req = call.request;
      const result = await this.listCustomersUC.execute({
        page: req.pagination?.page ?? 1,
        pageSize: req.pagination?.pageSize ?? 20,
        searchQuery: req.searchQuery ?? '',
      });
      const totalPages = Math.ceil(result.totalCount / (req.pagination?.pageSize ?? 20));
      callback(null, {
        customers: result.customers.map(mapCustomer),
        pagination: { totalCount: result.totalCount, page: req.pagination?.page ?? 1, pageSize: req.pagination?.pageSize ?? 20, totalPages },
      });
    } catch (err) {
      handleError(err, callback);
    }
  };

  updateCustomer = async (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const req = call.request;
      const customer = await this.updateCustomerUC.execute({
        id: req.id,
        firstName: req.firstName || undefined,
        lastName: req.lastName || undefined,
        email: req.email || undefined,
        phone: req.phone || undefined,
        addressLine1: req.addressLine1 || undefined,
        addressLine2: req.addressLine2 || undefined,
        city: req.city || undefined,
        postalCode: req.postalCode || undefined,
        country: req.country || undefined,
        companyName: req.companyName || undefined,
        vatNumber: req.vatNumber || undefined,
      });
      callback(null, mapCustomer(customer));
    } catch (err) {
      handleError(err, callback);
    }
  };

  deleteCustomer = async (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      await this.deleteCustomerUC.execute(call.request.id);
      callback(null, { success: true });
    } catch (err) {
      handleError(err, callback);
    }
  };

  addVehicle = async (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const req = call.request;
      const vehicle = await this.addVehicleUC.execute({
        customerId: req.customerId,
        make: req.make,
        model: req.model,
        year: req.year,
        vin: req.vin || null,
        licensePlate: req.licensePlate || null,
        mileageKm: req.mileageKm ?? 0,
        color: req.color || null,
        engineType: req.engineType || null,
      });
      callback(null, mapVehicle(vehicle));
    } catch (err) {
      handleError(err, callback);
    }
  };

  getVehicle = async (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const vehicle = await this.getVehicleUC.execute(call.request.id);
      callback(null, mapVehicle(vehicle));
    } catch (err) {
      handleError(err, callback);
    }
  };

  listVehiclesByCustomer = async (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const vehicles = await this.listVehiclesByCustomerUC.execute(call.request.customerId);
      callback(null, { vehicles: vehicles.map(mapVehicle) });
    } catch (err) {
      handleError(err, callback);
    }
  };

  updateVehicle = async (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>): Promise<void> => {
    try {
      const req = call.request;
      const vehicle = await this.updateVehicleUC.execute({
        id: req.id,
        make: req.make || undefined,
        model: req.model || undefined,
        year: req.year || undefined,
        vin: req.vin || undefined,
        licensePlate: req.licensePlate || undefined,
        mileageKm: req.mileageKm || undefined,
        color: req.color || undefined,
        engineType: req.engineType || undefined,
      });
      callback(null, mapVehicle(vehicle));
    } catch (err) {
      handleError(err, callback);
    }
  };
}
