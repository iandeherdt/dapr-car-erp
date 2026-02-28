using InventoryService.Domain;
using InventoryService.Domain.Repositories;

namespace InventoryService.Application.UseCases;

public class CreatePartUseCase
{
    private readonly IPartRepository _repository;

    public CreatePartUseCase(IPartRepository repository)
    {
        _repository = repository;
    }

    public async Task<Part> ExecuteAsync(Part partData, CancellationToken ct = default)
    {
        var exists = await _repository.ExistsBySkuAsync(partData.Sku, ct);
        if (exists)
            throw new InvalidOperationException($"A part with SKU '{partData.Sku}' already exists.");

        return await _repository.CreateAsync(partData, ct);
    }
}
