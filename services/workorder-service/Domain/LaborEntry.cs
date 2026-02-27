namespace WorkOrderService.Domain;

public class LaborEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkOrderId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Hours { get; set; }
    public long HourlyRateCents { get; set; }
    public long TotalCents { get; set; }
    public string MechanicName { get; set; } = string.Empty;
    public string Currency { get; set; } = "EUR";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public WorkOrder WorkOrder { get; set; } = null!;
}
