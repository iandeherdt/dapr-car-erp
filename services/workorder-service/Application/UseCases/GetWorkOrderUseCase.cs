using WorkOrderService.Domain;
using WorkOrderService.Domain.Repositories;

namespace WorkOrderService.Application.UseCases;

public class GetWorkOrderUseCase
{
    private readonly IWorkOrderRepository _repository;

    public GetWorkOrderUseCase(IWorkOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task<WorkOrder> ExecuteAsync(Guid id, CancellationToken ct = default)
    {
        var workOrder = await _repository.GetByIdAsync(id, ct);
        if (workOrder is null)
            throw new KeyNotFoundException($"WorkOrder {id} not found");
        return workOrder;
    }
}
