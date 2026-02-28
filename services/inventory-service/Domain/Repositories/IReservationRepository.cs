using InventoryService.Domain;

namespace InventoryService.Domain.Repositories;

public interface IReservationRepository
{
    Task<Reservation> CreateAsync(Reservation reservation, CancellationToken ct = default);
    Task<Reservation?> GetActiveByIdAsync(Guid id, CancellationToken ct = default);
    Task<Reservation?> GetActiveByWorkOrderIdAsync(Guid workOrderId, CancellationToken ct = default);
    Task UpdateAsync(Reservation reservation, CancellationToken ct = default);
}
