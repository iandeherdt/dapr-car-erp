using InventoryService.Domain;
using InventoryService.Domain.Repositories;
using InventoryService.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryService.Infrastructure.Repositories;

public class EfPartRepository : IPartRepository
{
    private readonly InventoryDbContext _db;

    public EfPartRepository(InventoryDbContext db)
    {
        _db = db;
    }

    public async Task<Part> CreateAsync(Part part, CancellationToken ct = default)
    {
        _db.Parts.Add(part);
        await _db.SaveChangesAsync(ct);
        return part;
    }

    public async Task<Part?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Parts.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);
    }

    public async Task<bool> ExistsBySkuAsync(string sku, CancellationToken ct = default)
    {
        return await _db.Parts.AnyAsync(p => p.Sku == sku, ct);
    }

    public async Task<(List<Part> Items, int TotalCount)> ListAsync(
        int page, int pageSize, string? categoryFilter, string? searchQuery, CancellationToken ct = default)
    {
        var query = _db.Parts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(categoryFilter))
            query = query.Where(p => p.Category == categoryFilter);

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var search = searchQuery.ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(search) || p.Sku.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<(List<Part> Items, int TotalCount)> ListLowStockAsync(
        int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.Parts.AsNoTracking()
            .Where(p => (p.QuantityInStock - p.QuantityReserved) <= p.ReorderLevel);

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.QuantityInStock - p.QuantityReserved)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<Part> UpdateAsync(Part part, CancellationToken ct = default)
    {
        _db.Entry(part).State = EntityState.Modified;
        await _db.SaveChangesAsync(ct);
        return part;
    }

    public async Task<List<Part>> GetByIdsForUpdateAsync(List<Guid> ids, CancellationToken ct = default)
    {
        return await _db.Parts
            .FromSqlRaw("SELECT * FROM parts WHERE id = ANY({0}) FOR UPDATE", ids.ToArray())
            .ToListAsync(ct);
    }

    public async Task<Dictionary<Guid, Part>> GetByIdsReadOnlyAsync(List<Guid> ids, CancellationToken ct = default)
    {
        return await _db.Parts
            .AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);
    }
}
