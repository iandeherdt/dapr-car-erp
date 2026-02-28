using WorkOrderService.Domain;
using WorkOrderService.Domain.Repositories;
using WorkOrderService.Infrastructure;

namespace WorkOrderService.Application.UseCases;

public class RemoveLineItemUseCase
{
    private readonly IWorkOrderRepository _repository;
    private readonly WorkOrderDbContext _db;

    public RemoveLineItemUseCase(IWorkOrderRepository repository, WorkOrderDbContext db)
    {
        _repository = repository;
        _db = db;
    }

    public async Task<WorkOrder> ExecuteAsync(Guid workOrderId, Guid lineItemId, CancellationToken ct = default)
    {
        var workOrder = await _repository.GetByIdAsync(workOrderId, ct);
        if (workOrder is null)
            throw new KeyNotFoundException($"WorkOrder {workOrderId} not found");

        if (workOrder.Status is WorkOrderStatus.Completed or WorkOrderStatus.Cancelled or WorkOrderStatus.Invoiced)
            throw new InvalidOperationException(
                $"Cannot remove line items from a WorkOrder in status {workOrder.Status}");

        var lineItem = workOrder.LineItems.FirstOrDefault(li => li.Id == lineItemId);
        if (lineItem is null)
            throw new KeyNotFoundException($"LineItem {lineItemId} not found on WorkOrder {workOrderId}");

        workOrder.LineItems.Remove(lineItem);
        _db.WorkOrderLineItems.Remove(lineItem);
        workOrder.RecalculateEstimatedTotal();
        await _db.SaveChangesAsync(ct);
        return workOrder;
    }
}
