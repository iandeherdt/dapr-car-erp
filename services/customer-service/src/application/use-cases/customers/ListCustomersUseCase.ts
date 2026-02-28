import { ICustomerRepository, ListCustomersParams, ListCustomersResult } from '../../../domain/repositories/ICustomerRepository.js';

export class ListCustomersUseCase {
  constructor(private readonly customerRepo: ICustomerRepository) {}

  async execute(params: ListCustomersParams): Promise<ListCustomersResult> {
    const page = params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize > 0 ? params.pageSize : 20;
    return this.customerRepo.findMany({ page, pageSize, searchQuery: params.searchQuery });
  }
}
