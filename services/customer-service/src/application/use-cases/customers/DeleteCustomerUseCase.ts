import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository.js';
import { NotFoundError } from '../../../domain/errors.js';

export class DeleteCustomerUseCase {
  constructor(private readonly customerRepo: ICustomerRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.customerRepo.findById(id);
    if (!existing) throw new NotFoundError(`Customer ${id} not found`);
    await this.customerRepo.delete(id);
  }
}
