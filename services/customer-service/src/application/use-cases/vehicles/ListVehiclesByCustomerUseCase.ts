import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository.js';
import { IVehicleRepository } from '../../../domain/repositories/IVehicleRepository.js';
import { VehicleEntity } from '../../../domain/entities/Vehicle.js';
import { NotFoundError } from '../../../domain/errors.js';

export class ListVehiclesByCustomerUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly vehicleRepo: IVehicleRepository,
  ) {}

  async execute(customerId: string): Promise<VehicleEntity[]> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) throw new NotFoundError(`Customer ${customerId} not found`);
    return this.vehicleRepo.findByCustomerId(customerId);
  }
}
