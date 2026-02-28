import { VehicleEntity, CreateVehicleInput, UpdateVehicleInput } from '../entities/Vehicle.js';

export interface IVehicleRepository {
  create(data: CreateVehicleInput): Promise<VehicleEntity>;
  findById(id: string): Promise<VehicleEntity | null>;
  findByCustomerId(customerId: string): Promise<VehicleEntity[]>;
  update(id: string, data: Omit<UpdateVehicleInput, 'id'>): Promise<VehicleEntity>;
}
