import { VehicleEntity } from './Vehicle.js';
import { ValidationError } from '../errors.js';

export interface CustomerEntity {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  country: string;
  companyName: string | null;
  vatNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  vehicles: VehicleEntity[];
}

export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postalCode: string;
  country?: string;
  companyName?: string | null;
  vatNumber?: string | null;
}

export interface UpdateCustomerInput {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  vatNumber?: string;
}

export class Customer {
  /**
   * Validates that all required fields are present and non-empty.
   * Throws ValidationError on the first failing rule.
   */
  static validate(input: CreateCustomerInput): void {
    if (!input.firstName?.trim()) throw new ValidationError('firstName is required');
    if (!input.lastName?.trim()) throw new ValidationError('lastName is required');
    if (!input.addressLine1?.trim()) throw new ValidationError('addressLine1 is required');
    if (!input.city?.trim()) throw new ValidationError('city is required');
    if (!input.postalCode?.trim()) throw new ValidationError('postalCode is required');
    if (input.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
        throw new ValidationError('email must be a valid email address');
      }
    }
  }
}
