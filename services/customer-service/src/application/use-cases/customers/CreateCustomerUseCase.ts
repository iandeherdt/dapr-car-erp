import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository.js';
import { IEventPublisher } from '../../../domain/events/IEventPublisher.js';
import { CreateCustomerInput, CustomerEntity, validateCreateCustomer } from '../../../domain/entities/Customer.js';

export class CreateCustomerUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(input: CreateCustomerInput): Promise<CustomerEntity> {
    validateCreateCustomer(input);
    const customer = await this.customerRepo.create(input);
    await this.eventPublisher.publish('customer.created', {
      customerId: customer.id,
      email: customer.email,
    });
    return customer;
  }
}
