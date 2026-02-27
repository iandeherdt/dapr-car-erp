using System.Text.Json.Serialization;

namespace InventoryService.Events;

// ── Inbound event payloads ────────────────────────────────────────────────────

public class WorkOrderPartsAddedEvent
{
    [JsonPropertyName("work_order_id")]
    public string WorkOrderId { get; set; } = string.Empty;

    [JsonPropertyName("part_id")]
    public string PartId { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }
}

public class WorkOrderCompletedEvent
{
    [JsonPropertyName("work_order_id")]
    public string WorkOrderId { get; set; } = string.Empty;
}

public class WorkOrderCancelledEvent
{
    [JsonPropertyName("work_order_id")]
    public string WorkOrderId { get; set; } = string.Empty;
}

// ── Outbound event payloads ───────────────────────────────────────────────────

public class PartsReservedEvent
{
    [JsonPropertyName("reservation_id")]
    public string ReservationId { get; set; } = string.Empty;

    [JsonPropertyName("work_order_id")]
    public string WorkOrderId { get; set; } = string.Empty;

    [JsonPropertyName("items")]
    public List<ReservedItemPayload> Items { get; set; } = [];
}

public class ReservedItemPayload
{
    [JsonPropertyName("part_id")]
    public string PartId { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("unit_price_cents")]
    public long UnitPriceCents { get; set; }
}

public class ReservationFailedEvent
{
    [JsonPropertyName("work_order_id")]
    public string WorkOrderId { get; set; } = string.Empty;

    [JsonPropertyName("part_id")]
    public string PartId { get; set; } = string.Empty;

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}

public class LowStockEvent
{
    [JsonPropertyName("part_id")]
    public string PartId { get; set; } = string.Empty;

    [JsonPropertyName("sku")]
    public string Sku { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("quantity_in_stock")]
    public int QuantityInStock { get; set; }

    [JsonPropertyName("quantity_reserved")]
    public int QuantityReserved { get; set; }

    [JsonPropertyName("reorder_level")]
    public int ReorderLevel { get; set; }
}
