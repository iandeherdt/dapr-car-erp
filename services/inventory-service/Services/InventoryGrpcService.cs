using Grpc.Core;
using Inventory.V1;
using Common.V1;
using InventoryService.Domain;
using InventoryService.Events;
using InventoryService.Infrastructure;
using Microsoft.EntityFrameworkCore;
using ProtoPart = Inventory.V1.Part;

namespace InventoryService.Services;

public class InventoryGrpcService : Inventory.V1.InventoryService.InventoryServiceBase
{
    private readonly InventoryDbContext _db;
    private readonly EventPublisher _publisher;
    private readonly ILogger<InventoryGrpcService> _logger;

    public InventoryGrpcService(
        InventoryDbContext db,
        EventPublisher publisher,
        ILogger<InventoryGrpcService> logger)
    {
        _db = db;
        _publisher = publisher;
        _logger = logger;
    }

    // ── CreatePart ────────────────────────────────────────────────────────────

    public override async Task<ProtoPart> CreatePart(CreatePartRequest request, ServerCallContext context)
    {
        // Guard: SKU must be unique
        var exists = await _db.Parts
            .AnyAsync(p => p.Sku == request.Sku, context.CancellationToken);

        if (exists)
        {
            throw new RpcException(new Status(
                StatusCode.AlreadyExists,
                $"A part with SKU '{request.Sku}' already exists."));
        }

        var now = DateTime.UtcNow;
        var part = new Domain.Part
        {
            Id = Guid.NewGuid(),
            Sku = request.Sku,
            Name = request.Name,
            Description = request.Description,
            Category = request.Category,
            Manufacturer = request.Manufacturer,
            UnitPriceCents = request.UnitPrice?.AmountCents ?? 0,
            UnitPriceCurrency = request.UnitPrice?.Currency ?? "EUR",
            CostPriceCents = request.CostPrice?.AmountCents ?? 0,
            CostPriceCurrency = request.CostPrice?.Currency ?? "EUR",
            QuantityInStock = request.InitialStock,
            QuantityReserved = 0,
            ReorderLevel = request.ReorderLevel > 0 ? request.ReorderLevel : 5,
            Location = request.Location,
            CompatibleMakes = [.. request.CompatibleMakes],
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Parts.Add(part);
        await _db.SaveChangesAsync(context.CancellationToken);

        _logger.LogInformation("Created part {PartId} with SKU {Sku}", part.Id, part.Sku);

        return MapToProto(part);
    }

    // ── GetPart ───────────────────────────────────────────────────────────────

    public override async Task<ProtoPart> GetPart(GetPartRequest request, ServerCallContext context)
    {

        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid part id format."));
        }

        var part = await _db.Parts
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, context.CancellationToken);

        if (part is null)
        {
            throw new RpcException(new Status(StatusCode.NotFound, $"Part '{request.Id}' not found."));
        }

