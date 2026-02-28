# Dapr Car ERP

A greenfield ERP for a car repair shop built to demonstrate real microservice patterns: gRPC service-to-service communication via Dapr, async event-driven workflows via pub/sub, database-per-service isolation, polyglot services (Node.js/TS + C#/.NET 8), micro-frontend architecture with Module Federation, and centralised structured logging with correlation ID tracing across all services.

---

## Architecture overview

```
Browser
  └── Shell (Next.js host :3000)
        ├── customers remote  :3001
        ├── workorders remote :3002
        ├── inventory remote  :3003
        └── billing remote    :3004
              │ REST
        BFF (Fastify :4000)
              │ gRPC via Dapr sidecars
        ┌─────┴──────────────────────┐
   customer-svc   workorder-svc   inventory-svc   billing-svc
   Node/Prisma    C#/.NET 8       C#/.NET 8        Node/Mongoose
   PostgreSQL     PostgreSQL      PostgreSQL        MongoDB
        │
   Redis (pub/sub + state) · Dapr · Zipkin
        │
   Filebeat → Logstash → Elasticsearch
                              └── Kibana · Grafana
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full breakdown including event flows, Module Federation singletons, correlation ID propagation, and structured logging design.

See [CLAUDE.md](./CLAUDE.md) for the coding and architecture principles followed in this project — bounded context rules, when to apply Strategy / Actor / Saga / CQRS, concurrency guidelines, testing conventions, and a pre-PR checklist.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Docker + Docker Compose | v2+ |
| Node.js | 18+ |
| pnpm | 9+ |

---

## Starting the backend

```bash
docker compose up -d
```

This starts all backend services, databases, Dapr sidecars, Redis, Zipkin, and the full ELK + Grafana observability stack. All services are healthy within ~30 seconds.

To follow logs from all services:

```bash
docker compose logs -f customer-service workorder-service inventory-service billing-service bff
```

To stop everything:

```bash
docker compose down
```

---

## Starting the frontend

The frontend is a pnpm monorepo. Start each app in a separate terminal (remotes first, shell last):

```bash
cd frontend

pnpm --filter @car-erp/customers dev   # :3001
pnpm --filter @car-erp/workorders dev  # :3002
pnpm --filter @car-erp/inventory dev   # :3003
pnpm --filter @car-erp/billing dev     # :3004
pnpm --filter @car-erp/shell dev       # :3000 ← open this in the browser
```

Or install dependencies if running for the first time:

```bash
cd frontend && pnpm install
```

---

## Seeding demo data

```bash
./scripts/seed-data.sh
```

Creates sample customers, vehicles, work orders, and inventory parts via the BFF API.

---

## Running the tests

Each service has a self-contained unit-test suite. Tests run against mocked dependencies — no running infrastructure required.

### Node.js services (Jest + ts-jest)

```bash
cd services/customer-service && npm test   # 18 tests
cd services/billing-service  && npm test   # 19 tests
cd bff                        && npm test   # 31 tests
```

### C# services (xUnit + Moq + FluentAssertions)

If `dotnet` is installed locally:

```bash
cd services/workorder-service && dotnet test   # 17 tests
cd services/inventory-service && dotnet test   # 10 tests
```

Without a local `dotnet` installation, run via the official SDK container:

```bash
docker run --rm \
  -v "$(pwd)/services/workorder-service:/src" \
  -w /src \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet test --logger "console;verbosity=normal"

docker run --rm \
  -v "$(pwd)/services/inventory-service:/src" \
  -w /src \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet test --logger "console;verbosity=normal"
```

### Run all Node.js tests at once

```bash
(cd services/customer-service && npm test) && \
(cd services/billing-service  && npm test) && \
(cd bff                        && npm test)
```

---

## URLs

### Application

| Service | URL |
|---------|-----|
| **Main UI (shell)** | http://localhost:3000 |
| BFF REST API | http://localhost:4000 |
| BFF Swagger UI | http://localhost:4000/docs |
| Customers remote (standalone) | http://localhost:3001 |
| Work Orders remote (standalone) | http://localhost:3002 |
| Inventory remote (standalone) | http://localhost:3003 |
| Billing remote (standalone) | http://localhost:3004 |

### Observability

| Service | URL |
|---------|-----|
| Kibana (log search) | http://localhost:5601 |
| Grafana (dashboards) | http://localhost:3333 |
| Zipkin (distributed tracing) | http://localhost:9411 |
| Elasticsearch | http://localhost:9200 |

Grafana default credentials: `admin` / `admin`.

To trace a request end-to-end, copy the `x-correlation-id` response header from any BFF call and search for it in Kibana (`car-erp-logs-*` index) or use the Correlation ID variable in the Grafana dashboard.

---

## BFF REST API

```
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id
DELETE /api/customers/:id
POST   /api/customers/:id/vehicles

GET    /api/work-orders
POST   /api/work-orders
GET    /api/work-orders/:id
PUT    /api/work-orders/:id/status
POST   /api/work-orders/:id/line-items
POST   /api/work-orders/:id/labor

GET    /api/parts
POST   /api/parts
GET    /api/parts/:id
PUT    /api/parts/:id
GET    /api/parts/low-stock

GET    /api/invoices
GET    /api/invoices/:id
PUT    /api/invoices/:id/status

GET    /api/dashboard
```

---

## Deploying remotes independently

The shell resolves remote URLs at **browser runtime** — no rebuild required when a remote is redeployed. Set these env vars before starting the shell and restart it:

```bash
CUSTOMERS_URL=https://customers.example.com
WORKORDERS_URL=https://workorders.example.com
INVENTORY_URL=https://inventory.example.com
BILLING_URL=https://billing.example.com
```

Defaults to `http://localhost:300x` when not set. See `frontend/apps/shell/.env.local.example`.

---

## Project structure

```
.
├── docker-compose.yml
├── Makefile
├── ARCHITECTURE.md
├── dapr/                    # Dapr component config (pub/sub, state store, tracing)
├── proto/                   # gRPC .proto contracts for all services
├── observability/           # Logstash, Filebeat, and Grafana provisioning config
├── scripts/
│   ├── proto-gen.sh         # Regenerate TS + C# types from .proto files
│   └── seed-data.sh         # Load demo data via BFF
├── services/
│   ├── customer-service/    # Node.js/TS · Fastify · Prisma · PostgreSQL
│   ├── workorder-service/   # C# .NET 8 · ASP.NET Core gRPC · EF Core · PostgreSQL
│   ├── inventory-service/   # C# .NET 8 · ASP.NET Core gRPC · EF Core · PostgreSQL
│   └── billing-service/     # Node.js/TS · @grpc/grpc-js · Mongoose · MongoDB
├── bff/                     # Node.js/TS · Fastify · REST → gRPC via Dapr
└── frontend/
    ├── packages/
    │   ├── shared-types/    # Cross-remote TypeScript interfaces
    │   ├── shared-ui/       # Shared React components (StatusBadge, EmptyState, …)
    │   └── event-bus/       # Typed CustomEvent bus for cross-remote communication
    └── apps/
        ├── shell/           # Module Federation host · layout · sidebar · dashboard
        ├── customers/       # Remote · customer list / detail / new · vehicles
        ├── workorders/      # Remote · work order list / detail / new
        ├── inventory/       # Remote · parts catalog · stock indicators
        └── billing/         # Remote · invoice list / detail
```
