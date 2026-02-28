using InventoryService.Domain;
using InventoryService.Domain.Repositories;

namespace InventoryService.Application.UseCases;

public class UpdatePartUseCase
{
    private readonly IPartRepository _repository;

    public UpdatePartUseCase(IPartRepository repository)
    {
        _repository = repository;
    }

    public async Task<Part> ExecuteAsync(Guid id, Action<Part> applyUpdates, CancellationToken ct = default)
    {
        var part = await _repository.GetByIdAsync(id, ct);
        if (part is null)
            throw new KeyNotFoundException($"Part '{id}' not found.");

        applyUpdates(part);
        part.UpdatedAt = DateTime.UtcNow;
        return await _repository.UpdateAsync(part, ct);
    }
}
