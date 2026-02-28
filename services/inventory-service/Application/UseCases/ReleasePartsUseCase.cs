using InventoryService.Domain;
using InventoryService.Domain.Repositories;

namespace InventoryService.Application.UseCases;

public class ReleasePartsUseCase
{
    private readonly IPartRepository _partRepository;
    private readonly IReservationRepository _reservationRepository;

    public ReleasePartsUseCase(IPartRepository partRepository, IReservationRepository reservationRepository)
    {
        _partRepository = partRepository;
        _reservationRepository = reservationRepository;
    }

    public async Task<bool> ExecuteAsync(
        Guid? reservationId,
        Guid? workOrderId,
        CancellationToken ct = default)
    {
        Reservation? reservation = null;

        if (reservationId.HasValue)
            reservation = await _reservationRepository.GetActiveByIdAsync(reservationId.Value, ct);
        else if (workOrderId.HasValue)
            reservation = await _reservationRepository.GetActiveByWorkOrderIdAsync(workOrderId.Value, ct);

        if (reservation is null)
            return true; // idempotent

        var partIds = reservation.Items.Select(i => i.PartId).ToList();
        var partsDict = await _partRepository.GetByIdsReadOnlyAsync(partIds, ct);

        var now = DateTime.UtcNow;
        foreach (var item in reservation.Items)
        {
            if (partsDict.TryGetValue(item.PartId, out var part))
            {
                part.QuantityReserved = Math.Max(0, part.QuantityReserved - item.Quantity);
                part.UpdatedAt = now;
                await _partRepository.UpdateAsync(part, ct);
            }
        }

        reservation.Status = "released";
        reservation.ReleasedAt = now;
        await _reservationRepository.UpdateAsync(reservation, ct);
        return true;
    }
}
