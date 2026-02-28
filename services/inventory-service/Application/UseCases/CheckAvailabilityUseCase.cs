using InventoryService.Domain;
using InventoryService.Domain.Repositories;

namespace InventoryService.Application.UseCases;

public record AvailabilityItem(string PartId, int Requested);
public record AvailabilityResult(string PartId, int Requested, int Available, bool IsAvailable);

public class CheckAvailabilityUseCase
{
    private readonly IPartRepository _repository;

    public CheckAvailabilityUseCase(IPartRepository repository)
    {
        _repository = repository;
    }

    public async Task<(List<AvailabilityResult> Results, bool AllAvailable)> ExecuteAsync(
        List<AvailabilityItem> items,
        CancellationToken ct = default)
    {
        var partIds = items
            .Where(i => Guid.TryParse(i.PartId, out _))
            .Select(i => Guid.Parse(i.PartId))
            .ToList();

        var parts = await _repository.GetByIdsReadOnlyAsync(partIds, ct);

        var results = new List<AvailabilityResult>();
        var allAvailable = true;

        foreach (var item in items)
        {
            if (!Guid.TryParse(item.PartId, out var partId) || !parts.TryGetValue(partId, out var part))
            {
                results.Add(new AvailabilityResult(item.PartId, item.Requested, 0, false));
                allAvailable = false;
                continue;
            }

            var available = part.AvailableQuantity;
            var isAvailable = available >= item.Requested;
            if (!isAvailable) allAvailable = false;
            results.Add(new AvailabilityResult(item.PartId, item.Requested, available, isAvailable));
        }

        return (results, allAvailable);
    }
}
