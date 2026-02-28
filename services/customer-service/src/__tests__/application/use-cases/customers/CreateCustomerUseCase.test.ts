import { CreateCustomerUseCase } from '../../../../application/use-cases/customers/CreateCustomerUseCase.js';
import { ICustomerRepository } from '../../../../domain/repositories/ICustomerRepository.js';
import { IEventPublisher } from '../../../../domain/events/IEventPublisher.js';
import { CustomerEntity } from '../../../../domain/entities/Customer.js';

describe('CreateCustomerUseCase', () => {
  let mockRepo: jest.Mocked<ICustomerRepository>;
  let mockPublisher: jest.Mocked<IEventPublisher>;
  let useCase: CreateCustomerUseCase;

  const mockCustomer: CustomerEntity = {
    id: 'cust-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: null,
    addressLine1: '123 Main St',
    addressLine2: null,
    city: 'Brussels',
    postalCode: '1000',
    country: 'Belgium',
    companyName: null,
    vatNumber: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    vehicles: [],
  };

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockPublisher = { publish: jest.fn() };
    useCase = new CreateCustomerUseCase(mockRepo, mockPublisher);
  });

  it('creates a customer and publishes event', async () => {
    mockRepo.create.mockResolvedValue(mockCustomer);
    mockPublisher.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      city: 'Brussels',
      postalCode: '1000',
    });

    expect(mockRepo.create).toHaveBeenCalledTimes(1);
    expect(mockPublisher.publish).toHaveBeenCalledWith('customer.created', {
      customerId: 'cust-1',
      email: 'john@example.com',
    });
    expect(result).toEqual(mockCustomer);
  });

  it('throws ValidationError when firstName is missing', async () => {
    await expect(
      useCase.execute({ firstName: '', lastName: 'Doe', addressLine1: '123 Main St', city: 'Brussels', postalCode: '1000' })
    ).rejects.toThrow('firstName is required');
    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(mockPublisher.publish).not.toHaveBeenCalled();
  });
});
