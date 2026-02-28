import { ValidationError } from '../errors.js';

export interface VehicleEntity {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  licensePlate: string | null;
  mileageKm: number;
  color: string | null;
  engineType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVehicleInput {
  customerId: string;
  make: string;
  model: string;
  year: number;
  vin?: string | null;
  licensePlate?: string | null;
  mileageKm?: number;
  color?: string | null;
  engineType?: string | null;
}

export interface UpdateVehicleInput {
  id: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  licensePlate?: string;
  mileageKm?: number;
  color?: string;
  engineType?: string;
}

export class Vehicle {
  private static readonly MIN_YEAR = 1886; // first automobile

  /**
   * Validates that make, model, and year are present and within realistic bounds.
   * Throws ValidationError on the first failing rule.
   */
  static validate(input: CreateVehicleInput): void {
    if (!input.make?.trim()) throw new ValidationError('make is required');
    if (!input.model?.trim()) throw new ValidationError('model is required');
    const maxYear = new Date().getFullYear() + 1;
    if (!input.year || input.year < Vehicle.MIN_YEAR || input.year > maxYear) {
      throw new ValidationError(`year must be between ${Vehicle.MIN_YEAR} and ${maxYear}`);
    }
  }
}
