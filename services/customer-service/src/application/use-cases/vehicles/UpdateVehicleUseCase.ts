import { IVehicleRepository } from '../../../domain/repositories/IVehicleRepository.js';
import { UpdateVehicleInput, VehicleEntity } from '../../../domain/entities/Vehicle.js';
import { NotFoundError } from '../../../domain/errors.js';

export class UpdateVehicleUseCase {
  constructor(private readonly vehicleRepo: IVehicleRepository) {}

  async execute(input: UpdateVehicleInput): Promise<VehicleEntity> {
    const existing = await this.vehicleRepo.findById(input.id);
    if (!existing) throw new NotFoundError(`Vehicle ${input.id} not found`);
    const { id, ...data } = input;
    return this.vehicleRepo.update(id, data);
  }
}
