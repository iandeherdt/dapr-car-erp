import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository.js';
import { CustomerEntity } from '../../../domain/entities/Customer.js';
import { NotFoundError } from '../../../domain/errors.js';

export class GetCustomerUseCase {
  constructor(private readonly customerRepo: ICustomerRepository) {}

  async execute(id: string): Promise<CustomerEntity> {
    const customer = await this.customerRepo.findById(id);
    if (!customer) throw new NotFoundError(`Customer ${id} not found`);
    return customer;
  }
}
