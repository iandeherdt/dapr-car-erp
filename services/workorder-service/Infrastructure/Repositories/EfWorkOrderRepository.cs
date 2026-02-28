using Microsoft.EntityFrameworkCore;
using WorkOrderService.Domain;
using WorkOrderService.Domain.Repositories;
using WorkOrderService.Infrastructure;

namespace WorkOrderService.Infrastructure.Repositories;

public class EfWorkOrderRepository : IWorkOrderRepository
{
    private readonly WorkOrderDbContext _db;

    public EfWorkOrderRepository(WorkOrderDbContext db)
    {
        _db = db;
    }

    public async Task<WorkOrder> CreateAsync(WorkOrder workOrder, CancellationToken ct = default)
    {
        _db.WorkOrders.Add(workOrder);
        await _db.SaveChangesAsync(ct);
        return workOrder;
    }

    public async Task<WorkOrder?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.WorkOrders
            .Include(wo => wo.LineItems)
            .Include(wo => wo.LaborEntries)
            .FirstOrDefaultAsync(wo => wo.Id == id, ct);
    }

    public async Task<(List<WorkOrder> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        WorkOrderStatus? statusFilter,
        Guid? customerIdFilter,
        CancellationToken ct = default)
    {
        var query = _db.WorkOrders
            .Include(wo => wo.LineItems)
            .Include(wo => wo.LaborEntries)
            .AsNoTracking()
            .AsQueryable();

        if (statusFilter.HasValue)
            query = query.Where(wo => wo.Status == statusFilter.Value);

        if (customerIdFilter.HasValue)
            query = query.Where(wo => wo.CustomerId == customerIdFilter.Value);

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(wo => wo.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<WorkOrder> UpdateAsync(WorkOrder workOrder, CancellationToken ct = default)
    {
        workOrder.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return workOrder;
    }
}
