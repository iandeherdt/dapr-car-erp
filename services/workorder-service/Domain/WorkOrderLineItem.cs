namespace WorkOrderService.Domain;

public class WorkOrderLineItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkOrderId { get; set; }
    public Guid PartId { get; set; }
    public string PartName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public long UnitPriceCents { get; set; }
    public long TotalPriceCents { get; set; }
    public string Currency { get; set; } = "EUR";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public WorkOrder WorkOrder { get; set; } = null!;
}
