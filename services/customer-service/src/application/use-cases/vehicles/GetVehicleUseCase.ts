import { IVehicleRepository } from '../../../domain/repositories/IVehicleRepository.js';
import { VehicleEntity } from '../../../domain/entities/Vehicle.js';
import { NotFoundError } from '../../../domain/errors.js';

export class GetVehicleUseCase {
  constructor(private readonly vehicleRepo: IVehicleRepository) {}

  async execute(id: string): Promise<VehicleEntity> {
    const vehicle = await this.vehicleRepo.findById(id);
    if (!vehicle) throw new NotFoundError(`Vehicle ${id} not found`);
    return vehicle;
  }
}
