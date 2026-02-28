using WorkOrderService.Domain;

namespace WorkOrderService.Domain.Repositories;

public interface IWorkOrderRepository
{
    Task<WorkOrder> CreateAsync(WorkOrder workOrder, CancellationToken ct = default);
    Task<WorkOrder?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<(List<WorkOrder> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        WorkOrderStatus? statusFilter,
        Guid? customerIdFilter,
        CancellationToken ct = default);
    Task<WorkOrder> UpdateAsync(WorkOrder workOrder, CancellationToken ct = default);
}
