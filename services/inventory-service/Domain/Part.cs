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

    /// <summary>
    /// Factory method. Enforces that SKU and Name are present at construction time.
    /// </summary>
    public static Part Create(
        string sku,
        string name,
        string description = "",
        string category = "",
        string manufacturer = "",
        long unitPriceCents = 0,
        string unitPriceCurrency = "EUR",
        long costPriceCents = 0,
        string costPriceCurrency = "EUR",
        int quantityInStock = 0,
        int reorderLevel = 5,
        string location = "",
        string[]? compatibleMakes = null)
    {
        if (string.IsNullOrWhiteSpace(sku))
            throw new ArgumentException("SKU is required", nameof(sku));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required", nameof(name));

        var now = DateTime.UtcNow;
        return new Part
        {
            Id = Guid.NewGuid(),
            Sku = sku.Trim(),
            Name = name.Trim(),
            Description = description.Trim(),
            Category = category.Trim(),
            Manufacturer = manufacturer.Trim(),
            UnitPriceCents = unitPriceCents,
            UnitPriceCurrency = unitPriceCurrency,
            CostPriceCents = costPriceCents,
            CostPriceCurrency = costPriceCurrency,
            QuantityInStock = quantityInStock,
            QuantityReserved = 0,
            ReorderLevel = reorderLevel > 0 ? reorderLevel : 5,
            Location = location.Trim(),
            CompatibleMakes = compatibleMakes ?? [],
            CreatedAt = now,
            UpdatedAt = now,
        };
    }
}
