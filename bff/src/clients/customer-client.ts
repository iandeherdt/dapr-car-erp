import { createServiceClient } from './grpc-client.js';

const PROTO_PATH = 'customer/v1/customer.proto';
const PACKAGE_NAME = 'customer.v1';
const SERVICE_NAME = 'CustomerService';
const DAPR_APP_ID = 'customer-service';

function getClient() {
  return createServiceClient(PROTO_PATH, PACKAGE_NAME, SERVICE_NAME, DAPR_APP_ID);
}

// ---- Type definitions mirroring the proto messages ----

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface PaginationResult {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Vehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  mileageKm: number;
  color: string;
  engineType: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  companyName: string;
  vatNumber: string;
  vehicles: Vehicle[];
  createdAt: string;
  updatedAt: string;
}

export interface ListCustomersResponse {
  customers: Customer[];
  pagination: PaginationResult;
}

export interface ListVehiclesResponse {
  vehicles: Vehicle[];
}

// ---- Request shapes ----

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  vatNumber?: string;
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {
  id: string;
}

export interface AddVehicleRequest {
  customerId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate?: string;
  mileageKm?: number;
  color?: string;
  engineType?: string;
}

export interface UpdateVehicleRequest extends AddVehicleRequest {
  id: string;
}

// ---- Client methods ----

export async function createCustomer(data: CreateCustomerRequest, correlationId?: string): Promise<Customer> {
  return getClient().call<CreateCustomerRequest, Customer>('createCustomer', data, 10_000, correlationId);
}

export async function getCustomer(id: string, correlationId?: string): Promise<Customer> {
  return getClient().call<{ id: string }, Customer>('getCustomer', { id }, 10_000, correlationId);
}

export async function listCustomers(
  pagination: Pagination,
  searchQuery?: string,
  correlationId?: string,
): Promise<ListCustomersResponse> {
  return getClient().call<object, ListCustomersResponse>('listCustomers', {
    pagination,
    searchQuery: searchQuery ?? '',
  }, 10_000, correlationId);
}

export async function updateCustomer(data: UpdateCustomerRequest, correlationId?: string): Promise<Customer> {
  return getClient().call<UpdateCustomerRequest, Customer>('updateCustomer', data, 10_000, correlationId);
}

export async function deleteCustomer(id: string, correlationId?: string): Promise<{ success: boolean }> {
  return getClient().call<{ id: string }, { success: boolean }>('deleteCustomer', { id }, 10_000, correlationId);
}

export async function addVehicle(data: AddVehicleRequest, correlationId?: string): Promise<Vehicle> {
  return getClient().call<AddVehicleRequest, Vehicle>('addVehicle', data, 10_000, correlationId);
}

export async function getVehicle(id: string, correlationId?: string): Promise<Vehicle> {
  return getClient().call<{ id: string }, Vehicle>('getVehicle', { id }, 10_000, correlationId);
}

export async function listVehiclesByCustomer(customerId: string, correlationId?: string): Promise<Vehicle[]> {
  const response = await getClient().call<{ customerId: string }, ListVehiclesResponse>(
    'listVehiclesByCustomer',
    { customerId },
    10_000,
    correlationId,
  );
  return response.vehicles;
}

export async function updateVehicle(data: UpdateVehicleRequest, correlationId?: string): Promise<Vehicle> {
  return getClient().call<UpdateVehicleRequest, Vehicle>('updateVehicle', data, 10_000, correlationId);
}
