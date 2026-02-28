import { ListCustomersUseCase } from '../../../../application/use-cases/customers/ListCustomersUseCase.js';
import { ICustomerRepository } from '../../../../domain/repositories/ICustomerRepository.js';

describe('ListCustomersUseCase', () => {
  let mockRepo: jest.Mocked<ICustomerRepository>;
  let useCase: ListCustomersUseCase;

  beforeEach(() => {
    mockRepo = { create: jest.fn(), findById: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() };
    useCase = new ListCustomersUseCase(mockRepo);
  });

  it('delegates to repository with correct params', async () => {
    mockRepo.findMany.mockResolvedValue({ customers: [], totalCount: 0 });
    await useCase.execute({ page: 2, pageSize: 10, searchQuery: 'John' });
    expect(mockRepo.findMany).toHaveBeenCalledWith({ page: 2, pageSize: 10, searchQuery: 'John' });
  });

  it('defaults to page 1, pageSize 20 when invalid values passed', async () => {
    mockRepo.findMany.mockResolvedValue({ customers: [], totalCount: 0 });
    await useCase.execute({ page: 0, pageSize: 0 });
    expect(mockRepo.findMany).toHaveBeenCalledWith({ page: 1, pageSize: 20, searchQuery: undefined });
  });
});
