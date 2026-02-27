namespace InventoryService.Domain;

public class ReservationItem
{
    public Guid Id { get; set; }
    public Guid ReservationId { get; set; }
    public Guid PartId { get; set; }
    public int Quantity { get; set; }
    public long UnitPriceCents { get; set; }

    public Reservation Reservation { get; set; } = null!;
    public Part Part { get; set; } = null!;
}
