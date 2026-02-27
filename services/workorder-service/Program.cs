using Dapr;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Formatting.Compact;
using WorkOrderService.Events;
using WorkOrderService.Infrastructure;
using WorkOrderService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, lc) => lc
    .Enrich.FromLogContext()
    .Enrich.WithProperty("service", "workorder-service")
    .WriteTo.Console(new CompactJsonFormatter()));

// ─── Configuration ─────────────────────────────────────────────────────────────

var grpcPort = int.TryParse(
    builder.Configuration["APP_GRPC_PORT"] ?? Environment.GetEnvironmentVariable("APP_GRPC_PORT"),
    out var parsedPort) ? parsedPort : 50051;

// Configure Kestrel to listen on the configured gRPC port with HTTP/2
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(grpcPort, listenOptions =>
    {
        listenOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http2;
    });
    // Also expose HTTP/1.1 on port 8080 for Dapr pub/sub HTTP endpoints
    options.ListenAnyIP(8080, listenOptions =>
    {
        listenOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1;
    });
});

// ─── Services ──────────────────────────────────────────────────────────────────

builder.Services.AddSingleton<WorkOrderService.Infrastructure.LoggingInterceptor>();
builder.Services.AddGrpc(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.Interceptors.Add<WorkOrderService.Infrastructure.LoggingInterceptor>();
});

builder.Services.AddDaprClient();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured");

builder.Services.AddDbContext<WorkOrderDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null);
        npgsqlOptions.CommandTimeout(30);
    }));

builder.Services.AddScoped<EventPublisher>();

// ─── Build ──────────────────────────────────────────────────────────────────────

var app = builder.Build();

// ─── Run Migrations ────────────────────────────────────────────────────────────

using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<WorkOrderDbContext>();
        logger.LogInformation("Creating database schema...");
        await db.Database.EnsureCreatedAsync();
        logger.LogInformation("Database schema ready.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while applying database migrations.");
        throw;
    }
}

// ─── Middleware Pipeline ───────────────────────────────────────────────────────

app.UseRouting();
app.UseCloudEvents(); // Required for Dapr pub/sub to unwrap CloudEvents envelopes

// ─── gRPC Service ──────────────────────────────────────────────────────────────

app.MapGrpcService<WorkOrderGrpcService>();

// ─── Dapr Subscribe Handler ────────────────────────────────────────────────────

app.MapSubscribeHandler(); // Exposes GET /dapr/subscribe for Dapr to discover topics

// ─── Event Subscriptions (Dapr Pub/Sub via HTTP) ───────────────────────────────

app.MapPost("/events/inventory-parts-reserved",
    async (
        [FromBody] InventoryPartsReservedEvent evt,
        WorkOrderDbContext db,
        ILogger<EventPublisher> logger,
        CancellationToken ct) =>
        await EventSubscriber.HandleInventoryPartsReserved(evt, db, logger, ct))
    .WithTopic("car-erp-pubsub", "inventory.parts-reserved");

app.MapPost("/events/inventory-reservation-failed",
    async (
        [FromBody] InventoryReservationFailedEvent evt,
        WorkOrderDbContext db,
        ILogger<EventPublisher> logger,
        CancellationToken ct) =>
        await EventSubscriber.HandleInventoryReservationFailed(evt, db, logger, ct))
    .WithTopic("car-erp-pubsub", "inventory.reservation-failed");

app.MapPost("/events/invoice-created",
    async (
        [FromBody] InvoiceCreatedEvent evt,
        WorkOrderDbContext db,
        ILogger<EventPublisher> logger,
        CancellationToken ct) =>
        await EventSubscriber.HandleInvoiceCreated(evt, db, logger, ct))
    .WithTopic("car-erp-pubsub", "invoice.created");

// ─── Health Check ──────────────────────────────────────────────────────────────

app.MapGet("/healthz", () => Results.Ok(new { status = "healthy", service = "workorder-service" }));

app.Logger.LogInformation("WorkOrder Service starting on gRPC port {GrpcPort}", grpcPort);

app.Run();
