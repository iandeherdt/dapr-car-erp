using WorkOrderService.Domain;
using WorkOrderService.Domain.Repositories;

namespace WorkOrderService.Application.UseCases;

public class ListWorkOrdersUseCase
{
    private readonly IWorkOrderRepository _repository;

    public ListWorkOrdersUseCase(IWorkOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task<(List<WorkOrder> Items, int TotalCount)> ExecuteAsync(
        int page,
        int pageSize,
        WorkOrderStatus? statusFilter,
        Guid? customerIdFilter,
        CancellationToken ct = default)
    {
        page = page > 0 ? page : 1;
        pageSize = pageSize > 0 ? pageSize : 20;
        return await _repository.ListAsync(page, pageSize, statusFilter, customerIdFilter, ct);
    }
}
