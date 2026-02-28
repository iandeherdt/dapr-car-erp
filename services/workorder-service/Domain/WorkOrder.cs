namespace WorkOrderService.Domain;

public class WorkOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CustomerId { get; set; }
    public Guid VehicleId { get; set; }
    public string Description { get; set; } = string.Empty;
    public WorkOrderStatus Status { get; set; } = WorkOrderStatus.Draft;
    public string AssignedMechanic { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public long EstimatedTotalCents { get; set; }
    public long ActualTotalCents { get; set; }
    public string Currency { get; set; } = "EUR";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public List<WorkOrderLineItem> LineItems { get; set; } = new();
    public List<LaborEntry> LaborEntries { get; set; } = new();

    /// <summary>
    /// Factory method. Enforces all invariants at construction time.
    /// </summary>
    public static WorkOrder Create(
        Guid customerId,
        Guid vehicleId,
        string description,
        string assignedMechanic = "",
        string notes = "",
        string currency = "EUR")
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("description is required", nameof(description));

        var now = DateTime.UtcNow;
        return new WorkOrder
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            VehicleId = vehicleId,
            Description = description.Trim(),
            AssignedMechanic = assignedMechanic?.Trim() ?? string.Empty,
            Notes = notes?.Trim() ?? string.Empty,
            Status = WorkOrderStatus.Draft,
            Currency = currency,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    /// <summary>
    /// Recalculates EstimatedTotalCents as sum of all line items + labor entries.
    /// </summary>
    public void RecalculateEstimatedTotal()
    {
        long lineItemsTotal = LineItems.Sum(li => li.TotalPriceCents);
        long laborTotal = LaborEntries.Sum(le => le.TotalCents);
        EstimatedTotalCents = lineItemsTotal + laborTotal;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Recalculates ActualTotalCents (used when completing the work order).
    /// </summary>
    public void RecalculateActualTotal()
    {
        long lineItemsTotal = LineItems.Sum(li => li.TotalPriceCents);
        long laborTotal = LaborEntries.Sum(le => le.TotalCents);
        ActualTotalCents = lineItemsTotal + laborTotal;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Returns true if transitioning to <paramref name="newStatus"/> is a valid state machine transition.
    /// </summary>
    public bool CanTransitionTo(WorkOrderStatus newStatus)
    {
        return (Status, newStatus) switch
        {
            (WorkOrderStatus.Draft, WorkOrderStatus.Pending) => true,
            (WorkOrderStatus.Draft, WorkOrderStatus.Cancelled) => true,
            (WorkOrderStatus.Pending, WorkOrderStatus.InProgress) => true,
            (WorkOrderStatus.Pending, WorkOrderStatus.AwaitingParts) => true,
            (WorkOrderStatus.Pending, WorkOrderStatus.Cancelled) => true,
            (WorkOrderStatus.InProgress, WorkOrderStatus.Completed) => true,
            (WorkOrderStatus.InProgress, WorkOrderStatus.AwaitingParts) => true,
            (WorkOrderStatus.InProgress, WorkOrderStatus.Cancelled) => true,
            (WorkOrderStatus.AwaitingParts, WorkOrderStatus.InProgress) => true,
            (WorkOrderStatus.AwaitingParts, WorkOrderStatus.Cancelled) => true,
            (WorkOrderStatus.Completed, WorkOrderStatus.Invoiced) => true,
            _ => false,
        };
    }
}
