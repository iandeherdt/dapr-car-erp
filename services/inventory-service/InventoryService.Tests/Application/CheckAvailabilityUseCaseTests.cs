using FluentAssertions;
using Moq;
using InventoryService.Application.UseCases;
using InventoryService.Domain;
using InventoryService.Domain.Repositories;

namespace InventoryService.Tests.Application;

public class CheckAvailabilityUseCaseTests
{
    private readonly Mock<IPartRepository> _repoMock = new();
    private readonly CheckAvailabilityUseCase _useCase;

    public CheckAvailabilityUseCaseTests()
    {
        _useCase = new CheckAvailabilityUseCase(_repoMock.Object);
    }

    [Fact]
    public async Task ExecuteAsync_AllPartsAvailable_ReturnsAllAvailableTrue()
    {
        var partId = Guid.NewGuid();
        var part = new Part { Id = partId, QuantityInStock = 50, QuantityReserved = 10 };

        _repoMock.Setup(r => r.GetByIdsReadOnlyAsync(It.IsAny<List<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, Part> { { partId, part } });

        var (results, allAvailable) = await _useCase.ExecuteAsync(
            new List<AvailabilityItem> { new(partId.ToString(), 20) },
            CancellationToken.None);

        allAvailable.Should().BeTrue();
        results.Should().HaveCount(1);
        results[0].IsAvailable.Should().BeTrue();
        results[0].Available.Should().Be(40); // 50 - 10
    }

    [Fact]
    public async Task ExecuteAsync_InsufficientStock_ReturnsNotAvailable()
    {
        var partId = Guid.NewGuid();
        var part = new Part { Id = partId, QuantityInStock = 5, QuantityReserved = 4 };

        _repoMock.Setup(r => r.GetByIdsReadOnlyAsync(It.IsAny<List<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, Part> { { partId, part } });

        var (results, allAvailable) = await _useCase.ExecuteAsync(
            new List<AvailabilityItem> { new(partId.ToString(), 5) },
            CancellationToken.None);

        allAvailable.Should().BeFalse();
        results[0].IsAvailable.Should().BeFalse();
    }

    [Fact]
    public async Task ExecuteAsync_PartNotFound_ReturnsNotAvailable()
    {
        var missingId = Guid.NewGuid();

        _repoMock.Setup(r => r.GetByIdsReadOnlyAsync(It.IsAny<List<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, Part>());

        var (results, allAvailable) = await _useCase.ExecuteAsync(
            new List<AvailabilityItem> { new(missingId.ToString(), 1) },
            CancellationToken.None);

        allAvailable.Should().BeFalse();
        results[0].IsAvailable.Should().BeFalse();
        results[0].Available.Should().Be(0);
    }
}
