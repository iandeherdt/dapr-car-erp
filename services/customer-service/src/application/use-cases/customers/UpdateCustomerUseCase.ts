import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository.js';
import { IEventPublisher } from '../../../domain/events/IEventPublisher.js';
import { UpdateCustomerInput, CustomerEntity } from '../../../domain/entities/Customer.js';
import { NotFoundError } from '../../../domain/errors.js';

export class UpdateCustomerUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(input: UpdateCustomerInput): Promise<CustomerEntity> {
    const existing = await this.customerRepo.findById(input.id);
    if (!existing) throw new NotFoundError(`Customer ${input.id} not found`);
    const { id, ...data } = input;
    const customer = await this.customerRepo.update(id, data);
    await this.eventPublisher.publish('customer.updated', {
      customerId: customer.id,
      email: customer.email,
    });
    return customer;
  }
}
