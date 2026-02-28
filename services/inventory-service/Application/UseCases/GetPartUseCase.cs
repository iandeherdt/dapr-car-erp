using InventoryService.Domain;
using InventoryService.Domain.Repositories;

namespace InventoryService.Application.UseCases;

public class GetPartUseCase
{
    private readonly IPartRepository _repository;

    public GetPartUseCase(IPartRepository repository)
    {
        _repository = repository;
    }

    public async Task<Part> ExecuteAsync(Guid id, CancellationToken ct = default)
    {
        var part = await _repository.GetByIdAsync(id, ct);
        if (part is null)
            throw new KeyNotFoundException($"Part '{id}' not found.");
        return part;
    }
}
