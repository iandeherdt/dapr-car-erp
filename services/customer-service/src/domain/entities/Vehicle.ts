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
