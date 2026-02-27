# ── Build stage ───────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy proto files (needed by Grpc.Tools during build)
COPY proto/ ./proto/

# Copy project file and restore dependencies first (layer caching)
COPY services/inventory-service/InventoryService.csproj ./services/inventory-service/
WORKDIR /src/services/inventory-service
RUN dotnet restore

# Copy remaining source files
WORKDIR /src
COPY services/inventory-service/ ./services/inventory-service/

# Publish
WORKDIR /src/services/inventory-service
RUN dotnet publish -c Release -o /app/publish --no-restore

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy published output
COPY --from=build /app/publish .

# gRPC port
EXPOSE 50051

# Default gRPC port (can be overridden via APP_GRPC_PORT env var)
ENV APP_GRPC_PORT=50051

ENTRYPOINT ["dotnet", "InventoryService.dll"]
