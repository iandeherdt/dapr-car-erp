using Dapr.Client;
using InventoryService.Application.UseCases;
using InventoryService.Domain.Repositories;
using InventoryService.Events;
using InventoryService.Infrastructure;
using InventoryService.Infrastructure.Repositories;
using InventoryService.Services;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Formatting.Compact;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, lc) => lc
    .Enrich.FromLogContext()
    .Enrich.WithProperty("service", "inventory-service")
    .WriteTo.Console(new CompactJsonFormatter()));

// ── gRPC ──────────────────────────────────────────────────────────────────────
builder.Services.AddSingleton<InventoryService.Infrastructure.LoggingInterceptor>();
builder.Services.AddGrpc(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.Interceptors.Add<InventoryService.Infrastructure.LoggingInterceptor>();
});

// ── Dapr ──────────────────────────────────────────────────────────────────────
builder.Services.AddDaprClient();
builder.Services.AddSingleton<EventPublisher>();

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<InventoryDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── Repositories ──────────────────────────────────────────────────────────────
builder.Services.AddScoped<IPartRepository, EfPartRepository>();
builder.Services.AddScoped<IReservationRepository, EfReservationRepository>();

// ── Use Cases ─────────────────────────────────────────────────────────────────
builder.Services.AddScoped<CreatePartUseCase>();
builder.Services.AddScoped<GetPartUseCase>();
builder.Services.AddScoped<ListPartsUseCase>();
builder.Services.AddScoped<UpdatePartUseCase>();
builder.Services.AddScoped<CheckAvailabilityUseCase>();
builder.Services.AddScoped<ReservePartsUseCase>();
builder.Services.AddScoped<ReleasePartsUseCase>();
builder.Services.AddScoped<ListLowStockPartsUseCase>();

// ── Kestrel: HTTP/2 on configurable port ─────────────────────────────────────
var grpcPort = int.TryParse(Environment.GetEnvironmentVariable("APP_GRPC_PORT"), out var p) ? p : 50051;
builder.WebHost.ConfigureKestrel(kestrel =>
{
    kestrel.ListenAnyIP(grpcPort, listenOptions =>
    {
        listenOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http2;
    });
});

var app = builder.Build();

// ── Auto-migrate ──────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();
    db.Database.EnsureCreated();
}

// ── gRPC service ──────────────────────────────────────────────────────────────
app.MapGrpcService<InventoryGrpcService>();

// ── Dapr middleware ───────────────────────────────────────────────────────────
// Unwraps CloudEvent envelope so minimal API handlers receive the plain payload
app.UseCloudEvents();

// ── Dapr pub/sub subscription handler ────────────────────────────────────────
app.MapSubscribeHandler();

