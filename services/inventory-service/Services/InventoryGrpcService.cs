using Grpc.Core;
using Inventory.V1;
using Common.V1;
using InventoryService.Application.UseCases;
using InventoryService.Domain;
using InventoryService.Events;
using InventoryService.Infrastructure;
using ProtoPart = Inventory.V1.Part;

namespace InventoryService.Services;

public class InventoryGrpcService : Inventory.V1.InventoryService.InventoryServiceBase
{
    private readonly CreatePartUseCase _createPart;
    private readonly GetPartUseCase _getPart;
    private readonly ListPartsUseCase _listParts;
    private readonly UpdatePartUseCase _updatePart;
    private readonly CheckAvailabilityUseCase _checkAvailability;
    private readonly ReservePartsUseCase _reserveParts;
    private readonly ReleasePartsUseCase _releaseParts;
    private readonly ListLowStockPartsUseCase _listLowStockParts;
    private readonly InventoryDbContext _db;
    private readonly EventPublisher _publisher;
    private readonly ILogger<InventoryGrpcService> _logger;

    public InventoryGrpcService(
        CreatePartUseCase createPart,
        GetPartUseCase getPart,
        ListPartsUseCase listParts,
        UpdatePartUseCase updatePart,
        CheckAvailabilityUseCase checkAvailability,
        ReservePartsUseCase reserveParts,
        ReleasePartsUseCase releaseParts,
        ListLowStockPartsUseCase listLowStockParts,
        InventoryDbContext db,
        EventPublisher publisher,
        ILogger<InventoryGrpcService> logger)
    {
        _createPart = createPart;
        _getPart = getPart;
        _listParts = listParts;
        _updatePart = updatePart;
        _checkAvailability = checkAvailability;
        _reserveParts = reserveParts;
        _releaseParts = releaseParts;
        _listLowStockParts = listLowStockParts;
        _db = db;
        _publisher = publisher;
        _logger = logger;
    }

