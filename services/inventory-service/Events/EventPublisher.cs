using Dapr.Client;

namespace InventoryService.Events;

public class EventPublisher
{
    private const string PubSubName = "car-erp-pubsub";

    private readonly DaprClient _dapr;
    private readonly ILogger<EventPublisher> _logger;

    public EventPublisher(DaprClient dapr, ILogger<EventPublisher> logger)
    {
        _dapr = dapr;
        _logger = logger;
    }

    public async Task PublishPartsReservedAsync(PartsReservedEvent payload, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Publishing inventory.parts-reserved for reservation {ReservationId} / work order {WorkOrderId}",
            payload.ReservationId, payload.WorkOrderId);

        await _dapr.PublishEventAsync(PubSubName, "inventory.parts-reserved", payload, ct);
    }

    public async Task PublishReservationFailedAsync(ReservationFailedEvent payload, CancellationToken ct = default)
    {
        _logger.LogWarning(
            "Publishing inventory.reservation-failed for work order {WorkOrderId}: {Reason}",
            payload.WorkOrderId, payload.Reason);

        await _dapr.PublishEventAsync(PubSubName, "inventory.reservation-failed", payload, ct);
    }

    public async Task PublishLowStockAsync(LowStockEvent payload, CancellationToken ct = default)
    {
        _logger.LogWarning(
            "Publishing inventory.low-stock for part {PartId} / SKU {Sku} (stock={Stock}, reserved={Reserved}, reorder={Reorder})",
            payload.PartId, payload.Sku, payload.QuantityInStock, payload.QuantityReserved, payload.ReorderLevel);

        await _dapr.PublishEventAsync(PubSubName, "inventory.low-stock", payload, ct);
    }
}
