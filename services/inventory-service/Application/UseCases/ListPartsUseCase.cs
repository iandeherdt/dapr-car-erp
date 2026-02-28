using InventoryService.Domain;
using InventoryService.Domain.Repositories;

namespace InventoryService.Application.UseCases;

public class ListPartsUseCase
{
    private readonly IPartRepository _repository;

    public ListPartsUseCase(IPartRepository repository)
    {
        _repository = repository;
    }

    public async Task<(List<Part> Items, int TotalCount)> ExecuteAsync(
        int page,
        int pageSize,
        string? categoryFilter,
        string? searchQuery,
        CancellationToken ct = default)
    {
        page = page > 0 ? page : 1;
        pageSize = pageSize > 0 ? pageSize : 20;
        return await _repository.ListAsync(page, pageSize, categoryFilter, searchQuery, ct);
    }
}
