using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkOrderService.Domain;
using WorkOrderService.Infrastructure;

namespace WorkOrderService.Events;

/// <summary>
/// Static handler methods wired to Dapr topic subscriptions in Program.cs.
/// Each method is an ASP.NET Core minimal API endpoint.
/// </summary>
public static class EventSubscriber
{
    /// <summary>
    /// Handles inventory.parts-reserved — updates line item prices with confirmed reservation data.
    /// </summary>
    public static async Task<IResult> HandleInventoryPartsReserved(
        [FromBody] InventoryPartsReservedEvent evt,
        WorkOrderDbContext db,
        ILogger<EventPublisher> logger,
        CancellationToken ct)
    {
        logger.LogInformation(
            "Received inventory.parts-reserved for WorkOrderId={WorkOrderId}, LineItemId={LineItemId}",
            evt.WorkOrderId, evt.LineItemId);

        if (!Guid.TryParse(evt.WorkOrderId, out var workOrderId))
        {
            logger.LogWarning("Invalid WorkOrderId in inventory.parts-reserved: {WorkOrderId}", evt.WorkOrderId);
            return Results.Ok(); // Ack to avoid redelivery of a permanently invalid message
        }

        if (!Guid.TryParse(evt.LineItemId, out var lineItemId))
        {
            logger.LogWarning("Invalid LineItemId in inventory.parts-reserved: {LineItemId}", evt.LineItemId);
            return Results.Ok();
        }

        var workOrder = await db.WorkOrders
            .Include(wo => wo.LineItems)
            .Include(wo => wo.LaborEntries)
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId, ct);

        if (workOrder is null)
        {
            logger.LogWarning("WorkOrder {WorkOrderId} not found for inventory.parts-reserved", workOrderId);
            return Results.Ok();
        }

        var lineItem = workOrder.LineItems.FirstOrDefault(li => li.Id == lineItemId);
        if (lineItem is null)
        {
            logger.LogWarning("LineItem {LineItemId} not found on WorkOrder {WorkOrderId}", lineItemId, workOrderId);
            return Results.Ok();
        }

        // Update line item with confirmed reservation pricing
        lineItem.PartName = evt.PartName;
        lineItem.UnitPriceCents = evt.UnitPriceCents;
        lineItem.TotalPriceCents = evt.TotalPriceCents;
        lineItem.Currency = evt.Currency;

        workOrder.RecalculateEstimatedTotal();

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Updated LineItem {LineItemId} on WorkOrder {WorkOrderId} with reserved prices",
            lineItemId, workOrderId);

        return Results.Ok();
    }

    /// <summary>
    /// Handles inventory.reservation-failed — sets the work order to AWAITING_PARTS status.
    /// </summary>
    public static async Task<IResult> HandleInventoryReservationFailed(
        [FromBody] InventoryReservationFailedEvent evt,
        WorkOrderDbContext db,
        ILogger<EventPublisher> logger,
        CancellationToken ct)
    {
        logger.LogInformation(
            "Received inventory.reservation-failed for WorkOrderId={WorkOrderId}, Reason={Reason}",
            evt.WorkOrderId, evt.Reason);

        if (!Guid.TryParse(evt.WorkOrderId, out var workOrderId))
        {
            logger.LogWarning("Invalid WorkOrderId in inventory.reservation-failed: {WorkOrderId}", evt.WorkOrderId);
            return Results.Ok();
        }

        var workOrder = await db.WorkOrders
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId, ct);

        if (workOrder is null)
        {
            logger.LogWarning("WorkOrder {WorkOrderId} not found for inventory.reservation-failed", workOrderId);
            return Results.Ok();
        }

        // Only update if still in an active state where awaiting parts makes sense
        if (workOrder.Status is WorkOrderStatus.Pending
            or WorkOrderStatus.InProgress
            or WorkOrderStatus.Draft)
        {
            workOrder.Status = WorkOrderStatus.AwaitingParts;
            workOrder.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(evt.Reason))
            {
                workOrder.Notes = string.IsNullOrWhiteSpace(workOrder.Notes)
                    ? $"Parts reservation failed: {evt.Reason}"
                    : $"{workOrder.Notes}\nParts reservation failed: {evt.Reason}";
            }

            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Set WorkOrder {WorkOrderId} to AWAITING_PARTS due to reservation failure",
                workOrderId);
        }
        else
        {
            logger.LogInformation(
                "WorkOrder {WorkOrderId} is in status {Status}, skipping AWAITING_PARTS transition",
                workOrderId, workOrder.Status);
        }

        return Results.Ok();
    }

    /// <summary>
    /// Handles invoice.created — sets the work order to INVOICED status.
    /// </summary>
    public static async Task<IResult> HandleInvoiceCreated(
        [FromBody] InvoiceCreatedEvent evt,
        WorkOrderDbContext db,
        ILogger<EventPublisher> logger,
        CancellationToken ct)
    {
        logger.LogInformation(
            "Received invoice.created for WorkOrderId={WorkOrderId}, InvoiceId={InvoiceId}",
            evt.WorkOrderId, evt.InvoiceId);

        if (!Guid.TryParse(evt.WorkOrderId, out var workOrderId))
        {
            logger.LogWarning("Invalid WorkOrderId in invoice.created: {WorkOrderId}", evt.WorkOrderId);
            return Results.Ok();
        }

        var workOrder = await db.WorkOrders
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId, ct);

        if (workOrder is null)
        {
            logger.LogWarning("WorkOrder {WorkOrderId} not found for invoice.created", workOrderId);
            return Results.Ok();
        }

        if (workOrder.Status == WorkOrderStatus.Completed)
        {
            workOrder.Status = WorkOrderStatus.Invoiced;
            workOrder.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Set WorkOrder {WorkOrderId} to INVOICED after invoice {InvoiceId} created",
                workOrderId, evt.InvoiceId);
        }
        else
        {
            logger.LogWarning(
                "WorkOrder {WorkOrderId} is in status {Status}, expected COMPLETED for invoicing",
                workOrderId, workOrder.Status);
        }

        return Results.Ok();
    }
}
