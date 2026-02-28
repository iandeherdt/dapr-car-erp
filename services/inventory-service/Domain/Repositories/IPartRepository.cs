using InventoryService.Domain;

namespace InventoryService.Domain.Repositories;

public interface IPartRepository
{
    Task<Part> CreateAsync(Part part, CancellationToken ct = default);
    Task<Part?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<bool> ExistsBySkuAsync(string sku, CancellationToken ct = default);
    Task<(List<Part> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        string? categoryFilter,
        string? searchQuery,
        CancellationToken ct = default);
    Task<(List<Part> Items, int TotalCount)> ListLowStockAsync(int page, int pageSize, CancellationToken ct = default);
    Task<Part> UpdateAsync(Part part, CancellationToken ct = default);
    Task<List<Part>> GetByIdsForUpdateAsync(List<Guid> ids, CancellationToken ct = default);
    Task<Dictionary<Guid, Part>> GetByIdsReadOnlyAsync(List<Guid> ids, CancellationToken ct = default);
}
