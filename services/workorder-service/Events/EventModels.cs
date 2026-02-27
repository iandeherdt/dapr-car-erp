using System.Text.Json.Serialization;

namespace WorkOrderService.Events;

// ─── Published Events ─────────────────────────────────────────────────────────

public record WorkOrderCreatedEvent(
    [property: JsonPropertyName("work_order_id")] string WorkOrderId,
    [property: JsonPropertyName("customer_id")] string CustomerId,
    [property: JsonPropertyName("vehicle_id")] string VehicleId,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("assigned_mechanic")] string AssignedMechanic,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("created_at")] string CreatedAt
);

public record WorkOrderCompletedEvent(
    [property: JsonPropertyName("work_order_id")] string WorkOrderId,
    [property: JsonPropertyName("customer_id")] string CustomerId,
    [property: JsonPropertyName("vehicle_id")] string VehicleId,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("assigned_mechanic")] string AssignedMechanic,
    [property: JsonPropertyName("actual_total_cents")] long ActualTotalCents,
    [property: JsonPropertyName("currency")] string Currency,
    [property: JsonPropertyName("completed_at")] string CompletedAt,
    [property: JsonPropertyName("line_items")] List<LineItemEventData> LineItems,
    [property: JsonPropertyName("labor_entries")] List<LaborEntryEventData> LaborEntries
);

public record WorkOrderCancelledEvent(
    [property: JsonPropertyName("work_order_id")] string WorkOrderId,
    [property: JsonPropertyName("customer_id")] string CustomerId,
    [property: JsonPropertyName("vehicle_id")] string VehicleId,
    [property: JsonPropertyName("cancelled_at")] string CancelledAt
);

public record WorkOrderPartsAddedEvent(
    [property: JsonPropertyName("work_order_id")] string WorkOrderId,
    [property: JsonPropertyName("part_id")] string PartId,
    [property: JsonPropertyName("part_name")] string PartName,
    [property: JsonPropertyName("quantity")] int Quantity,
    [property: JsonPropertyName("line_item_id")] string LineItemId,
    [property: JsonPropertyName("added_at")] string AddedAt
);

public record LineItemEventData(
    [property: JsonPropertyName("line_item_id")] string LineItemId,
    [property: JsonPropertyName("part_id")] string PartId,
    [property: JsonPropertyName("part_name")] string PartName,
    [property: JsonPropertyName("quantity")] int Quantity,
    [property: JsonPropertyName("unit_price_cents")] long UnitPriceCents,
    [property: JsonPropertyName("total_price_cents")] long TotalPriceCents,
    [property: JsonPropertyName("currency")] string Currency
);

public record LaborEntryEventData(
    [property: JsonPropertyName("labor_entry_id")] string LaborEntryId,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("hours")] decimal Hours,
    [property: JsonPropertyName("hourly_rate_cents")] long HourlyRateCents,
    [property: JsonPropertyName("total_cents")] long TotalCents,
    [property: JsonPropertyName("mechanic_name")] string MechanicName,
    [property: JsonPropertyName("currency")] string Currency
);

// ─── Subscribed Events ────────────────────────────────────────────────────────

public record InventoryPartsReservedEvent(
    [property: JsonPropertyName("reservation_id")] string ReservationId,
    [property: JsonPropertyName("work_order_id")] string WorkOrderId,
    [property: JsonPropertyName("line_item_id")] string LineItemId,
    [property: JsonPropertyName("part_id")] string PartId,
    [property: JsonPropertyName("part_name")] string PartName,
    [property: JsonPropertyName("quantity")] int Quantity,
    [property: JsonPropertyName("unit_price_cents")] long UnitPriceCents,
    [property: JsonPropertyName("total_price_cents")] long TotalPriceCents,
    [property: JsonPropertyName("currency")] string Currency
);

public record InventoryReservationFailedEvent(
    [property: JsonPropertyName("work_order_id")] string WorkOrderId,
    [property: JsonPropertyName("line_item_id")] string? LineItemId,
    [property: JsonPropertyName("part_id")] string PartId,
    [property: JsonPropertyName("reason")] string Reason
);

public record InvoiceCreatedEvent(
    [property: JsonPropertyName("invoice_id")] string InvoiceId,
    [property: JsonPropertyName("work_order_id")] string WorkOrderId,
    [property: JsonPropertyName("customer_id")] string CustomerId,
    [property: JsonPropertyName("total_cents")] long TotalCents,
    [property: JsonPropertyName("currency")] string Currency,
    [property: JsonPropertyName("created_at")] string CreatedAt
);
