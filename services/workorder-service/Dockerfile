# ─── Build Stage ───────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy proto files first (build context is repo root)
COPY proto/ /src/proto/

# Copy project file and restore dependencies
COPY services/workorder-service/WorkOrderService.csproj /src/services/workorder-service/
WORKDIR /src/services/workorder-service
RUN dotnet restore WorkOrderService.csproj

# Copy remaining source files
COPY services/workorder-service/ /src/services/workorder-service/

# Build and publish
RUN dotnet publish WorkOrderService.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

# ─── Runtime Stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --ingroup appgroup appuser

COPY --from=build /app/publish .

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 50051
EXPOSE 8080

ENV ASPNETCORE_ENVIRONMENT=Production
ENV APP_GRPC_PORT=50051

ENTRYPOINT ["dotnet", "WorkOrderService.dll"]