    public override async Task<ProtoPart> CreatePart(CreatePartRequest request, ServerCallContext context)
    {
        try
        {
            var partData = Domain.Part.Create(
                sku: request.Sku,
                name: request.Name,
                description: request.Description,
                category: request.Category,
                manufacturer: request.Manufacturer,
                unitPriceCents: request.UnitPrice?.AmountCents ?? 0,
                unitPriceCurrency: request.UnitPrice?.Currency ?? "EUR",
                costPriceCents: request.CostPrice?.AmountCents ?? 0,
                costPriceCurrency: request.CostPrice?.Currency ?? "EUR",
                quantityInStock: request.InitialStock,
                reorderLevel: request.ReorderLevel > 0 ? request.ReorderLevel : 5,
                location: request.Location,
                compatibleMakes: [.. request.CompatibleMakes]);

            var part = await _createPart.ExecuteAsync(partData, context.CancellationToken);
            _logger.LogInformation("Created part {PartId} with SKU {Sku}", part.Id, part.Sku);
            return MapToProto(part);
        }
        catch (ArgumentException ex)
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            throw new RpcException(new Status(StatusCode.AlreadyExists, ex.Message));
        }
    }

    public override async Task<ProtoPart> GetPart(GetPartRequest request, ServerCallContext context)
    {
        if (!Guid.TryParse(request.Id, out var id))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid part id format."));

        try
        {
            var part = await _getPart.ExecuteAsync(id, context.CancellationToken);
            return MapToProto(part);
        }
        catch (KeyNotFoundException ex)
        {
            throw new RpcException(new Status(StatusCode.NotFound, ex.Message));
        }
    }

    public override async Task<ListPartsResponse> ListParts(ListPartsRequest request, ServerCallContext context)
    {
        var page = request.Pagination?.Page > 0 ? request.Pagination.Page : 1;
        var pageSize = request.Pagination?.PageSize > 0 ? request.Pagination.PageSize : 20;

        var (items, totalCount) = await _listParts.ExecuteAsync(
            page, pageSize,
            request.CategoryFilter.Length > 0 ? request.CategoryFilter : null,
            request.SearchQuery.Length > 0 ? request.SearchQuery : null,
            context.CancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        var response = new ListPartsResponse
        {
            Pagination = new PaginationResult { TotalCount = totalCount, Page = page, PageSize = pageSize, TotalPages = totalPages }
        };
        response.Parts.AddRange(items.Select(MapToProto));
        return response;
    }

    public override async Task<ProtoPart> UpdatePart(UpdatePartRequest request, ServerCallContext context)
    {
        if (!Guid.TryParse(request.Id, out var id))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid part id format."));

        try
        {
            var part = await _updatePart.ExecuteAsync(id, p =>
            {
                if (!string.IsNullOrWhiteSpace(request.Name)) p.Name = request.Name;
                if (!string.IsNullOrWhiteSpace(request.Description)) p.Description = request.Description;
                if (!string.IsNullOrWhiteSpace(request.Category)) p.Category = request.Category;
                if (request.UnitPrice is not null)
                {
                    p.UnitPriceCents = request.UnitPrice.AmountCents;
                    if (!string.IsNullOrWhiteSpace(request.UnitPrice.Currency)) p.UnitPriceCurrency = request.UnitPrice.Currency;
                }
                if (request.CostPrice is not null)
                {
                    p.CostPriceCents = request.CostPrice.AmountCents;
                    if (!string.IsNullOrWhiteSpace(request.CostPrice.Currency)) p.CostPriceCurrency = request.CostPrice.Currency;
                }
                if (request.ReorderLevel > 0) p.ReorderLevel = request.ReorderLevel;
                if (!string.IsNullOrWhiteSpace(request.Location)) p.Location = request.Location;
            }, context.CancellationToken);

            _logger.LogInformation("Updated part {PartId}", part.Id);
            return MapToProto(part);
        }
        catch (KeyNotFoundException ex)
        {
            throw new RpcException(new Status(StatusCode.NotFound, ex.Message));
        }
    }

    public override async Task<CheckAvailabilityResponse> CheckAvailability(
        CheckAvailabilityRequest request, ServerCallContext context)
    {
        var items = request.Items
            .Select(i => new AvailabilityItem(i.PartId, i.Quantity))
            .ToList();

        var (results, allAvailable) = await _checkAvailability.ExecuteAsync(items, context.CancellationToken);

        var response = new CheckAvailabilityResponse { AllAvailable = allAvailable };
        response.Availability.AddRange(results.Select(r => new PartAvailability
        {
            PartId = r.PartId, Requested = r.Requested, Available = r.Available, IsAvailable = r.IsAvailable,
        }));
        return response;
    }

    public override async Task<ReservePartsResponse> ReserveParts(
        ReservePartsRequest request, ServerCallContext context)
    {
        if (!Guid.TryParse(request.WorkOrderId, out var workOrderId))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid work_order_id format."));

        await using var transaction = await _db.Database.BeginTransactionAsync(context.CancellationToken);

        try
        {
            var items = request.Items
                .Select(i => new ReserveItem(i.PartId, i.Quantity))
                .ToList();

            var (success, errorMessage, reservation, reservedItems) =
                await _reserveParts.ExecuteAsync(workOrderId, items, context.CancellationToken);

            if (!success)
            {
                await transaction.RollbackAsync(context.CancellationToken);
                return new ReservePartsResponse { Success = false, ErrorMessage = errorMessage };
            }

            await transaction.CommitAsync(context.CancellationToken);

            await _publisher.PublishPartsReservedAsync(new PartsReservedEvent
            {
                ReservationId = reservation!.Id.ToString(),
                WorkOrderId = workOrderId.ToString(),
                Items = reservedItems.Select(i => new ReservedItemPayload
                {
                    PartId = i.PartId, Quantity = i.Quantity, UnitPriceCents = i.UnitPriceCents
                }).ToList(),
            }, context.CancellationToken);

            _logger.LogInformation(
                "Reserved parts for work order {WorkOrderId}, reservation {ReservationId}",
                workOrderId, reservation.Id);

            return new ReservePartsResponse { Success = true, ReservationId = reservation.Id.ToString() };
        }
        catch (Exception ex) when (ex is not RpcException)
        {
            await transaction.RollbackAsync(context.CancellationToken);
            _logger.LogError(ex, "ReserveParts failed for work order {WorkOrderId}", request.WorkOrderId);
            throw new RpcException(new Status(StatusCode.Internal, "Failed to reserve parts."));
        }
    }

    public override async Task<ReleasePartsResponse> ReleaseParts(
        ReleasePartsRequest request, ServerCallContext context)
    {
        Guid? reservationId = null;
        if (!string.IsNullOrWhiteSpace(request.ReservationId) && Guid.TryParse(request.ReservationId, out var rid))
            reservationId = rid;

        Guid? workOrderId = null;
        if (!string.IsNullOrWhiteSpace(request.WorkOrderId) && Guid.TryParse(request.WorkOrderId, out var wid))
            workOrderId = wid;

        await using var transaction = await _db.Database.BeginTransactionAsync(context.CancellationToken);
        try
        {
            await _releaseParts.ExecuteAsync(reservationId, workOrderId, context.CancellationToken);
            await transaction.CommitAsync(context.CancellationToken);
            return new ReleasePartsResponse { Success = true };
        }
        catch (Exception ex) when (ex is not RpcException)
        {
            await transaction.RollbackAsync(context.CancellationToken);
            _logger.LogError(ex, "ReleaseParts failed");
            throw new RpcException(new Status(StatusCode.Internal, "Failed to release parts."));
        }
    }

    public override async Task<ListPartsResponse> ListLowStockParts(
        ListLowStockPartsRequest request, ServerCallContext context)
    {
        var page = request.Pagination?.Page > 0 ? request.Pagination.Page : 1;
        var pageSize = request.Pagination?.PageSize > 0 ? request.Pagination.PageSize : 20;

        var (items, totalCount) = await _listLowStockParts.ExecuteAsync(page, pageSize, context.CancellationToken);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var response = new ListPartsResponse
        {
            Pagination = new PaginationResult { TotalCount = totalCount, Page = page, PageSize = pageSize, TotalPages = totalPages }
        };
        response.Parts.AddRange(items.Select(MapToProto));
        return response;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /// <summary>
    /// Maps a domain Part entity to the protobuf Part message.
    /// </summary>
    private static ProtoPart MapToProto(Domain.Part p) => new()
    {
        Id = p.Id.ToString(),
        Sku = p.Sku,
        Name = p.Name,
        Description = p.Description,
        Category = p.Category,
        Manufacturer = p.Manufacturer,
        UnitPrice = new Money { AmountCents = p.UnitPriceCents, Currency = p.UnitPriceCurrency },
        CostPrice = new Money { AmountCents = p.CostPriceCents, Currency = p.CostPriceCurrency },
        QuantityInStock = p.QuantityInStock,
        QuantityReserved = p.QuantityReserved,
        ReorderLevel = p.ReorderLevel,
        Location = p.Location,
        CreatedAt = p.CreatedAt.ToString("O"),
        UpdatedAt = p.UpdatedAt.ToString("O"),
        CompatibleMakes = { p.CompatibleMakes },
    };
}
