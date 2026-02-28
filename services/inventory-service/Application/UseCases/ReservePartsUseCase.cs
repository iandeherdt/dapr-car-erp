using InventoryService.Domain;
using InventoryService.Domain.Repositories;

namespace InventoryService.Application.UseCases;

public record ReserveItem(string PartId, int Quantity);
public record ReservedItemResult(string PartId, int Quantity, long UnitPriceCents);

public class ReservePartsUseCase
{
    private readonly IPartRepository _partRepository;
    private readonly IReservationRepository _reservationRepository;

    public ReservePartsUseCase(IPartRepository partRepository, IReservationRepository reservationRepository)
    {
        _partRepository = partRepository;
        _reservationRepository = reservationRepository;
    }

    public async Task<(bool Success, string? ErrorMessage, Reservation? Reservation, List<ReservedItemResult> Items)> ExecuteAsync(
        Guid workOrderId,
        List<ReserveItem> items,
        CancellationToken ct = default)
    {
        var partIds = items.Select(i => Guid.Parse(i.PartId)).ToList();
        var parts = await _partRepository.GetByIdsForUpdateAsync(partIds, ct);
        var partsDict = parts.ToDictionary(p => p.Id);

        var unavailable = new List<string>();
        foreach (var item in items)
        {
            var partId = Guid.Parse(item.PartId);
            if (!partsDict.TryGetValue(partId, out var part))
            {
                unavailable.Add($"Part '{item.PartId}' not found.");
                continue;
            }
            if (part.AvailableQuantity < item.Quantity)
                unavailable.Add($"Part '{part.Sku}' has only {part.AvailableQuantity} units available (requested {item.Quantity}).");
        }

        if (unavailable.Count > 0)
            return (false, string.Join(" | ", unavailable), null, new List<ReservedItemResult>());

        var now = DateTime.UtcNow;
        var reservation = new Reservation
        {
            Id = Guid.NewGuid(),
            WorkOrderId = workOrderId,
            Status = "active",
            CreatedAt = now,
        };

        var reservedItems = new List<ReservedItemResult>();

        foreach (var item in items)
        {
            var partId = Guid.Parse(item.PartId);
            var part = partsDict[partId];

            reservation.Items.Add(new ReservationItem
            {
                Id = Guid.NewGuid(),
                ReservationId = reservation.Id,
                PartId = partId,
                Quantity = item.Quantity,
                UnitPriceCents = part.UnitPriceCents,
            });

            part.QuantityReserved += item.Quantity;
            part.UpdatedAt = now;
            await _partRepository.UpdateAsync(part, ct);

            reservedItems.Add(new ReservedItemResult(item.PartId, item.Quantity, part.UnitPriceCents));
        }

        await _reservationRepository.CreateAsync(reservation, ct);
        return (true, null, reservation, reservedItems);
    }
}
