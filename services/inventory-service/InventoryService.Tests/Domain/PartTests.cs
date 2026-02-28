using FluentAssertions;
using InventoryService.Domain;

namespace InventoryService.Tests.Domain;

public class PartTests
{
    [Fact]
    public void AvailableQuantity_ReturnsInStockMinusReserved()
    {
        var part = new Part { QuantityInStock = 100, QuantityReserved = 30 };
        part.AvailableQuantity.Should().Be(70);
    }

    [Fact]
    public void AvailableQuantity_WhenNoReservations_ReturnsFullStock()
    {
        var part = new Part { QuantityInStock = 50, QuantityReserved = 0 };
        part.AvailableQuantity.Should().Be(50);
    }

    [Fact]
    public void IsLowStock_WhenAvailableAtOrBelowReorderLevel_ReturnsTrue()
    {
        var part = new Part { QuantityInStock = 5, QuantityReserved = 0, ReorderLevel = 5 };
        part.IsLowStock.Should().BeTrue();
    }

    [Fact]
    public void IsLowStock_WhenAvailableAboveReorderLevel_ReturnsFalse()
    {
        var part = new Part { QuantityInStock = 10, QuantityReserved = 0, ReorderLevel = 5 };
        part.IsLowStock.Should().BeFalse();
    }

    [Fact]
    public void IsLowStock_WhenReservationsReduceAvailabilityBelowReorderLevel_ReturnsTrue()
    {
        var part = new Part { QuantityInStock = 10, QuantityReserved = 8, ReorderLevel = 5 };
        // Available = 2, ReorderLevel = 5, so 2 <= 5 → IsLowStock = true
        part.IsLowStock.Should().BeTrue();
    }
}
