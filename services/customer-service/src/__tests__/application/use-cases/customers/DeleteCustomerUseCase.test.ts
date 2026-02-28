import { DeleteCustomerUseCase } from '../../../../application/use-cases/customers/DeleteCustomerUseCase.js';
import { ICustomerRepository } from '../../../../domain/repositories/ICustomerRepository.js';
import { NotFoundError } from '../../../../domain/errors.js';
import { CustomerEntity } from '../../../../domain/entities/Customer.js';

describe('DeleteCustomerUseCase', () => {
  let mockRepo: jest.Mocked<ICustomerRepository>;
  let useCase: DeleteCustomerUseCase;

  const mockCustomer: CustomerEntity = {
    id: 'cust-1', firstName: 'John', lastName: 'Doe', email: null, phone: null,
    addressLine1: '123 Main', addressLine2: null, city: 'Brussels', postalCode: '1000',
    country: 'Belgium', companyName: null, vatNumber: null,
    createdAt: new Date(), updatedAt: new Date(), vehicles: [],
  };

  beforeEach(() => {
    mockRepo = { create: jest.fn(), findById: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() };
    useCase = new DeleteCustomerUseCase(mockRepo);
  });

  it('deletes customer when found', async () => {
    mockRepo.findById.mockResolvedValue(mockCustomer);
    mockRepo.delete.mockResolvedValue(undefined);
    await useCase.execute('cust-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('cust-1');
  });

  it('throws NotFoundError when customer does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundError);
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });
});