// ── Event: workorder.parts-added ─────────────────────────────────────────────
// Payload: { work_order_id, part_id, quantity }
app.MapPost("/events/workorder-parts-added", async (
    WorkOrderPartsAddedEvent payload,
    InventoryDbContext db,
    EventPublisher publisher,
    ILogger<Program> logger,
    CancellationToken ct) =>
{
    logger.LogInformation(
        "Received workorder.parts-added: work_order={WorkOrderId}, part={PartId}, qty={Quantity}",
        payload.WorkOrderId, payload.PartId, payload.Quantity);

    if (string.IsNullOrWhiteSpace(payload.WorkOrderId) ||
        string.IsNullOrWhiteSpace(payload.PartId) ||
        payload.Quantity <= 0)
    {
        logger.LogWarning("workorder.parts-added: invalid payload, skipping.");
        return Results.Ok();
    }

    await using var transaction = await db.Database.BeginTransactionAsync(ct);
    try
    {
        if (!Guid.TryParse(payload.PartId, out var partId) ||
            !Guid.TryParse(payload.WorkOrderId, out var workOrderId))
        {
            logger.LogWarning("workorder.parts-added: invalid GUIDs in payload, skipping.");
            await transaction.RollbackAsync(ct);
            return Results.Ok();
        }

        var part = await db.Parts
            .FromSqlRaw("SELECT * FROM parts WHERE id = {0} FOR UPDATE", partId)
            .FirstOrDefaultAsync(ct);

        if (part is null)
        {
            logger.LogWarning("workorder.parts-added: part {PartId} not found.", partId);
            await transaction.RollbackAsync(ct);

            await publisher.PublishReservationFailedAsync(new ReservationFailedEvent
            {
                WorkOrderId = payload.WorkOrderId,
                PartId = payload.PartId,
                Reason = $"Part '{payload.PartId}' not found.",
            }, ct);

            return Results.Ok();
        }

        var available = part.QuantityInStock - part.QuantityReserved;
        if (available < payload.Quantity)
        {
            logger.LogWarning(
                "workorder.parts-added: insufficient stock for part {PartId} (available={Available}, requested={Requested}).",
                partId, available, payload.Quantity);

            await transaction.RollbackAsync(ct);

            await publisher.PublishReservationFailedAsync(new ReservationFailedEvent
            {
                WorkOrderId = payload.WorkOrderId,
                PartId = payload.PartId,
                Reason = $"Insufficient stock: {available} available, {payload.Quantity} requested.",
            }, ct);

            return Results.Ok();
        }

        var now = DateTime.UtcNow;

        // Check if an active reservation already exists for this work order so we
        // can append to it rather than create a duplicate.
        var reservation = await db.Reservations
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.WorkOrderId == workOrderId && r.Status == "active", ct);

        if (reservation is null)
        {
            reservation = new InventoryService.Domain.Reservation
            {
                Id = Guid.NewGuid(),
                WorkOrderId = workOrderId,
                Status = "active",
                CreatedAt = now,
            };
            db.Reservations.Add(reservation);
        }

        reservation.Items.Add(new InventoryService.Domain.ReservationItem
        {
            Id = Guid.NewGuid(),
            ReservationId = reservation.Id,
            PartId = partId,
            Quantity = payload.Quantity,
            UnitPriceCents = part.UnitPriceCents,
        });

        part.QuantityReserved += payload.Quantity;
        part.UpdatedAt = now;

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation(
            "workorder.parts-added: reserved {Quantity}x part {PartId} for work order {WorkOrderId}, reservation {ReservationId}.",
            payload.Quantity, partId, workOrderId, reservation.Id);

        await publisher.PublishPartsReservedAsync(new PartsReservedEvent
        {
            ReservationId = reservation.Id.ToString(),
            WorkOrderId = payload.WorkOrderId,
            Items =
            [
                new ReservedItemPayload
                {
                    PartId = payload.PartId,
                    Quantity = payload.Quantity,
                    UnitPriceCents = part.UnitPriceCents,
                }
            ],
        }, ct);

        return Results.Ok();
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync(ct);
        logger.LogError(ex, "workorder.parts-added: unexpected error for work order {WorkOrderId}.", payload.WorkOrderId);

        await publisher.PublishReservationFailedAsync(new ReservationFailedEvent
        {
            WorkOrderId = payload.WorkOrderId,
            PartId = payload.PartId,
            Reason = "Internal error during reservation.",
        }, ct);

        return Results.Ok(); // Return 200 so Dapr doesn't retry indefinitely
    }
}).WithTopic("car-erp-pubsub", "workorder.parts-added");