        return MapToProto(part);
    }

    // ── ListParts ─────────────────────────────────────────────────────────────

    public override async Task<ListPartsResponse> ListParts(ListPartsRequest request, ServerCallContext context)
    {

        var page = request.Pagination?.Page > 0 ? request.Pagination.Page : 1;
        var pageSize = request.Pagination?.PageSize > 0 ? request.Pagination.PageSize : 20;

        var query = _db.Parts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.CategoryFilter))
        {
            query = query.Where(p => p.Category == request.CategoryFilter);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchQuery))
        {
            var search = request.SearchQuery.ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(search) ||
                p.Sku.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync(context.CancellationToken);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var parts = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(context.CancellationToken);

        var response = new ListPartsResponse
        {
            Pagination = new PaginationResult
            {
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
            }
        };
        response.Parts.AddRange(parts.Select(MapToProto));

        return response;
    }

    // ── UpdatePart ────────────────────────────────────────────────────────────

    public override async Task<ProtoPart> UpdatePart(UpdatePartRequest request, ServerCallContext context)
    {

        if (!Guid.TryParse(request.Id, out var id))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid part id format."));
        }

        var part = await _db.Parts
            .FirstOrDefaultAsync(p => p.Id == id, context.CancellationToken);

        if (part is null)
        {
            throw new RpcException(new Status(StatusCode.NotFound, $"Part '{request.Id}' not found."));
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
            part.Name = request.Name;

        if (!string.IsNullOrWhiteSpace(request.Description))
            part.Description = request.Description;

        if (!string.IsNullOrWhiteSpace(request.Category))
            part.Category = request.Category;

        if (request.UnitPrice is not null)
        {
            part.UnitPriceCents = request.UnitPrice.AmountCents;
            if (!string.IsNullOrWhiteSpace(request.UnitPrice.Currency))
                part.UnitPriceCurrency = request.UnitPrice.Currency;
        }

        if (request.CostPrice is not null)
        {
            part.CostPriceCents = request.CostPrice.AmountCents;
            if (!string.IsNullOrWhiteSpace(request.CostPrice.Currency))
                part.CostPriceCurrency = request.CostPrice.Currency;
        }

        if (request.ReorderLevel > 0)
            part.ReorderLevel = request.ReorderLevel;

        if (!string.IsNullOrWhiteSpace(request.Location))
            part.Location = request.Location;

        part.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(context.CancellationToken);

        _logger.LogInformation("Updated part {PartId}", part.Id);

        return MapToProto(part);
    }

    // ── CheckAvailability ─────────────────────────────────────────────────────

    public override async Task<CheckAvailabilityResponse> CheckAvailability(
        CheckAvailabilityRequest request,
        ServerCallContext context)
    {

        var partIds = request.Items
            .Select(i => Guid.Parse(i.PartId))
            .ToList();

        var parts = await _db.Parts
            .AsNoTracking()
            .Where(p => partIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, context.CancellationToken);

        var response = new CheckAvailabilityResponse { AllAvailable = true };

        foreach (var item in request.Items)
        {
            if (!Guid.TryParse(item.PartId, out var partId) || !parts.TryGetValue(partId, out var part))
            {
                response.AllAvailable = false;
                response.Availability.Add(new PartAvailability
                {
                    PartId = item.PartId,
                    Requested = item.Quantity,
                    Available = 0,
                    IsAvailable = false,
                });
                continue;
            }

            var available = part.QuantityInStock - part.QuantityReserved;
            var isAvailable = available >= item.Quantity;

            if (!isAvailable)
                response.AllAvailable = false;

            response.Availability.Add(new PartAvailability
            {
                PartId = item.PartId,
                Requested = item.Quantity,
                Available = available,
                IsAvailable = isAvailable,
            });
        }

        return response;
    }

    // ── ReserveParts ──────────────────────────────────────────────────────────

    public override async Task<ReservePartsResponse> ReserveParts(
        ReservePartsRequest request,
        ServerCallContext context)
    {

        if (!Guid.TryParse(request.WorkOrderId, out var workOrderId))
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Invalid work_order_id format."));
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(context.CancellationToken);

        try
        {
            // Lock the relevant part rows for the duration of this transaction
            var partIds = request.Items
                .Select(i => Guid.Parse(i.PartId))
                .ToList();

            // Use explicit pessimistic locking via raw SQL row-level lock so we don't
            // get race conditions when multiple reservations hit the same parts concurrently.
            var parts = await _db.Parts
                .FromSqlRaw(
                    "SELECT * FROM parts WHERE id = ANY({0}) FOR UPDATE",
                    partIds.ToArray())
                .ToDictionaryAsync(p => p.Id, context.CancellationToken);

            // Availability check inside the transaction
            var unavailableItems = new List<string>();
            foreach (var item in request.Items)
            {
                if (!Guid.TryParse(item.PartId, out var partId) || !parts.TryGetValue(partId, out var part))
                {
                    unavailableItems.Add($"Part '{item.PartId}' not found.");
                    continue;
                }

                var available = part.QuantityInStock - part.QuantityReserved;
                if (available < item.Quantity)
                {
                    unavailableItems.Add(
                        $"Part '{part.Sku}' has only {available} units available (requested {item.Quantity}).");
                }
            }

            if (unavailableItems.Count > 0)
            {
                await transaction.RollbackAsync(context.CancellationToken);
                return new ReservePartsResponse
                {
                    Success = false,
                    ErrorMessage = string.Join(" | ", unavailableItems),
                };
            }

            // Create the reservation
            var now = DateTime.UtcNow;
            var reservation = new Reservation
            {
                Id = Guid.NewGuid(),
                WorkOrderId = workOrderId,
                Status = "active",
                CreatedAt = now,
            };

            var reservedItems = new List<ReservedItemPayload>();

            foreach (var item in request.Items)
            {
                var partId = Guid.Parse(item.PartId);
                var part = parts[partId];

                var reservationItem = new ReservationItem
                {
                    Id = Guid.NewGuid(),
                    ReservationId = reservation.Id,
                    PartId = partId,
                    Quantity = item.Quantity,
                    UnitPriceCents = part.UnitPriceCents,
                };
                reservation.Items.Add(reservationItem);

                // Increment reserved quantity
                part.QuantityReserved += item.Quantity;
                part.UpdatedAt = now;

                reservedItems.Add(new ReservedItemPayload
                {
                    PartId = item.PartId,
                    Quantity = item.Quantity,
                    UnitPriceCents = part.UnitPriceCents,
                });
            }

            _db.Reservations.Add(reservation);
            await _db.SaveChangesAsync(context.CancellationToken);
            await transaction.CommitAsync(context.CancellationToken);

            _logger.LogInformation(
                "Reserved parts for work order {WorkOrderId}, reservation {ReservationId}",
                workOrderId, reservation.Id);

            // Publish event outside the DB transaction (best-effort)
            await _publisher.PublishPartsReservedAsync(new PartsReservedEvent
            {
                ReservationId = reservation.Id.ToString(),
                WorkOrderId = workOrderId.ToString(),
                Items = reservedItems,
            }, context.CancellationToken);

            return new ReservePartsResponse
            {
                Success = true,
                ReservationId = reservation.Id.ToString(),
            };
        }
        catch (Exception ex) when (ex is not RpcException)
        {
            await transaction.RollbackAsync(context.CancellationToken);
            _logger.LogError(ex, "ReserveParts failed for work order {WorkOrderId}", request.WorkOrderId);
            throw new RpcException(new Status(StatusCode.Internal, "Failed to reserve parts."));
        }
    }

    // ── ReleaseParts ──────────────────────────────────────────────────────────

    public override async Task<ReleasePartsResponse> ReleaseParts(
        ReleasePartsRequest request,
        ServerCallContext context)
    {

        await using var transaction = await _db.Database.BeginTransactionAsync(context.CancellationToken);

        try
        {
            Reservation? reservation = null;

            if (!string.IsNullOrWhiteSpace(request.ReservationId) &&
                Guid.TryParse(request.ReservationId, out var reservationId))
            {
                reservation = await _db.Reservations
                    .Include(r => r.Items)
                    .FirstOrDefaultAsync(
                        r => r.Id == reservationId && r.Status == "active",
                        context.CancellationToken);
            }
            else if (!string.IsNullOrWhiteSpace(request.WorkOrderId) &&
                     Guid.TryParse(request.WorkOrderId, out var workOrderId))
            {
                reservation = await _db.Reservations
                    .Include(r => r.Items)
                    .FirstOrDefaultAsync(
                        r => r.WorkOrderId == workOrderId && r.Status == "active",
                        context.CancellationToken);
            }

            if (reservation is null)
            {
                // No active reservation found - treat as idempotent success
                await transaction.RollbackAsync(context.CancellationToken);
                return new ReleasePartsResponse { Success = true };
            }

            var partIds = reservation.Items.Select(i => i.PartId).ToArray();
            var parts = await _db.Parts
                .Where(p => partIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, context.CancellationToken);

            var now = DateTime.UtcNow;

            foreach (var item in reservation.Items)
            {
                if (parts.TryGetValue(item.PartId, out var part))
                {
                    part.QuantityReserved = Math.Max(0, part.QuantityReserved - item.Quantity);
                    part.UpdatedAt = now;
                }
            }

            reservation.Status = "released";
            reservation.ReleasedAt = now;

            await _db.SaveChangesAsync(context.CancellationToken);
            await transaction.CommitAsync(context.CancellationToken);

            _logger.LogInformation("Released reservation {ReservationId}", reservation.Id);

            return new ReleasePartsResponse { Success = true };
        }
        catch (Exception ex) when (ex is not RpcException)
        {
            await transaction.RollbackAsync(context.CancellationToken);
            _logger.LogError(ex, "ReleaseParts failed");
            throw new RpcException(new Status(StatusCode.Internal, "Failed to release parts."));
        }
    }

    // ── ListLowStockParts ─────────────────────────────────────────────────────

    public override async Task<ListPartsResponse> ListLowStockParts(
        ListLowStockPartsRequest request,
        ServerCallContext context)
    {

        var page = request.Pagination?.Page > 0 ? request.Pagination.Page : 1;
        var pageSize = request.Pagination?.PageSize > 0 ? request.Pagination.PageSize : 20;

        // quantity_in_stock - quantity_reserved <= reorder_level
        var query = _db.Parts
            .AsNoTracking()
            .Where(p => (p.QuantityInStock - p.QuantityReserved) <= p.ReorderLevel);

        var totalCount = await query.CountAsync(context.CancellationToken);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var parts = await query
            .OrderBy(p => p.QuantityInStock - p.QuantityReserved)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(context.CancellationToken);

        var response = new ListPartsResponse
        {
            Pagination = new PaginationResult
            {
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
            }
        };
        response.Parts.AddRange(parts.Select(MapToProto));

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
