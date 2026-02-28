using FluentAssertions;
using Moq;
using WorkOrderService.Application.UseCases;
using WorkOrderService.Domain;
using WorkOrderService.Domain.Repositories;
using WorkOrderService.Events;

namespace WorkOrderService.Tests.Application;

public class AddLineItemUseCaseTests
{
    private readonly Mock<IWorkOrderRepository> _repoMock = new();
    private readonly Mock<EventPublisher> _publisherMock = new();
    private readonly AddLineItemUseCase _useCase;

    public AddLineItemUseCaseTests()
    {
        _useCase = new AddLineItemUseCase(_repoMock.Object, _publisherMock.Object);
    }

    [Fact]
    public async Task ExecuteAsync_ValidInput_AddsLineItemAndPublishesEvent()
    {
        var workOrderId = Guid.NewGuid();
        var partId = Guid.NewGuid();
        var workOrder = new WorkOrder
        {
            Id = workOrderId,
            Status = WorkOrderStatus.Draft,
            Currency = "EUR",
            LineItems = new List<WorkOrderLineItem>(),
            LaborEntries = new List<LaborEntry>(),
        };

        _repoMock.Setup(r => r.GetByIdAsync(workOrderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workOrder);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<WorkOrder>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((WorkOrder wo, CancellationToken _) => wo);
        _publisherMock.Setup(p => p.PublishPartsAddedAsync(It.IsAny<WorkOrder>(), It.IsAny<WorkOrderLineItem>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var result = await _useCase.ExecuteAsync(workOrderId, partId, 2, CancellationToken.None);

        result.LineItems.Should().HaveCount(1);
        result.LineItems[0].PartId.Should().Be(partId);
        result.LineItems[0].Quantity.Should().Be(2);
    }

    [Fact]
    public async Task ExecuteAsync_ZeroQuantity_ThrowsArgumentException()
    {
        var act = () => _useCase.ExecuteAsync(Guid.NewGuid(), Guid.NewGuid(), 0, CancellationToken.None);
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*quantity*");
    }

    [Fact]
    public async Task ExecuteAsync_CompletedWorkOrder_ThrowsInvalidOperationException()
    {
        var workOrderId = Guid.NewGuid();
        var workOrder = new WorkOrder { Id = workOrderId, Status = WorkOrderStatus.Completed };

        _repoMock.Setup(r => r.GetByIdAsync(workOrderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workOrder);

        var act = () => _useCase.ExecuteAsync(workOrderId, Guid.NewGuid(), 1, CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
