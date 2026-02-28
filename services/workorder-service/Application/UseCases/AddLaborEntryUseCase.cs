using WorkOrderService.Domain;
using WorkOrderService.Domain.Repositories;

namespace WorkOrderService.Application.UseCases;

public class AddLaborEntryUseCase
{
    private readonly IWorkOrderRepository _repository;

    public AddLaborEntryUseCase(IWorkOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task<WorkOrder> ExecuteAsync(
        Guid workOrderId,
        string description,
        decimal hours,
        long hourlyRateCents,
        string mechanicName,
        string currency,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("description is required", nameof(description));
        if (hours <= 0)
            throw new ArgumentException("hours must be greater than 0", nameof(hours));
        if (string.IsNullOrWhiteSpace(mechanicName))
            throw new ArgumentException("mechanic_name is required", nameof(mechanicName));

        var workOrder = await _repository.GetByIdAsync(workOrderId, ct);
        if (workOrder is null)
            throw new KeyNotFoundException($"WorkOrder {workOrderId} not found");

        if (workOrder.Status is WorkOrderStatus.Completed or WorkOrderStatus.Cancelled or WorkOrderStatus.Invoiced)
            throw new InvalidOperationException(
                $"Cannot add labor entries to a WorkOrder in status {workOrder.Status}");

        var totalCents = (long)(hours * hourlyRateCents);
        var laborEntry = new LaborEntry
        {
            Id = Guid.NewGuid(),
            WorkOrderId = workOrderId,
            Description = description.Trim(),
            Hours = hours,
            HourlyRateCents = hourlyRateCents,
            TotalCents = totalCents,
            MechanicName = mechanicName.Trim(),
            Currency = !string.IsNullOrWhiteSpace(currency) ? currency : workOrder.Currency,
            CreatedAt = DateTime.UtcNow,
        };

        workOrder.LaborEntries.Add(laborEntry);
        workOrder.RecalculateEstimatedTotal();
        await _repository.UpdateAsync(workOrder, ct);
        return workOrder;
    }
}
