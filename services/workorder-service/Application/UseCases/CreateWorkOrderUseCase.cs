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
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("description is required", nameof(description));

        var workOrder = new WorkOrder
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            VehicleId = vehicleId,
            Description = description.Trim(),
            AssignedMechanic = assignedMechanic?.Trim() ?? string.Empty,
            Notes = notes?.Trim() ?? string.Empty,
            Status = WorkOrderStatus.Draft,
            Currency = "EUR",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await _repository.CreateAsync(workOrder, ct);
        await _eventPublisher.PublishWorkOrderCreatedAsync(workOrder, ct);
        return workOrder;
    }
}
