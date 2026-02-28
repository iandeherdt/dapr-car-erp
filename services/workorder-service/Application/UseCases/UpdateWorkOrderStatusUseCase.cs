using WorkOrderService.Domain;
using WorkOrderService.Domain.Repositories;
using WorkOrderService.Events;

namespace WorkOrderService.Application.UseCases;

public class UpdateWorkOrderStatusUseCase
{
    private readonly IWorkOrderRepository _repository;
    private readonly EventPublisher _eventPublisher;

    public UpdateWorkOrderStatusUseCase(IWorkOrderRepository repository, EventPublisher eventPublisher)
    {
        _repository = repository;
        _eventPublisher = eventPublisher;
    }

    public async Task<WorkOrder> ExecuteAsync(Guid id, WorkOrderStatus newStatus, CancellationToken ct = default)
    {
        var workOrder = await _repository.GetByIdAsync(id, ct);
        if (workOrder is null)
            throw new KeyNotFoundException($"WorkOrder {id} not found");

        if (!workOrder.CanTransitionTo(newStatus))
            throw new InvalidOperationException(
                $"Cannot transition WorkOrder from {workOrder.Status} to {newStatus}");

        var previousStatus = workOrder.Status;
        workOrder.Status = newStatus;
        workOrder.UpdatedAt = DateTime.UtcNow;

        if (newStatus == WorkOrderStatus.Completed)
        {
            workOrder.CompletedAt = DateTime.UtcNow;
            workOrder.RecalculateActualTotal();
        }

        await _repository.UpdateAsync(workOrder, ct);

        if (newStatus == WorkOrderStatus.Completed)
            await _eventPublisher.PublishWorkOrderCompletedAsync(workOrder, ct);
        else if (newStatus == WorkOrderStatus.Cancelled)
            await _eventPublisher.PublishWorkOrderCancelledAsync(workOrder, ct);

        return workOrder;
    }
}
