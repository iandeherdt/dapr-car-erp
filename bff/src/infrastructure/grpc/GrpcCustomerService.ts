import type { ICustomerService } from '../../application/services/ICustomerService.js';
import * as client from '../../clients/customer-client.js';

export class GrpcCustomerService implements ICustomerService {
  listCustomers(
    pagination: client.Pagination,
    searchQuery?: string,
    correlationId?: string,
  ): Promise<client.ListCustomersResponse> {
    return client.listCustomers(pagination, searchQuery, correlationId);
  }

  createCustomer(data: client.CreateCustomerRequest, correlationId?: string): Promise<client.Customer> {
    return client.createCustomer(data, correlationId);
  }

  getCustomer(id: string, correlationId?: string): Promise<client.Customer> {
    return client.getCustomer(id, correlationId);
  }

  updateCustomer(data: client.UpdateCustomerRequest, correlationId?: string): Promise<client.Customer> {
    return client.updateCustomer(data, correlationId);
  }

  deleteCustomer(id: string, correlationId?: string): Promise<{ success: boolean }> {
    return client.deleteCustomer(id, correlationId);
  }

  addVehicle(data: client.AddVehicleRequest, correlationId?: string): Promise<client.Vehicle> {
    return client.addVehicle(data, correlationId);
  }

  getVehicle(id: string, correlationId?: string): Promise<client.Vehicle> {
    return client.getVehicle(id, correlationId);
  }

  listVehiclesByCustomer(customerId: string, correlationId?: string): Promise<client.Vehicle[]> {
    return client.listVehiclesByCustomer(customerId, correlationId);
  }

  updateVehicle(data: client.UpdateVehicleRequest, correlationId?: string): Promise<client.Vehicle> {
    return client.updateVehicle(data, correlationId);
  }
}
