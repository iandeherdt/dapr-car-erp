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

    [Fact]
    public void Create_ValidInput_ReturnsPartWithCorrectValues()
    {
        var part = Part.Create(sku: "OIL-001", name: "  Oil Filter  ", quantityInStock: 10, reorderLevel: 3);

        part.Sku.Should().Be("OIL-001");
        part.Name.Should().Be("Oil Filter");   // trimmed
        part.QuantityInStock.Should().Be(10);
        part.QuantityReserved.Should().Be(0);
        part.ReorderLevel.Should().Be(3);
        part.Id.Should().NotBeEmpty();
    }

    [Fact]
    public void Create_EmptySku_ThrowsArgumentException()
    {
        var act = () => Part.Create(sku: "  ", name: "Oil Filter");
        act.Should().Throw<ArgumentException>().WithParameterName("sku");
    }

    [Fact]
    public void Create_EmptyName_ThrowsArgumentException()
    {
        var act = () => Part.Create(sku: "OIL-001", name: "");
        act.Should().Throw<ArgumentException>().WithParameterName("name");
    }
}
