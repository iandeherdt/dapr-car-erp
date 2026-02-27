namespace InventoryService.Domain;

public class Reservation
{
    public Guid Id { get; set; }
    public Guid WorkOrderId { get; set; }

    /// <summary>
    /// Allowed values: "active", "fulfilled", "released"
    /// </summary>
    public string Status { get; set; } = "active";

    public DateTime CreatedAt { get; set; }
    public DateTime? ReleasedAt { get; set; }

    public ICollection<ReservationItem> Items { get; set; } = new List<ReservationItem>();
}
