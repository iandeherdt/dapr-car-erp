import type {
  Customer,
  Vehicle,
  ListCustomersResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  AddVehicleRequest,
  UpdateVehicleRequest,
  Pagination,
} from '../../clients/customer-client.js';

export interface ICustomerService {
  listCustomers(pagination: Pagination, searchQuery?: string, correlationId?: string): Promise<ListCustomersResponse>;
  createCustomer(data: CreateCustomerRequest, correlationId?: string): Promise<Customer>;
  getCustomer(id: string, correlationId?: string): Promise<Customer>;
  updateCustomer(data: UpdateCustomerRequest, correlationId?: string): Promise<Customer>;
  deleteCustomer(id: string, correlationId?: string): Promise<{ success: boolean }>;
  addVehicle(data: AddVehicleRequest, correlationId?: string): Promise<Vehicle>;
  getVehicle(id: string, correlationId?: string): Promise<Vehicle>;
  listVehiclesByCustomer(customerId: string, correlationId?: string): Promise<Vehicle[]>;
  updateVehicle(data: UpdateVehicleRequest, correlationId?: string): Promise<Vehicle>;
}