// ── Event: workorder.completed ────────────────────────────────────────────────
// Deduct reserved stock and mark reservation as "fulfilled". Emit low-stock if needed.
app.MapPost("/events/workorder-completed", async (
    WorkOrderCompletedEvent payload,
    InventoryDbContext db,
    EventPublisher publisher,
    ILogger<Program> logger,
    CancellationToken ct) =>
{
    logger.LogInformation(
        "Received workorder.completed: work_order={WorkOrderId}", payload.WorkOrderId);

    if (!Guid.TryParse(payload.WorkOrderId, out var workOrderId))
    {
        logger.LogWarning("workorder.completed: invalid work_order_id, skipping.");
        return Results.Ok();
    }

    await using var transaction = await db.Database.BeginTransactionAsync(ct);
    try
    {
        var reservation = await db.Reservations
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.WorkOrderId == workOrderId && r.Status == "active", ct);

        if (reservation is null)
        {
            logger.LogInformation(
                "workorder.completed: no active reservation found for work order {WorkOrderId}.", workOrderId);
            await transaction.RollbackAsync(ct);
            return Results.Ok();
        }

        var partIds = reservation.Items.Select(i => i.PartId).ToArray();
        var parts = await db.Parts
            .Where(p => partIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        var now = DateTime.UtcNow;
        var lowStockParts = new List<InventoryService.Domain.Part>();

        foreach (var item in reservation.Items)
        {
            if (!parts.TryGetValue(item.PartId, out var part))
                continue;

            // Deduct from actual stock and release reservation
            part.QuantityInStock = Math.Max(0, part.QuantityInStock - item.Quantity);
            part.QuantityReserved = Math.Max(0, part.QuantityReserved - item.Quantity);
            part.UpdatedAt = now;

            // Capture after deduction for low-stock check
            if ((part.QuantityInStock - part.QuantityReserved) <= part.ReorderLevel)
            {
                lowStockParts.Add(part);
            }
        }

        reservation.Status = "fulfilled";
        reservation.ReleasedAt = now;

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation(
            "workorder.completed: fulfilled reservation {ReservationId} for work order {WorkOrderId}.",
            reservation.Id, workOrderId);

        // Publish low-stock events outside the transaction
        foreach (var part in lowStockParts)
        {
            await publisher.PublishLowStockAsync(new LowStockEvent
            {
                PartId = part.Id.ToString(),
                Sku = part.Sku,
                Name = part.Name,
                QuantityInStock = part.QuantityInStock,
                QuantityReserved = part.QuantityReserved,
                ReorderLevel = part.ReorderLevel,
            }, ct);
        }

        return Results.Ok();
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync(ct);
        logger.LogError(ex, "workorder.completed: error for work order {WorkOrderId}.", payload.WorkOrderId);
        return Results.Ok();
    }
}).WithTopic("car-erp-pubsub", "workorder.completed");

// ── Event: workorder.cancelled ────────────────────────────────────────────────
// Release reserved parts back to available stock.
app.MapPost("/events/workorder-cancelled", async (
    WorkOrderCancelledEvent payload,
    InventoryDbContext db,
    ILogger<Program> logger,
    CancellationToken ct) =>
{
    logger.LogInformation(
        "Received workorder.cancelled: work_order={WorkOrderId}", payload.WorkOrderId);

    if (!Guid.TryParse(payload.WorkOrderId, out var workOrderId))
    {
        logger.LogWarning("workorder.cancelled: invalid work_order_id, skipping.");
        return Results.Ok();
    }

    await using var transaction = await db.Database.BeginTransactionAsync(ct);
    try
    {
        var reservation = await db.Reservations
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.WorkOrderId == workOrderId && r.Status == "active", ct);

        if (reservation is null)
        {
            logger.LogInformation(
                "workorder.cancelled: no active reservation found for work order {WorkOrderId}.", workOrderId);
            await transaction.RollbackAsync(ct);
            return Results.Ok();
        }

        var partIds = reservation.Items.Select(i => i.PartId).ToArray();
        var parts = await db.Parts
            .Where(p => partIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        var now = DateTime.UtcNow;

        foreach (var item in reservation.Items)
        {
            if (!parts.TryGetValue(item.PartId, out var part))
                continue;

            part.QuantityReserved = Math.Max(0, part.QuantityReserved - item.Quantity);
            part.UpdatedAt = now;
        }

        reservation.Status = "released";
        reservation.ReleasedAt = now;

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation(
            "workorder.cancelled: released reservation {ReservationId} for work order {WorkOrderId}.",
            reservation.Id, workOrderId);

        return Results.Ok();
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync(ct);
        logger.LogError(ex, "workorder.cancelled: error for work order {WorkOrderId}.", payload.WorkOrderId);
        return Results.Ok();
    }
}).WithTopic("car-erp-pubsub", "workorder.cancelled");

app.Run();
