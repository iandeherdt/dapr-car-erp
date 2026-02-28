import { UpdateCustomerUseCase } from '../../../../application/use-cases/customers/UpdateCustomerUseCase.js';
import { ICustomerRepository } from '../../../../domain/repositories/ICustomerRepository.js';
import { IEventPublisher } from '../../../../domain/events/IEventPublisher.js';
import { NotFoundError } from '../../../../domain/errors.js';
import { CustomerEntity } from '../../../../domain/entities/Customer.js';

describe('UpdateCustomerUseCase', () => {
  let mockRepo: jest.Mocked<ICustomerRepository>;
  let mockPublisher: jest.Mocked<IEventPublisher>;
  let useCase: UpdateCustomerUseCase;

  const mockCustomer: CustomerEntity = {
    id: 'cust-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: null,
    addressLine1: '123 Main', addressLine2: null, city: 'Brussels', postalCode: '1000',
    country: 'Belgium', companyName: null, vatNumber: null,
    createdAt: new Date(), updatedAt: new Date(), vehicles: [],
  };

  beforeEach(() => {
    mockRepo = { create: jest.fn(), findById: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() };
    mockPublisher = { publish: jest.fn() };
    useCase = new UpdateCustomerUseCase(mockRepo, mockPublisher);
  });

  it('updates customer and publishes event', async () => {
    mockRepo.findById.mockResolvedValue(mockCustomer);
    mockRepo.update.mockResolvedValue({ ...mockCustomer, firstName: 'Jane' });
    mockPublisher.publish.mockResolvedValue(undefined);

    const result = await useCase.execute({ id: 'cust-1', firstName: 'Jane' });

    expect(mockRepo.update).toHaveBeenCalledWith('cust-1', { firstName: 'Jane' });
    expect(mockPublisher.publish).toHaveBeenCalledWith('customer.updated', expect.objectContaining({ customerId: 'cust-1' }));
    expect(result.firstName).toBe('Jane');
  });

  it('throws NotFoundError when customer does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ id: 'missing' })).rejects.toThrow(NotFoundError);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
