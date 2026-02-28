using Dapr.Client;
using WorkOrderService.Domain;

namespace WorkOrderService.Events;

public class EventPublisher
{
    private const string PubSubName = "car-erp-pubsub";

    private readonly DaprClient _daprClient = null!;
    private readonly ILogger<EventPublisher> _logger = null!;

    protected EventPublisher() { }

    public EventPublisher(DaprClient daprClient, ILogger<EventPublisher> logger)
    {
        _daprClient = daprClient;
        _logger = logger;
    }

    public virtual async Task PublishWorkOrderCreatedAsync(WorkOrder workOrder, CancellationToken ct = default)
    {
        var evt = new WorkOrderCreatedEvent(
            WorkOrderId: workOrder.Id.ToString(),
            CustomerId: workOrder.CustomerId.ToString(),
            VehicleId: workOrder.VehicleId.ToString(),
            Description: workOrder.Description,
            AssignedMechanic: workOrder.AssignedMechanic,
            Status: workOrder.Status.ToString(),
            CreatedAt: workOrder.CreatedAt.ToString("O")
        );

        await PublishAsync("workorder.created", evt, ct);
        _logger.LogInformation("Published workorder.created for WorkOrderId={WorkOrderId}", workOrder.Id);
    }

    public virtual async Task PublishWorkOrderCompletedAsync(WorkOrder workOrder, CancellationToken ct = default)
    {
        var lineItems = workOrder.LineItems.Select(li => new LineItemEventData(
            LineItemId: li.Id.ToString(),
            PartId: li.PartId.ToString(),
            PartName: li.PartName,
            Quantity: li.Quantity,
            UnitPriceCents: li.UnitPriceCents,
            TotalPriceCents: li.TotalPriceCents,
            Currency: li.Currency
        )).ToList();

        var laborEntries = workOrder.LaborEntries.Select(le => new LaborEntryEventData(
            LaborEntryId: le.Id.ToString(),
            Description: le.Description,
            Hours: le.Hours,
            HourlyRateCents: le.HourlyRateCents,
            TotalCents: le.TotalCents,
            MechanicName: le.MechanicName,
            Currency: le.Currency
        )).ToList();

        var evt = new WorkOrderCompletedEvent(
            WorkOrderId: workOrder.Id.ToString(),
            CustomerId: workOrder.CustomerId.ToString(),
            VehicleId: workOrder.VehicleId.ToString(),
            Description: workOrder.Description,
            AssignedMechanic: workOrder.AssignedMechanic,
            ActualTotalCents: workOrder.ActualTotalCents,
            Currency: workOrder.Currency,
            CompletedAt: workOrder.CompletedAt?.ToString("O") ?? DateTime.UtcNow.ToString("O"),
            LineItems: lineItems,
            LaborEntries: laborEntries
        );

        await PublishAsync("workorder.completed", evt, ct);
        _logger.LogInformation("Published workorder.completed for WorkOrderId={WorkOrderId}", workOrder.Id);
    }

    public virtual async Task PublishWorkOrderCancelledAsync(WorkOrder workOrder, CancellationToken ct = default)
    {
        var evt = new WorkOrderCancelledEvent(
            WorkOrderId: workOrder.Id.ToString(),
            CustomerId: workOrder.CustomerId.ToString(),
            VehicleId: workOrder.VehicleId.ToString(),
            CancelledAt: workOrder.UpdatedAt.ToString("O")
        );

        await PublishAsync("workorder.cancelled", evt, ct);
        _logger.LogInformation("Published workorder.cancelled for WorkOrderId={WorkOrderId}", workOrder.Id);
    }

    public virtual async Task PublishPartsAddedAsync(WorkOrder workOrder, WorkOrderLineItem lineItem, CancellationToken ct = default)
    {
        var evt = new WorkOrderPartsAddedEvent(
            WorkOrderId: workOrder.Id.ToString(),
            PartId: lineItem.PartId.ToString(),
            PartName: lineItem.PartName,
            Quantity: lineItem.Quantity,
            LineItemId: lineItem.Id.ToString(),
            AddedAt: lineItem.CreatedAt.ToString("O")
        );

        await PublishAsync("workorder.parts-added", evt, ct);
        _logger.LogInformation(
            "Published workorder.parts-added for WorkOrderId={WorkOrderId}, PartId={PartId}",
            workOrder.Id, lineItem.PartId);
    }

    private async Task PublishAsync<T>(string topicName, T eventData, CancellationToken ct)
    {
        try
        {
            await _daprClient.PublishEventAsync(PubSubName, topicName, eventData, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish event to topic {Topic}", topicName);
            // Non-fatal: log and continue — the business operation already succeeded
        }
    }
}
