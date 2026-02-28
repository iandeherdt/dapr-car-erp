import { CustomerEntity, CreateCustomerInput, UpdateCustomerInput } from '../entities/Customer.js';

export interface ListCustomersParams {
  page: number;
  pageSize: number;
  searchQuery?: string;
}

export interface ListCustomersResult {
  customers: CustomerEntity[];
  totalCount: number;
}

export interface ICustomerRepository {
  create(data: CreateCustomerInput): Promise<CustomerEntity>;
  findById(id: string): Promise<CustomerEntity | null>;
  findMany(params: ListCustomersParams): Promise<ListCustomersResult>;
  update(id: string, data: Omit<UpdateCustomerInput, 'id'>): Promise<CustomerEntity>;
  delete(id: string): Promise<void>;
}
