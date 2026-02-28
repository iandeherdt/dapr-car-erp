import { GetCustomerUseCase } from '../../../../application/use-cases/customers/GetCustomerUseCase.js';
import { ICustomerRepository } from '../../../../domain/repositories/ICustomerRepository.js';
import { NotFoundError } from '../../../../domain/errors.js';
import { CustomerEntity } from '../../../../domain/entities/Customer.js';

describe('GetCustomerUseCase', () => {
  let mockRepo: jest.Mocked<ICustomerRepository>;
  let useCase: GetCustomerUseCase;

  const mockCustomer: CustomerEntity = {
    id: 'cust-1', firstName: 'John', lastName: 'Doe', email: null, phone: null,
    addressLine1: '123 Main', addressLine2: null, city: 'Brussels', postalCode: '1000',
    country: 'Belgium', companyName: null, vatNumber: null,
    createdAt: new Date(), updatedAt: new Date(), vehicles: [],
  };

  beforeEach(() => {
    mockRepo = { create: jest.fn(), findById: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() };
    useCase = new GetCustomerUseCase(mockRepo);
  });

  it('returns customer when found', async () => {
    mockRepo.findById.mockResolvedValue(mockCustomer);
    const result = await useCase.execute('cust-1');
    expect(result).toEqual(mockCustomer);
    expect(mockRepo.findById).toHaveBeenCalledWith('cust-1');
  });

  it('throws NotFoundError when customer does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing-id')).rejects.toThrow(NotFoundError);
    await expect(useCase.execute('missing-id')).rejects.toThrow('Customer missing-id not found');
  });
});
