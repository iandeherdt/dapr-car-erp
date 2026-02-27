namespace InventoryService.Domain;

public class Part
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
    public long UnitPriceCents { get; set; }
    public string UnitPriceCurrency { get; set; } = "EUR";
    public long CostPriceCents { get; set; }
    public string CostPriceCurrency { get; set; } = "EUR";
    public int QuantityInStock { get; set; }
    public int QuantityReserved { get; set; }
    public int ReorderLevel { get; set; } = 5;
    public string Location { get; set; } = string.Empty;
    public string[] CompatibleMakes { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ReservationItem> ReservationItems { get; set; } = new List<ReservationItem>();

    /// <summary>
    /// Returns how many units are freely available (not reserved).
    /// </summary>
    public int AvailableQuantity => QuantityInStock - QuantityReserved;

    /// <summary>
    /// Returns true when the part is at or below its reorder threshold.
    /// </summary>
    public bool IsLowStock => AvailableQuantity <= ReorderLevel;
}
