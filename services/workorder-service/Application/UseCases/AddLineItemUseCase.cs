using WorkOrderService.Domain;
using WorkOrderService.Domain.Repositories;
using WorkOrderService.Events;

namespace WorkOrderService.Application.UseCases;

public class AddLineItemUseCase
{
    private readonly IWorkOrderRepository _repository;
    private readonly EventPublisher _eventPublisher;

    public AddLineItemUseCase(IWorkOrderRepository repository, EventPublisher eventPublisher)
    {
        _repository = repository;
        _eventPublisher = eventPublisher;
    }

    public async Task<WorkOrder> ExecuteAsync(Guid workOrderId, Guid partId, int quantity, CancellationToken ct = default)
    {
        if (quantity <= 0)
            throw new ArgumentException("quantity must be greater than 0", nameof(quantity));

        var workOrder = await _repository.GetByIdAsync(workOrderId, ct);
        if (workOrder is null)
            throw new KeyNotFoundException($"WorkOrder {workOrderId} not found");

        if (workOrder.Status is WorkOrderStatus.Completed or WorkOrderStatus.Cancelled or WorkOrderStatus.Invoiced)
            throw new InvalidOperationException(
                $"Cannot add line items to a WorkOrder in status {workOrder.Status}");

        var lineItem = new WorkOrderLineItem
        {
            Id = Guid.NewGuid(),
            WorkOrderId = workOrderId,
            PartId = partId,
            PartName = $"Part {partId}",
            Quantity = quantity,
            UnitPriceCents = 0,
            TotalPriceCents = 0,
            Currency = workOrder.Currency,
            CreatedAt = DateTime.UtcNow,
        };

        workOrder.LineItems.Add(lineItem);
        workOrder.RecalculateEstimatedTotal();
        await _repository.UpdateAsync(workOrder, ct);
        await _eventPublisher.PublishPartsAddedAsync(workOrder, lineItem, ct);
        return workOrder;
    }
}
