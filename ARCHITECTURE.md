# Car Repair ERP — Architecture

A greenfield ERP for a car repair company demonstrating real microservice patterns: gRPC service-to-service communication via Dapr, async event-driven workflows via pub/sub, database-per-service isolation, polyglot services (Node.js/TS + C#/.NET 8), and a micro-frontend architecture with Module Federation.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│                                                                 │
│  Shell App (Next.js host)  :3000                                │
│  ┌───────────┐ ┌────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │ customers │ │ workorders │ │  inventory  │ │   billing   │  │
│  │  remote   │ │   remote   │ │   remote    │ │   remote    │  │
│  │  :3001    │ │   :3002    │ │   :3003     │ │   :3004     │  │
│  └─────┬─────┘ └─────┬──────┘ └──────┬──────┘ └──────┬──────┘  │
└────────┼─────────────┼───────────────┼────────────────┼─────────┘
         │             │               │                │
         └─────────────┴───────────────┴────────────────┘
                                 │ REST
                    ┌────────────▼────────────┐
                    │  BFF (Fastify)  :4000   │
                    │  REST → gRPC via Dapr   │
                    └────────────┬────────────┘
                                 │ gRPC via Dapr sidecars
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼                       ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ customer-svc    │  │ workorder-svc   │  │ inventory-svc   │  │ billing-svc     │
│ Node.js/TS      │  │ C# .NET 8       │  │ C# .NET 8       │  │ Node.js/TS      │
│ Fastify+Prisma  │  │ ASP.NET Core    │  │ ASP.NET Core    │  │ @grpc/grpc-js   │
│ PostgreSQL :5432│  │ EF Core+Npgsql  │  │ EF Core+Npgsql  │  │ Mongoose        │
└─────────────────┘  │ PostgreSQL :5433│  │ PostgreSQL :5434│  │ MongoDB  :27017 │
                     └─────────────────┘  └─────────────────┘  └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  Redis  :6379           │  pub/sub + state store
                    │  Dapr placement  :50006 │  actor placement
                    │  Zipkin  :9411          │  distributed tracing
                    └─────────────────────────┘

                         stdout (JSON logs)
                                 │
                    ┌────────────▼────────────┐
                    │  Filebeat               │  Docker log shipper
                    │  Logstash  :5044        │  JSON parse + routing
                    │  Elasticsearch  :9200   │  log storage & search
                    │  Kibana  :5601          │  log exploration UI
                    │  Grafana  :3333         │  dashboards
                    └─────────────────────────┘
```

---

## Backend Services

| Service | Language | DB | gRPC port (internal) | Dapr app-id |
|---|---|---|---|---|
| **customer-service** | Node.js/TS — Fastify + Prisma | PostgreSQL | 50051 | `customer-service` |
| **workorder-service** | C# .NET 8 — ASP.NET Core gRPC + EF Core | PostgreSQL | 50051 | `workorder-service` |
| **inventory-service** | C# .NET 8 — ASP.NET Core gRPC + EF Core | PostgreSQL | 50051 | `inventory-service` |
| **billing-service** | Node.js/TS — `@grpc/grpc-js` + Mongoose | MongoDB | 50051 | `billing-service` |
| **bff** | Node.js/TS — Fastify | — | HTTP 4000 | `bff` |

Each service runs with a Dapr sidecar (`network_mode: "service:<app>"`) matching Kubernetes pod networking. The BFF connects to its sidecar on `localhost:50001` and sets the `dapr-app-id` metadata header to route gRPC calls to the target service.

### Correlation IDs

The BFF generates a `correlationId` (`crypto.randomUUID()`) on every inbound request (or reads an existing `x-correlation-id` header). This ID is:

- Attached to all outgoing gRPC calls as metadata: `x-correlation-id`
- Embedded in all pub/sub event payloads
- Included in every structured log line emitted by any service

This allows a single user action to be traced end-to-end across BFF → microservices → async events using a single search in Kibana or Grafana.

### Structured Logging

All services emit newline-delimited JSON to stdout:

```json
{
  "@timestamp": "2026-02-27T10:00:00.000Z",
  "level": "info",
  "service": "customer-service",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "action": "createCustomer.completed",
  "message": "createCustomer completed"
}
```

**Node.js services** (`customer-service`, `billing-service`) use **pino**:
- `src/logger.ts` exports a `logger` instance and a `withServiceLogging<T>()` proxy
- The proxy wraps the entire gRPC handler map at registration time — no per-handler boilerplate
- On each call: extracts `x-correlation-id` from gRPC metadata, creates a child logger with `{ correlationId }`, logs `{action}.called` / `{action}.completed` / `{action}.failed`

**C# services** (`workorder-service`, `inventory-service`) use **Serilog** with `CompactJsonFormatter`:
- `Infrastructure/LoggingInterceptor.cs` implements `Interceptor.UnaryServerHandler`
- Registered as a gRPC server interceptor in `Program.cs`
- Pushes `CorrelationId` and `Action` onto `Serilog.Context.LogContext` (backed by `AsyncLocal<T>`) so all nested log calls (EF Core, event publishers) automatically inherit these properties

### BFF REST API

Interactive documentation is available at **http://localhost:4000/docs** (Swagger UI). The OpenAPI 3.0 spec is served at `/docs/json`.

```
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id
DELETE /api/customers/:id
POST   /api/customers/:id/vehicles

GET    /api/work-orders
POST   /api/work-orders
GET    /api/work-orders/:id          ← aggregated: WO + customer + vehicle
PUT    /api/work-orders/:id/status
POST   /api/work-orders/:id/line-items
POST   /api/work-orders/:id/labor

GET    /api/parts
POST   /api/parts
GET    /api/parts/:id
PUT    /api/parts/:id
GET    /api/parts/low-stock

GET    /api/invoices
GET    /api/invoices/:id             ← aggregated: invoice + customer info
PUT    /api/invoices/:id/status

GET    /api/dashboard                ← aggregated stats from all services
```

---

## Clean Architecture

Every backend service is structured in four layers. Dependencies always point inward — outer layers depend on inner layers, never the reverse.

```
Domain          ← pure business rules, no framework dependencies
   ▲
Application     ← use cases / command handlers, orchestrate domain objects
   ▲
Infrastructure  ← Prisma / EF Core / Mongoose repos, Dapr publisher
   ▲
Presentation    ← thin gRPC handlers that call use cases and return responses
```

### Layer responsibilities

| Layer | Contents | Allowed dependencies |
|---|---|---|
| **Domain** | Entities, value objects, repository interfaces, event publisher interface | None |
| **Application** | Use cases, DTOs | Domain only |
| **Infrastructure** | DB repositories (Prisma / EF Core / Mongoose), Dapr event publisher | Application, Domain |
| **Presentation** | gRPC service handlers | Application |

### Service implementations

**Node.js services** (`customer-service`, `billing-service`, `bff`):

```
src/
  domain/
    entities/           # Pure TS classes — validation rules, business methods
    repositories/       # IXxxRepository interfaces
    events/             # IEventPublisher interface
  application/
    use-cases/          # One file per use case (CreateCustomerUseCase, etc.)
  infrastructure/
    repositories/       # Prisma / Mongoose implementations
    events/             # DaprEventPublisher
    db/                 # DB connection setup
  presentation/
    grpc/               # Thin handler — calls use case, maps proto ↔ domain types
  index.ts              # DI wiring: construct repos → use cases → handler
```

**C# services** (`workorder-service`, `inventory-service`):

```
Domain/
  Entities/             # EF Core entities + domain logic (RecalculateTotal, state machine)
  Repositories/         # IXxxRepository interfaces (new)
Application/
  UseCases/             # One class per use case (new)
Infrastructure/
  Repositories/         # EF Core implementations (new)
  Persistence/          # DbContext, migrations
  Events/               # DaprEventPublisher
Presentation/
  GrpcServices/         # Thin ASP.NET Core gRPC service — delegates to use cases
```

**BFF** — gateway, so clean architecture is applied as a service interface layer:

```
src/
  application/
    services/           # ICustomerService, IWorkOrderService, IInventoryService, IBillingService
  infrastructure/
    grpc/               # GrpcCustomerService, … — implement interfaces, wrap gRPC clients
  routes/               # Fastify routes — depend only on interfaces (injected via plugin opts)
  clients/              # Proto-generated gRPC client functions (called by infra layer)
```

---

## Testing

Each service has a self-contained unit-test suite. Tests exercise business logic in isolation — all external dependencies (databases, gRPC, Dapr) are mocked.

### Node.js services — Jest + ts-jest

| Service | Tests | What's covered |
|---|---|---|
| `customer-service` | 18 | Entity validation, all customer + vehicle use cases |
| `billing-service` | 19 | Invoice status transitions, tax calculations, all use cases |
| `bff` | 31 | All route handlers via Fastify `inject()`, gRPC error → HTTP status mapping |

Run:

```bash
cd services/customer-service && npm test
cd services/billing-service  && npm test
cd bff                        && npm test
```

BFF route tests use Fastify's built-in `inject()` API with stub service implementations:

```ts
const service: Partial<ICustomerService> = {
  listCustomers: jest.fn().mockResolvedValue(mockListResponse),
};
const app = buildApp(service);        // registers schemas + plugin with injected stub
const res = await app.inject({ method: 'GET', url: '/api/customers' });
expect(res.statusCode).toBe(200);
```

### C# services — xUnit + Moq + FluentAssertions

| Service | Tests | What's covered |
|---|---|---|
| `workorder-service` | 17 | Domain state machine, all use cases with Moq'd repositories |
| `inventory-service` | 10 | AvailableQuantity, IsLowStock, all use cases |

Run with a local `dotnet` SDK:

```bash
cd services/workorder-service && dotnet test
cd services/inventory-service && dotnet test
```

Run via the official SDK container (no local `dotnet` required):

```bash
docker run --rm \
  -v "$(pwd)/services/workorder-service:/src" \
  -w /src \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet test --logger "console;verbosity=normal"
```

---

## Event-Driven Workflow (Dapr pub/sub via Redis Streams)

```
Customer created
       │
       ▼
Work order created ──────────────────────────────────────────────┐
       │                                                         │
       │ pub: workorder.parts-added                              │
       ▼                                                         │
Inventory reserves parts                                         │
       │ pub: inventory.parts-reserved                           │
       │      inventory.reservation-failed                       │
       ▼                                                         │
Work order COMPLETED ◄───────────────────────────────────────────┘
       │
       ├── pub: workorder.completed
       │
       ├──► Inventory deducts reserved stock
       │    pub: inventory.low-stock  (if threshold crossed)
       │
       └──► Billing creates invoice
            pub: invoice.created
                   │
                   └──► Work order status → INVOICED
```

**Event topics:** `customer.created`, `customer.updated`, `workorder.created`, `workorder.parts-added`, `workorder.completed`, `workorder.cancelled`, `inventory.parts-reserved`, `inventory.reservation-failed`, `inventory.low-stock`, `invoice.created`, `invoice.paid`

---

## Micro-Frontend Architecture (Module Federation)

The frontend is a **pnpm monorepo** (`frontend/`) with 5 independently deployable Next.js apps and 3 shared packages. The shell is the Module Federation **host**; the 4 domain apps are **remotes**.

### Apps

| App | Port | Role | Exposed modules |
|---|---|---|---|
| **shell** | 3000 | Host — layout, nav, dashboard, composes remotes | — |
| **customers** | 3001 | Remote — customer domain | `./pages/CustomerList`, `./pages/CustomerDetail`, `./pages/CustomerNew` |
| **workorders** | 3002 | Remote — work order domain | `./pages/WorkOrderList`, `./pages/WorkOrderDetail`, `./pages/WorkOrderNew` |
| **inventory** | 3003 | Remote — inventory domain | `./pages/PartsList`, `./pages/PartDetail` |
| **billing** | 3004 | Remote — billing domain | `./pages/InvoiceList`, `./pages/InvoiceDetail` |

### Shared Packages

| Package | Purpose |
|---|---|
| `@car-erp/shared-types` | TypeScript interfaces for cross-remote contracts (event payloads, shared props) |
| `@car-erp/shared-ui` | Common UI primitives — shadcn/ui wrappers, layout components |
| `@car-erp/event-bus` | Typed CustomEvent bus for cross-remote communication |

### Cross-remote communication

Remotes never import from each other. They communicate through the shared event bus:

```ts
// customers remote emits
eventBus.emit('customer:selected', { customerId: '...' })

// workorders remote listens
eventBus.on('customer:selected', ({ customerId }) => { /* auto-fill customer */ })
```

### Module Federation shared singletons

All 5 apps declare the following as `singleton` in their MF `shared` config to ensure one instance at runtime:

- `react` / `react-dom` — prevents duplicate React context (hooks break otherwise)
- `@tanstack/react-query` — remotes share the shell's `QueryClient`
- `@car-erp/shared-types`, `@car-erp/shared-ui`, `@car-erp/event-bus`

The shell additionally marks `react`, `react-dom`, and `@tanstack/react-query` as `eager: true` so they are available synchronously before any remote chunk loads.

### Remote URL resolution (runtime, not build-time)

The shell resolves remote URLs at **browser runtime**, not at webpack compile time. This makes each remote independently deployable without rebuilding the shell.

**How it works:**

1. `_document.tsx` is server-rendered on every request. It reads plain `process.env` vars (`CUSTOMERS_URL`, `WORKORDERS_URL`, `INVENTORY_URL`, `BILLING_URL`) from the running Node.js process and injects them into the HTML as an inline `<script>` before any bundle executes:
   ```html
   <script>window.__REMOTE_URLS__ = {"customers":"https://...","workorders":"https://..."};</script>
   ```
2. `next.config.mjs` uses the `promise new Promise(...)` Module Federation syntax for each remote. The promise dynamically creates a `<script>` tag pointing at `window.__REMOTE_URLS__.<remote>/_next/static/chunks/remoteEntry.js` and resolves when it loads.
3. To point the shell at a different deployment of any remote, set the corresponding env var and restart the shell server — **no rebuild required**.

```
CUSTOMERS_URL=https://customers.example.com   # deployed separately
WORKORDERS_URL=https://workorders.example.com
INVENTORY_URL=https://inventory.example.com
BILLING_URL=https://billing.example.com
```

Defaults to `http://localhost:300x` when env vars are not set.

### Key constraints

- All apps use **Pages Router** — `@module-federation/nextjs-mf` does not support App Router
- All apps require `NEXT_PRIVATE_LOCAL_WEBPACK=true` — Next.js 14 must use the workspace-hoisted webpack
- Shell server build uses **webpack externals** for federated module paths (e.g. `customers/*`) so the server compiler doesn't try to resolve them; all remote imports use `ssr: false`

---

## Infrastructure (Docker Compose)

| Container | Image | Purpose |
|---|---|---|
| `redis` | redis:7-alpine | Dapr pub/sub broker + state store |
| `placement` | daprio/dapr | Dapr actor placement service |
| `scheduler` | daprio/dapr | Dapr scheduler |
| `zipkin` | openzipkin/zipkin | Distributed tracing UI |
| `customer-db` | postgres:16-alpine | Customer service database |
| `workorder-db` | postgres:16-alpine | Work order service database |
| `inventory-db` | postgres:16-alpine | Inventory service database |
| `billing-db` | mongo:7 | Billing service database |
| `elasticsearch` | elasticsearch:8.13.4 | Log storage and full-text search |
| `logstash` | logstash:8.13.4 | Parses JSON log lines, routes to Elasticsearch |
| `kibana` | kibana:8.13.4 | Log exploration and ad-hoc querying |
| `filebeat` | elastic/filebeat:8.13.4 | Autodiscovers Docker containers, ships stdout to Logstash |
| `grafana` | grafana/grafana:10.4.3 | Pre-provisioned dashboards (log volume, error rate, top actions) |

Each backend service container has a paired `*-dapr` sidecar container running `daprd` with `network_mode: "service:<app>"`.

Logs are stored under the rolling index pattern `car-erp-logs-YYYY.MM.dd`. Grafana is pre-provisioned with an Elasticsearch datasource and a **Car ERP** dashboard showing log volume by service, error count over time, top actions, and a correlation ID lookup variable.

---

## Project Structure

```
car-erp/
├── docker-compose.yml
├── Makefile
├── ARCHITECTURE.md
├── dapr/
│   ├── components/
│   │   ├── pubsub.yaml          # Redis Streams pub/sub
│   │   └── statestore.yaml      # Redis state store
│   └── configuration/
│       └── appconfig.yaml       # Zipkin tracing config
├── proto/                       # Shared gRPC contracts (.proto files)
│   ├── common/v1/
│   ├── customer/v1/
│   ├── workorder/v1/
│   ├── inventory/v1/
│   └── billing/v1/
├── observability/
│   ├── logstash/
│   │   ├── pipeline/logstash.conf   # JSON parse + Elasticsearch output
│   │   └── config/logstash.yml      # http.host, monitoring settings
│   ├── filebeat/
│   │   └── filebeat.yml             # Docker autodiscover → Logstash
│   └── grafana/
│       └── provisioning/
│           ├── datasources/elasticsearch.yml
│           └── dashboards/          # Pre-built Car ERP dashboard JSON
├── services/
│   ├── customer-service/        # Node.js/TS — Fastify + Prisma + PostgreSQL
│   │   └── src/logger.ts        # pino logger + withServiceLogging() proxy
│   ├── workorder-service/       # C# .NET 8 — ASP.NET Core gRPC + EF Core
│   │   └── Infrastructure/
│   │       └── LoggingInterceptor.cs  # gRPC server interceptor (Serilog)
│   ├── inventory-service/       # C# .NET 8 — ASP.NET Core gRPC + EF Core
│   │   └── Infrastructure/
│   │       └── LoggingInterceptor.cs  # gRPC server interceptor (Serilog)
│   └── billing-service/         # Node.js/TS — @grpc/grpc-js + Mongoose + MongoDB
│       └── src/logger.ts        # pino logger + withServiceLogging() proxy
├── bff/                         # Node.js/TS — Fastify REST → gRPC via Dapr
│   └── src/
│       ├── application/
│       │   └── services/        # ICustomerService, IWorkOrderService, IInventoryService, IBillingService
│       ├── infrastructure/
│       │   └── grpc/            # GrpcCustomerService, … (implement service interfaces)
│       ├── routes/              # customers.ts, workorders.ts, inventory.ts, billing.ts, dashboard.ts
│       ├── clients/             # Proto-generated gRPC client functions (via Dapr sidecar)
│       ├── schemas/             # Shared JSON schemas for request/response validation
│       └── generated/           # Proto-generated TypeScript types
├── frontend/
│   ├── packages/
│   │   ├── shared-types/        # @car-erp/shared-types
│   │   ├── shared-ui/           # @car-erp/shared-ui
│   │   └── event-bus/           # @car-erp/event-bus
│   └── apps/
│       ├── shell/               # MF host — layout, sidebar, dashboard
│       ├── customers/           # MF remote — customer list/detail/new + vehicles
│       ├── workorders/          # MF remote — work order list/detail/new
│       ├── inventory/           # MF remote — parts catalog + stock indicators
│       └── billing/             # MF remote — invoice list/detail
└── scripts/
    ├── proto-gen.sh             # Generates TS + C# types from .proto files
    └── seed-data.sh             # Loads demo data via BFF API
```

---

## Local Development

```bash
# Start all backend services + infrastructure
docker compose up -d

# Start all micro-frontends (each in its own terminal)
cd frontend
pnpm --filter @car-erp/customers dev   # :3001
pnpm --filter @car-erp/workorders dev  # :3002
pnpm --filter @car-erp/inventory dev   # :3003
pnpm --filter @car-erp/billing dev     # :3004
pnpm --filter @car-erp/shell dev       # :3000  ← open this in browser

# Seed demo data
./scripts/seed-data.sh
```

### URLs

| Service | URL |
|---|---|
| Shell (main UI) | http://localhost:3000 |
| BFF REST API | http://localhost:4000 |
| BFF Swagger UI | http://localhost:4000/docs |
| Zipkin tracing | http://localhost:9411 |
| Kibana (log search) | http://localhost:5601 |
| Grafana (dashboards) | http://localhost:3333 |
| Elasticsearch | http://localhost:9200 |
| Customers remote (standalone) | http://localhost:3001 |
| Work Orders remote (standalone) | http://localhost:3002 |
| Inventory remote (standalone) | http://localhost:3003 |
| Billing remote (standalone) | http://localhost:3004 |
