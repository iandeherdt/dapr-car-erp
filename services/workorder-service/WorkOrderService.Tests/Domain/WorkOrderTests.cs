using FluentAssertions;
using WorkOrderService.Domain;

namespace WorkOrderService.Tests.Domain;

public class WorkOrderTests
{
    [Fact]
    public void CanTransitionTo_DraftToPending_ReturnsTrue()
    {
        var wo = new WorkOrder { Status = WorkOrderStatus.Draft };
        wo.CanTransitionTo(WorkOrderStatus.Pending).Should().BeTrue();
    }

    [Fact]
    public void CanTransitionTo_DraftToCompleted_ReturnsFalse()
    {
        var wo = new WorkOrder { Status = WorkOrderStatus.Draft };
        wo.CanTransitionTo(WorkOrderStatus.Completed).Should().BeFalse();
    }

    [Fact]
    public void CanTransitionTo_InProgressToCompleted_ReturnsTrue()
    {
        var wo = new WorkOrder { Status = WorkOrderStatus.InProgress };
        wo.CanTransitionTo(WorkOrderStatus.Completed).Should().BeTrue();
    }

    [Fact]
    public void CanTransitionTo_CompletedToInvoiced_ReturnsTrue()
    {
        var wo = new WorkOrder { Status = WorkOrderStatus.Completed };
        wo.CanTransitionTo(WorkOrderStatus.Invoiced).Should().BeTrue();
    }

    [Fact]
    public void CanTransitionTo_InvoicedToAny_ReturnsFalse()
    {
        var wo = new WorkOrder { Status = WorkOrderStatus.Invoiced };
        wo.CanTransitionTo(WorkOrderStatus.Draft).Should().BeFalse();
        wo.CanTransitionTo(WorkOrderStatus.Completed).Should().BeFalse();
    }

    [Fact]
    public void RecalculateEstimatedTotal_SumsLineItemsAndLabor()
    {
        var wo = new WorkOrder
        {
            LineItems = new List<WorkOrderLineItem>
            {
                new() { TotalPriceCents = 5000 },
                new() { TotalPriceCents = 3000 },
            },
            LaborEntries = new List<LaborEntry>
            {
                new() { TotalCents = 2000 },
            },
        };

        wo.RecalculateEstimatedTotal();

        wo.EstimatedTotalCents.Should().Be(10000);
    }

    [Fact]
    public void RecalculateActualTotal_SumsLineItemsAndLabor()
    {
        var wo = new WorkOrder
        {
            LineItems = new List<WorkOrderLineItem>
            {
                new() { TotalPriceCents = 10000 },
            },
            LaborEntries = new List<LaborEntry>
            {
                new() { TotalCents = 5000 },
            },
        };

        wo.RecalculateActualTotal();

        wo.ActualTotalCents.Should().Be(15000);
    }

    [Fact]
    public void RecalculateEstimatedTotal_EmptyCollections_ReturnsZero()
    {
        var wo = new WorkOrder();
        wo.RecalculateEstimatedTotal();
        wo.EstimatedTotalCents.Should().Be(0);
    }

    [Fact]
    public void Create_ValidInput_ReturnsWorkOrderWithDraftStatusAndTrimmedDescription()
    {
        var customerId = Guid.NewGuid();
        var vehicleId = Guid.NewGuid();

        var wo = WorkOrder.Create(customerId, vehicleId, "  Oil change  ", "Alice");

        wo.CustomerId.Should().Be(customerId);
        wo.VehicleId.Should().Be(vehicleId);
        wo.Description.Should().Be("Oil change");
        wo.AssignedMechanic.Should().Be("Alice");
        wo.Status.Should().Be(WorkOrderStatus.Draft);
        wo.Id.Should().NotBeEmpty();
    }

    [Fact]
    public void Create_EmptyDescription_ThrowsArgumentException()
    {
        var act = () => WorkOrder.Create(Guid.NewGuid(), Guid.NewGuid(), "   ");
        act.Should().Throw<ArgumentException>().WithParameterName("description");
    }
}
