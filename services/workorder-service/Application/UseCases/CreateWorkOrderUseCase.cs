using WorkOrderService.Domain;
using WorkOrderService.Domain.Repositories;
using WorkOrderService.Events;

namespace WorkOrderService.Application.UseCases;

public class CreateWorkOrderUseCase
{
    private readonly IWorkOrderRepository _repository;
    private readonly EventPublisher _eventPublisher;

    public CreateWorkOrderUseCase(IWorkOrderRepository repository, EventPublisher eventPublisher)
    {
        _repository = repository;
        _eventPublisher = eventPublisher;
    }

    public async Task<WorkOrder> ExecuteAsync(
        Guid customerId,
        Guid vehicleId,
        string description,
        string assignedMechanic,
        string notes,
        CancellationToken ct = default)
    {
        var workOrder = WorkOrder.Create(customerId, vehicleId, description, assignedMechanic, notes);

        await _repository.CreateAsync(workOrder, ct);
        await _eventPublisher.PublishWorkOrderCreatedAsync(workOrder, ct);
        return workOrder;
    }
}
