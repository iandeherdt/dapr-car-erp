using Grpc.Core;
using Workorder.V1;
using WorkOrderService.Application.UseCases;
using WorkOrderService.Domain;
using Common.V1;

namespace WorkOrderService.Services;

public class WorkOrderGrpcService : Workorder.V1.WorkOrderService.WorkOrderServiceBase
{
    private readonly CreateWorkOrderUseCase _createWorkOrder;
    private readonly GetWorkOrderUseCase _getWorkOrder;
    private readonly ListWorkOrdersUseCase _listWorkOrders;
    private readonly UpdateWorkOrderStatusUseCase _updateWorkOrderStatus;
    private readonly AddLineItemUseCase _addLineItem;
    private readonly RemoveLineItemUseCase _removeLineItem;
    private readonly AddLaborEntryUseCase _addLaborEntry;
    private readonly ILogger<WorkOrderGrpcService> _logger;

    public WorkOrderGrpcService(
        CreateWorkOrderUseCase createWorkOrder,
        GetWorkOrderUseCase getWorkOrder,
        ListWorkOrdersUseCase listWorkOrders,
        UpdateWorkOrderStatusUseCase updateWorkOrderStatus,
        AddLineItemUseCase addLineItem,
        RemoveLineItemUseCase removeLineItem,
        AddLaborEntryUseCase addLaborEntry,
        ILogger<WorkOrderGrpcService> logger)
    {
        _createWorkOrder = createWorkOrder;
        _getWorkOrder = getWorkOrder;
        _listWorkOrders = listWorkOrders;
        _updateWorkOrderStatus = updateWorkOrderStatus;
        _addLineItem = addLineItem;
        _removeLineItem = removeLineItem;
        _addLaborEntry = addLaborEntry;
        _logger = logger;
    }

    public override async Task<Workorder.V1.WorkOrder> CreateWorkOrder(
        CreateWorkOrderRequest request, ServerCallContext context)
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

