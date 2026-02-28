using FluentAssertions;
using Moq;
using WorkOrderService.Application.UseCases;
using WorkOrderService.Domain;
using WorkOrderService.Domain.Repositories;
using WorkOrderService.Events;

namespace WorkOrderService.Tests.Application;

public class UpdateWorkOrderStatusUseCaseTests
{
    private readonly Mock<IWorkOrderRepository> _repoMock = new();
    private readonly Mock<EventPublisher> _publisherMock = new();
    private readonly UpdateWorkOrderStatusUseCase _useCase;

    public UpdateWorkOrderStatusUseCaseTests()
    {
        _useCase = new UpdateWorkOrderStatusUseCase(_repoMock.Object, _publisherMock.Object);
    }

    [Fact]
    public async Task ExecuteAsync_ValidTransition_UpdatesStatus()
    {
        var workOrderId = Guid.NewGuid();
        var workOrder = new WorkOrder { Id = workOrderId, Status = WorkOrderStatus.Draft };

        _repoMock.Setup(r => r.GetByIdAsync(workOrderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workOrder);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<WorkOrder>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((WorkOrder wo, CancellationToken _) => wo);

        var result = await _useCase.ExecuteAsync(workOrderId, WorkOrderStatus.Pending, CancellationToken.None);

        result.Status.Should().Be(WorkOrderStatus.Pending);
    }

    [Fact]
    public async Task ExecuteAsync_InvalidTransition_ThrowsInvalidOperationException()
    {
        var workOrderId = Guid.NewGuid();
        var workOrder = new WorkOrder { Id = workOrderId, Status = WorkOrderStatus.Draft };

        _repoMock.Setup(r => r.GetByIdAsync(workOrderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workOrder);

        var act = () => _useCase.ExecuteAsync(workOrderId, WorkOrderStatus.Completed, CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Cannot transition*");
    }

    [Fact]
    public async Task ExecuteAsync_WorkOrderNotFound_ThrowsKeyNotFoundException()
    {
        _repoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((WorkOrder?)null);

        var act = () => _useCase.ExecuteAsync(Guid.NewGuid(), WorkOrderStatus.Pending, CancellationToken.None);
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task ExecuteAsync_TransitionToCompleted_SetsCompletedAt()
    {
        var workOrderId = Guid.NewGuid();
        var workOrder = new WorkOrder { Id = workOrderId, Status = WorkOrderStatus.InProgress };

        _repoMock.Setup(r => r.GetByIdAsync(workOrderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(workOrder);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<WorkOrder>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((WorkOrder wo, CancellationToken _) => wo);
        _publisherMock.Setup(p => p.PublishWorkOrderCompletedAsync(It.IsAny<WorkOrder>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var result = await _useCase.ExecuteAsync(workOrderId, WorkOrderStatus.Completed, CancellationToken.None);

        result.CompletedAt.Should().NotBeNull();
        result.Status.Should().Be(WorkOrderStatus.Completed);
    }
}
