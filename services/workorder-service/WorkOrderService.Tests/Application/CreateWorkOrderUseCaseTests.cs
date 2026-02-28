using FluentAssertions;
using Moq;
using WorkOrderService.Application.UseCases;
using WorkOrderService.Domain;
using WorkOrderService.Domain.Repositories;
using WorkOrderService.Events;

namespace WorkOrderService.Tests.Application;

public class CreateWorkOrderUseCaseTests
{
    private readonly Mock<IWorkOrderRepository> _repoMock = new();
    private readonly Mock<EventPublisher> _publisherMock = new();
    private readonly CreateWorkOrderUseCase _useCase;

    public CreateWorkOrderUseCaseTests()
    {
        _useCase = new CreateWorkOrderUseCase(_repoMock.Object, _publisherMock.Object);
    }

    [Fact]
    public async Task ExecuteAsync_ValidInput_CreatesWorkOrderAndPublishesEvent()
    {
        var customerId = Guid.NewGuid();
        var vehicleId = Guid.NewGuid();

        _repoMock.Setup(r => r.CreateAsync(It.IsAny<WorkOrder>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((WorkOrder wo, CancellationToken _) => wo);

        _publisherMock.Setup(p => p.PublishWorkOrderCreatedAsync(It.IsAny<WorkOrder>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var result = await _useCase.ExecuteAsync(customerId, vehicleId, "Oil change", "John", "", CancellationToken.None);

        result.Should().NotBeNull();
        result.CustomerId.Should().Be(customerId);
        result.VehicleId.Should().Be(vehicleId);
        result.Description.Should().Be("Oil change");
        result.Status.Should().Be(WorkOrderStatus.Draft);
        _repoMock.Verify(r => r.CreateAsync(It.IsAny<WorkOrder>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_EmptyDescription_ThrowsArgumentException()
    {
        var act = () => _useCase.ExecuteAsync(Guid.NewGuid(), Guid.NewGuid(), "", "John", "", CancellationToken.None);
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*description*");
    }
}