        try
        {
            var wo = await _createWorkOrder.ExecuteAsync(
                customerId, vehicleId, request.Description,
                request.AssignedMechanic, request.Notes, context.CancellationToken);
            _logger.LogInformation("Created WorkOrder {WorkOrderId}", wo.Id);
            return MapToProto(wo);
        }
        catch (ArgumentException ex)
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, ex.Message));
        }
    }

    public override async Task<Workorder.V1.WorkOrder> GetWorkOrder(
        GetWorkOrderRequest request, ServerCallContext context)
    {
        if (!Guid.TryParse(request.Id, out var id))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "id must be a valid UUID"));

        try
        {
            var wo = await _getWorkOrder.ExecuteAsync(id, context.CancellationToken);
            return MapToProto(wo);
        }
        catch (KeyNotFoundException ex)
        {
            throw new RpcException(new Status(StatusCode.NotFound, ex.Message));
        }
    }

    public override async Task<ListWorkOrdersResponse> ListWorkOrders(
        ListWorkOrdersRequest request, ServerCallContext context)
    {
        Domain.WorkOrderStatus? statusFilter = null;
        if (request.StatusFilter != Workorder.V1.WorkOrderStatus.Unspecified)
            statusFilter = MapToDomainStatus(request.StatusFilter);

        Guid? customerIdFilter = null;
        if (!string.IsNullOrWhiteSpace(request.CustomerIdFilter))
        {
            if (!Guid.TryParse(request.CustomerIdFilter, out var cid))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "customer_id_filter must be a valid UUID"));
            customerIdFilter = cid;
        }

        var page = request.Pagination?.Page > 0 ? request.Pagination.Page : 1;
        var pageSize = request.Pagination?.PageSize > 0 ? request.Pagination.PageSize : 20;

        var (items, totalCount) = await _listWorkOrders.ExecuteAsync(
            page, pageSize, statusFilter, customerIdFilter, context.CancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        var response = new ListWorkOrdersResponse
        {
            Pagination = new PaginationResult
            {
                TotalCount = totalCount, Page = page, PageSize = pageSize, TotalPages = totalPages,
            },
        };
        response.WorkOrders.AddRange(items.Select(MapToProto));
        return response;
    }

    public override async Task<Workorder.V1.WorkOrder> UpdateWorkOrderStatus(
        UpdateWorkOrderStatusRequest request, ServerCallContext context)
    {
        if (!Guid.TryParse(request.Id, out var id))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "id must be a valid UUID"));
        if (request.NewStatus == Workorder.V1.WorkOrderStatus.Unspecified)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "new_status must be specified"));

        try
        {
            var wo = await _updateWorkOrderStatus.ExecuteAsync(
                id, MapToDomainStatus(request.NewStatus), context.CancellationToken);
            return MapToProto(wo);
        }
        catch (KeyNotFoundException ex)
        {
            throw new RpcException(new Status(StatusCode.NotFound, ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            throw new RpcException(new Status(StatusCode.FailedPrecondition, ex.Message));
        }
    }

    public override async Task<Workorder.V1.WorkOrder> AddLineItem(
        AddLineItemRequest request, ServerCallContext context)
    {
        if (!Guid.TryParse(request.WorkOrderId, out var workOrderId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "work_order_id must be a valid UUID"));
        if (!Guid.TryParse(request.PartId, out var partId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "part_id must be a valid UUID"));

        try
        {
            var wo = await _addLineItem.ExecuteAsync(workOrderId, partId, request.Quantity, context.CancellationToken);
            return MapToProto(wo);
        }
        catch (KeyNotFoundException ex) { throw new RpcException(new Status(StatusCode.NotFound, ex.Message)); }
        catch (ArgumentException ex) { throw new RpcException(new Status(StatusCode.InvalidArgument, ex.Message)); }
        catch (InvalidOperationException ex) { throw new RpcException(new Status(StatusCode.FailedPrecondition, ex.Message)); }
    }

    public override async Task<Workorder.V1.WorkOrder> RemoveLineItem(
        RemoveLineItemRequest request, ServerCallContext context)
    {
        if (!Guid.TryParse(request.WorkOrderId, out var workOrderId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "work_order_id must be a valid UUID"));
        if (!Guid.TryParse(request.LineItemId, out var lineItemId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "line_item_id must be a valid UUID"));

        try
        {
            var wo = await _removeLineItem.ExecuteAsync(workOrderId, lineItemId, context.CancellationToken);
            return MapToProto(wo);
        }
        catch (KeyNotFoundException ex) { throw new RpcException(new Status(StatusCode.NotFound, ex.Message)); }
        catch (InvalidOperationException ex) { throw new RpcException(new Status(StatusCode.FailedPrecondition, ex.Message)); }
    }

    public override async Task<Workorder.V1.WorkOrder> AddLaborEntry(
        AddLaborEntryRequest request, ServerCallContext context)
    {
        if (!Guid.TryParse(request.WorkOrderId, out var workOrderId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "work_order_id must be a valid UUID"));
        if (request.HourlyRate is null)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "hourly_rate is required"));

        try
        {
            var wo = await _addLaborEntry.ExecuteAsync(
                workOrderId, request.Description, (decimal)request.Hours,
                request.HourlyRate.AmountCents, request.MechanicName,
                request.HourlyRate.Currency, context.CancellationToken);
            return MapToProto(wo);
        }
        catch (KeyNotFoundException ex) { throw new RpcException(new Status(StatusCode.NotFound, ex.Message)); }
        catch (ArgumentException ex) { throw new RpcException(new Status(StatusCode.InvalidArgument, ex.Message)); }
        catch (InvalidOperationException ex) { throw new RpcException(new Status(StatusCode.FailedPrecondition, ex.Message)); }
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
            EstimatedTotal = new Money { AmountCents = wo.EstimatedTotalCents, Currency = wo.Currency },
            ActualTotal = new Money { AmountCents = wo.ActualTotalCents, Currency = wo.Currency },
            CreatedAt = wo.CreatedAt.ToString("O"),
            UpdatedAt = wo.UpdatedAt.ToString("O"),
            CompletedAt = wo.CompletedAt?.ToString("O") ?? string.Empty,
        };
        proto.LineItems.AddRange(wo.LineItems.Select(MapLineItemToProto));
        proto.LaborEntries.AddRange(wo.LaborEntries.Select(MapLaborEntryToProto));
        return proto;
    }

    private static Workorder.V1.WorkOrderLineItem MapLineItemToProto(Domain.WorkOrderLineItem li) =>
        new() { Id = li.Id.ToString(), WorkOrderId = li.WorkOrderId.ToString(), PartId = li.PartId.ToString(),
            PartName = li.PartName, Quantity = li.Quantity,
            UnitPrice = new Money { AmountCents = li.UnitPriceCents, Currency = li.Currency },
            TotalPrice = new Money { AmountCents = li.TotalPriceCents, Currency = li.Currency } };

    private static Workorder.V1.LaborEntry MapLaborEntryToProto(Domain.LaborEntry le) =>
        new() { Id = le.Id.ToString(), WorkOrderId = le.WorkOrderId.ToString(),
            Description = le.Description, Hours = (double)le.Hours,
            HourlyRate = new Money { AmountCents = le.HourlyRateCents, Currency = le.Currency },
            Total = new Money { AmountCents = le.TotalCents, Currency = le.Currency },
            MechanicName = le.MechanicName };

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
