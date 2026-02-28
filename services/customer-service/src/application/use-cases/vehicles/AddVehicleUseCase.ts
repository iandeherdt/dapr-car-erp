import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository.js';
import { IVehicleRepository } from '../../../domain/repositories/IVehicleRepository.js';
import { CreateVehicleInput, VehicleEntity, Vehicle } from '../../../domain/entities/Vehicle.js';
import { NotFoundError } from '../../../domain/errors.js';

export class AddVehicleUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly vehicleRepo: IVehicleRepository,
  ) {}

  async execute(input: CreateVehicleInput): Promise<VehicleEntity> {
    Vehicle.validate(input);
    const customer = await this.customerRepo.findById(input.customerId);
    if (!customer) throw new NotFoundError(`Customer ${input.customerId} not found`);
    return this.vehicleRepo.create(input);
  }
}
