using FluentAssertions;
using Moq;
using InventoryService.Application.UseCases;
using InventoryService.Domain;
using InventoryService.Domain.Repositories;

namespace InventoryService.Tests.Application;

public class CreatePartUseCaseTests
{
    private readonly Mock<IPartRepository> _repoMock = new();
    private readonly CreatePartUseCase _useCase;

    public CreatePartUseCaseTests()
    {
        _useCase = new CreatePartUseCase(_repoMock.Object);
    }

    [Fact]
    public async Task ExecuteAsync_NewSku_CreatesPart()
    {
        var part = new Part { Id = Guid.NewGuid(), Sku = "PART-001", Name = "Oil Filter" };

        _repoMock.Setup(r => r.ExistsBySkuAsync("PART-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _repoMock.Setup(r => r.CreateAsync(part, It.IsAny<CancellationToken>()))
            .ReturnsAsync(part);

        var result = await _useCase.ExecuteAsync(part, CancellationToken.None);

        result.Should().Be(part);
        _repoMock.Verify(r => r.CreateAsync(part, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_DuplicateSku_ThrowsInvalidOperationException()
    {
        var part = new Part { Sku = "PART-001" };

        _repoMock.Setup(r => r.ExistsBySkuAsync("PART-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var act = () => _useCase.ExecuteAsync(part, CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*PART-001*");

        _repoMock.Verify(r => r.CreateAsync(It.IsAny<Part>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
