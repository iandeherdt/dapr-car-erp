using InventoryService.Domain;
using InventoryService.Domain.Repositories;
using InventoryService.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryService.Infrastructure.Repositories;

public class EfReservationRepository : IReservationRepository
{
    private readonly InventoryDbContext _db;

    public EfReservationRepository(InventoryDbContext db)
    {
        _db = db;
    }

    public async Task<Reservation> CreateAsync(Reservation reservation, CancellationToken ct = default)
    {
        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync(ct);
        return reservation;
    }

    public async Task<Reservation?> GetActiveByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Reservations
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id && r.Status == "active", ct);
    }

    public async Task<Reservation?> GetActiveByWorkOrderIdAsync(Guid workOrderId, CancellationToken ct = default)
    {
        return await _db.Reservations
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.WorkOrderId == workOrderId && r.Status == "active", ct);
    }

    public async Task UpdateAsync(Reservation reservation, CancellationToken ct = default)
    {
        await _db.SaveChangesAsync(ct);
    }
}
