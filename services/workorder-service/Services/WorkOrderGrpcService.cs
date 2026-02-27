using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Workorder.V1;
using WorkOrderService.Domain;
using WorkOrderService.Events;
using WorkOrderService.Infrastructure;
using Common.V1;

namespace WorkOrderService.Services;

public class WorkOrderGrpcService : Workorder.V1.WorkOrderService.WorkOrderServiceBase
{
    private readonly WorkOrderDbContext _db;
    private readonly EventPublisher _eventPublisher;
    private readonly ILogger<WorkOrderGrpcService> _logger;

    public WorkOrderGrpcService(
        WorkOrderDbContext db,
        EventPublisher eventPublisher,
        ILogger<WorkOrderGrpcService> logger)
    {
        _db = db;
        _eventPublisher = eventPublisher;
        _logger = logger;
    }

    // ─── CreateWorkOrder ──────────────────────────────────────────────────────

    public override async Task<Workorder.V1.WorkOrder> CreateWorkOrder(
        CreateWorkOrderRequest request,
        ServerCallContext context)
    {

        if (string.IsNullOrWhiteSpace(request.CustomerId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "customer_id is required"));

        if (string.IsNullOrWhiteSpace(request.VehicleId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "vehicle_id is required"));

        if (string.IsNullOrWhiteSpace(request.Description))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "description is required"));

        if (!Guid.TryParse(request.CustomerId, out var customerId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "customer_id must be a valid UUID"));

        if (!Guid.TryParse(request.VehicleId, out var vehicleId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "vehicle_id must be a valid UUID"));

        var workOrder = new Domain.WorkOrder
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            VehicleId = vehicleId,
            Description = request.Description.Trim(),
            AssignedMechanic = request.AssignedMechanic?.Trim() ?? string.Empty,
            Notes = request.Notes?.Trim() ?? string.Empty,
            Status = Domain.WorkOrderStatus.Draft,
            Currency = "EUR",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.WorkOrders.Add(workOrder);
        await _db.SaveChangesAsync(context.CancellationToken);

        _logger.LogInformation("Created WorkOrder {WorkOrderId} for Customer {CustomerId}", workOrder.Id, workOrder.CustomerId);

        await _eventPublisher.PublishWorkOrderCreatedAsync(workOrder, context.CancellationToken);

        return MapToProto(workOrder);
    }

    // ─── GetWorkOrder ─────────────────────────────────────────────────────────

    public override async Task<Workorder.V1.WorkOrder> GetWorkOrder(
        GetWorkOrderRequest request,
        ServerCallContext context)
    {

        if (!Guid.TryParse(request.Id, out var workOrderId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "id must be a valid UUID"));

        var workOrder = await _db.WorkOrders
            .Include(wo => wo.LineItems)
            .Include(wo => wo.LaborEntries)
            .AsNoTracking()
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId, context.CancellationToken);

        if (workOrder is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"WorkOrder {request.Id} not found"));

        return MapToProto(workOrder);
    }

    // ─── ListWorkOrders ───────────────────────────────────────────────────────

    public override async Task<ListWorkOrdersResponse> ListWorkOrders(
        ListWorkOrdersRequest request,
        ServerCallContext context)
    {

        var query = _db.WorkOrders
            .Include(wo => wo.LineItems)
            .Include(wo => wo.LaborEntries)
            .AsNoTracking()
            .AsQueryable();

        // Filter by status
        if (request.StatusFilter != Workorder.V1.WorkOrderStatus.Unspecified)
        {
            var domainStatus = MapToDomainStatus(request.StatusFilter);
            query = query.Where(wo => wo.Status == domainStatus);
        }

        // Filter by customer_id
        if (!string.IsNullOrWhiteSpace(request.CustomerIdFilter))
        {
            if (!Guid.TryParse(request.CustomerIdFilter, out var customerId))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "customer_id_filter must be a valid UUID"));

            query = query.Where(wo => wo.CustomerId == customerId);
        }

        var totalCount = await query.CountAsync(context.CancellationToken);

        var page = request.Pagination?.Page > 0 ? request.Pagination.Page : 1;
        var pageSize = request.Pagination?.PageSize > 0 ? request.Pagination.PageSize : 20;
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var workOrders = await query
            .OrderByDescending(wo => wo.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(context.CancellationToken);

        var response = new ListWorkOrdersResponse
        {
            Pagination = new PaginationResult
            {
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
            },
        };

        response.WorkOrders.AddRange(workOrders.Select(MapToProto));

        return response;
    }

    // ─── UpdateWorkOrderStatus ────────────────────────────────────────────────

    public override async Task<Workorder.V1.WorkOrder> UpdateWorkOrderStatus(
        UpdateWorkOrderStatusRequest request,
        ServerCallContext context)
    {

        if (!Guid.TryParse(request.Id, out var workOrderId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "id must be a valid UUID"));

        if (request.NewStatus == Workorder.V1.WorkOrderStatus.Unspecified)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "new_status must be specified"));

        var workOrder = await _db.WorkOrders
            .Include(wo => wo.LineItems)
            .Include(wo => wo.LaborEntries)
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId, context.CancellationToken);

        if (workOrder is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"WorkOrder {request.Id} not found"));

        var newDomainStatus = MapToDomainStatus(request.NewStatus);

        if (!workOrder.CanTransitionTo(newDomainStatus))
        {
            throw new RpcException(new Status(
                StatusCode.FailedPrecondition,
                $"Cannot transition WorkOrder from {workOrder.Status} to {newDomainStatus}"));
        }

        var previousStatus = workOrder.Status;
        workOrder.Status = newDomainStatus;
        workOrder.UpdatedAt = DateTime.UtcNow;

        // Handle COMPLETED transition
        if (newDomainStatus == Domain.WorkOrderStatus.Completed)
        {
            workOrder.CompletedAt = DateTime.UtcNow;
            workOrder.RecalculateActualTotal();
        }

        await _db.SaveChangesAsync(context.CancellationToken);

        _logger.LogInformation(
            "WorkOrder {WorkOrderId} status changed from {Previous} to {New}",
            workOrder.Id, previousStatus, newDomainStatus);

        // Publish status-specific events
        if (newDomainStatus == Domain.WorkOrderStatus.Completed)
            await _eventPublisher.PublishWorkOrderCompletedAsync(workOrder, context.CancellationToken);
        else if (newDomainStatus == Domain.WorkOrderStatus.Cancelled)
            await _eventPublisher.PublishWorkOrderCancelledAsync(workOrder, context.CancellationToken);

        return MapToProto(workOrder);
    }

    // ─── AddLineItem ──────────────────────────────────────────────────────────

    public override async Task<Workorder.V1.WorkOrder> AddLineItem(
        AddLineItemRequest request,
        ServerCallContext context)
    {

        if (!Guid.TryParse(request.WorkOrderId, out var workOrderId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "work_order_id must be a valid UUID"));

        if (string.IsNullOrWhiteSpace(request.PartId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "part_id is required"));

        if (!Guid.TryParse(request.PartId, out var partId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "part_id must be a valid UUID"));

        if (request.Quantity <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "quantity must be greater than 0"));

        var workOrder = await _db.WorkOrders
            .Include(wo => wo.LineItems)
            .Include(wo => wo.LaborEntries)
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId, context.CancellationToken);

        if (workOrder is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"WorkOrder {request.WorkOrderId} not found"));

        if (workOrder.Status is Domain.WorkOrderStatus.Completed
            or Domain.WorkOrderStatus.Cancelled
            or Domain.WorkOrderStatus.Invoiced)
        {
            throw new RpcException(new Status(
                StatusCode.FailedPrecondition,
                $"Cannot add line items to a WorkOrder in status {workOrder.Status}"));
        }

        var lineItem = new Domain.WorkOrderLineItem
        {
            Id = Guid.NewGuid(),
            WorkOrderId = workOrderId,
            PartId = partId,
            PartName = $"Part {request.PartId}", // Will be updated when inventory.parts-reserved is received
            Quantity = request.Quantity,
            UnitPriceCents = 0, // Populated via inventory event
            TotalPriceCents = 0,
            Currency = workOrder.Currency,
            CreatedAt = DateTime.UtcNow,
        };

        workOrder.LineItems.Add(lineItem);
        workOrder.RecalculateEstimatedTotal();

        await _db.SaveChangesAsync(context.CancellationToken);

        _logger.LogInformation(
            "Added LineItem {LineItemId} (PartId={PartId}) to WorkOrder {WorkOrderId}",
            lineItem.Id, partId, workOrderId);

        await _eventPublisher.PublishPartsAddedAsync(workOrder, lineItem, context.CancellationToken);

        return MapToProto(workOrder);
    }

    // ─── RemoveLineItem ───────────────────────────────────────────────────────

    public override async Task<Workorder.V1.WorkOrder> RemoveLineItem(
        RemoveLineItemRequest request,
        ServerCallContext context)
    {

        if (!Guid.TryParse(request.WorkOrderId, out var workOrderId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "work_order_id must be a valid UUID"));

        if (!Guid.TryParse(request.LineItemId, out var lineItemId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "line_item_id must be a valid UUID"));

        var workOrder = await _db.WorkOrders
            .Include(wo => wo.LineItems)
            .Include(wo => wo.LaborEntries)
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId, context.CancellationToken);

        if (workOrder is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"WorkOrder {request.WorkOrderId} not found"));

        if (workOrder.Status is Domain.WorkOrderStatus.Completed
            or Domain.WorkOrderStatus.Cancelled
            or Domain.WorkOrderStatus.Invoiced)
        {
            throw new RpcException(new Status(
                StatusCode.FailedPrecondition,
                $"Cannot remove line items from a WorkOrder in status {workOrder.Status}"));
        }

        var lineItem = workOrder.LineItems.FirstOrDefault(li => li.Id == lineItemId);
        if (lineItem is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"LineItem {request.LineItemId} not found on WorkOrder {request.WorkOrderId}"));

        workOrder.LineItems.Remove(lineItem);
        _db.WorkOrderLineItems.Remove(lineItem);
        workOrder.RecalculateEstimatedTotal();

        await _db.SaveChangesAsync(context.CancellationToken);

        _logger.LogInformation(
            "Removed LineItem {LineItemId} from WorkOrder {WorkOrderId}",
            lineItemId, workOrderId);

        return MapToProto(workOrder);
    }

    // ─── AddLaborEntry ────────────────────────────────────────────────────────

    public override async Task<Workorder.V1.WorkOrder> AddLaborEntry(
        AddLaborEntryRequest request,
        ServerCallContext context)
    {

        if (!Guid.TryParse(request.WorkOrderId, out var workOrderId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "work_order_id must be a valid UUID"));

        if (string.IsNullOrWhiteSpace(request.Description))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "description is required"));

        if (request.Hours <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "hours must be greater than 0"));

        if (request.HourlyRate is null)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "hourly_rate is required"));

        if (string.IsNullOrWhiteSpace(request.MechanicName))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "mechanic_name is required"));

        var workOrder = await _db.WorkOrders
            .Include(wo => wo.LineItems)
            .Include(wo => wo.LaborEntries)
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId, context.CancellationToken);

        if (workOrder is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"WorkOrder {request.WorkOrderId} not found"));

        if (workOrder.Status is Domain.WorkOrderStatus.Completed
            or Domain.WorkOrderStatus.Cancelled
            or Domain.WorkOrderStatus.Invoiced)
        {
            throw new RpcException(new Status(
                StatusCode.FailedPrecondition,
                $"Cannot add labor entries to a WorkOrder in status {workOrder.Status}"));
        }

        var hourlyRateCents = request.HourlyRate.AmountCents;
        var hours = (decimal)request.Hours;
        var totalCents = (long)(hours * hourlyRateCents);

        var laborEntry = new Domain.LaborEntry
        {
            Id = Guid.NewGuid(),
            WorkOrderId = workOrderId,
            Description = request.Description.Trim(),
            Hours = hours,
            HourlyRateCents = hourlyRateCents,
            TotalCents = totalCents,
            MechanicName = request.MechanicName.Trim(),
            Currency = request.HourlyRate.Currency.Length > 0 ? request.HourlyRate.Currency : workOrder.Currency,
            CreatedAt = DateTime.UtcNow,
        };

        workOrder.LaborEntries.Add(laborEntry);
        workOrder.RecalculateEstimatedTotal();

        await _db.SaveChangesAsync(context.CancellationToken);

        _logger.LogInformation(
            "Added LaborEntry {LaborEntryId} to WorkOrder {WorkOrderId}",
            laborEntry.Id, workOrderId);

        return MapToProto(workOrder);
    }

    // ─── Mapping Helpers ──────────────────────────────────────────────────────

    private static Workorder.V1.WorkOrder MapToProto(Domain.WorkOrder wo)
    {
        var proto = new Workorder.V1.WorkOrder
        {
            Id = wo.Id.ToString(),
            CustomerId = wo.CustomerId.ToString(),
            VehicleId = wo.VehicleId.ToString(),
            Description = wo.Description,
            Status = MapToProtoStatus(wo.Status),
            AssignedMechanic = wo.AssignedMechanic,
            Notes = wo.Notes,
            EstimatedTotal = new Money
            {
                AmountCents = wo.EstimatedTotalCents,
                Currency = wo.Currency,
            },
            ActualTotal = new Money
            {
                AmountCents = wo.ActualTotalCents,
                Currency = wo.Currency,
            },
            CreatedAt = wo.CreatedAt.ToString("O"),
            UpdatedAt = wo.UpdatedAt.ToString("O"),
            CompletedAt = wo.CompletedAt?.ToString("O") ?? string.Empty,
        };

        proto.LineItems.AddRange(wo.LineItems.Select(MapLineItemToProto));
        proto.LaborEntries.AddRange(wo.LaborEntries.Select(MapLaborEntryToProto));

        return proto;
    }

    private static Workorder.V1.WorkOrderLineItem MapLineItemToProto(Domain.WorkOrderLineItem li) =>
        new()
        {
            Id = li.Id.ToString(),
            WorkOrderId = li.WorkOrderId.ToString(),
            PartId = li.PartId.ToString(),
            PartName = li.PartName,
            Quantity = li.Quantity,
            UnitPrice = new Money { AmountCents = li.UnitPriceCents, Currency = li.Currency },
            TotalPrice = new Money { AmountCents = li.TotalPriceCents, Currency = li.Currency },
        };

    private static Workorder.V1.LaborEntry MapLaborEntryToProto(Domain.LaborEntry le) =>
        new()
        {
            Id = le.Id.ToString(),
            WorkOrderId = le.WorkOrderId.ToString(),
            Description = le.Description,
            Hours = (double)le.Hours,
            HourlyRate = new Money { AmountCents = le.HourlyRateCents, Currency = le.Currency },
            Total = new Money { AmountCents = le.TotalCents, Currency = le.Currency },
            MechanicName = le.MechanicName,
        };

    private static Workorder.V1.WorkOrderStatus MapToProtoStatus(Domain.WorkOrderStatus status) =>
        status switch
        {
            Domain.WorkOrderStatus.Draft => Workorder.V1.WorkOrderStatus.Draft,
            Domain.WorkOrderStatus.Pending => Workorder.V1.WorkOrderStatus.Pending,
            Domain.WorkOrderStatus.InProgress => Workorder.V1.WorkOrderStatus.InProgress,
            Domain.WorkOrderStatus.AwaitingParts => Workorder.V1.WorkOrderStatus.AwaitingParts,
            Domain.WorkOrderStatus.Completed => Workorder.V1.WorkOrderStatus.Completed,
            Domain.WorkOrderStatus.Cancelled => Workorder.V1.WorkOrderStatus.Cancelled,
            Domain.WorkOrderStatus.Invoiced => Workorder.V1.WorkOrderStatus.Invoiced,
            _ => Workorder.V1.WorkOrderStatus.Unspecified,
        };

    private static Domain.WorkOrderStatus MapToDomainStatus(Workorder.V1.WorkOrderStatus status) =>
        status switch
        {
            Workorder.V1.WorkOrderStatus.Draft => Domain.WorkOrderStatus.Draft,
            Workorder.V1.WorkOrderStatus.Pending => Domain.WorkOrderStatus.Pending,
            Workorder.V1.WorkOrderStatus.InProgress => Domain.WorkOrderStatus.InProgress,
            Workorder.V1.WorkOrderStatus.AwaitingParts => Domain.WorkOrderStatus.AwaitingParts,
            Workorder.V1.WorkOrderStatus.Completed => Domain.WorkOrderStatus.Completed,
            Workorder.V1.WorkOrderStatus.Cancelled => Domain.WorkOrderStatus.Cancelled,
            Workorder.V1.WorkOrderStatus.Invoiced => Domain.WorkOrderStatus.Invoiced,
            _ => Domain.WorkOrderStatus.Unspecified,
        };
}
