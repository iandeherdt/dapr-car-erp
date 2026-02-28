# Claude — Software Architect Spec

This file governs how Claude reasons, designs, and codes in this repository.
It is intentionally opinionated. Read it before touching any service.

---

## Core philosophy

> "Any fool can write code that a computer can understand.
>  Good programmers write code that humans can understand."
> — Martin Fowler

**Pragmatism over dogma.** Patterns are vocabulary, not religion.
Apply a pattern when it removes real pain. Never apply it to demonstrate knowledge.

The three questions before every design decision:

1. Does this make the code easier to change?
2. Does this make the intent clearer to the next developer?
3. Will this still make sense in six months under production pressure?

If the answer to all three is not "yes", find a simpler approach.

---

## Architecture

### Microservices and bounded contexts

Every service owns its domain completely. The boundary is non-negotiable.

- **No shared databases.** If two services query the same table, the boundary is wrong.
- **No shared domain models across service boundaries.** Each service defines its own types
  even if they look similar. Duplication across boundaries is cheaper than coupling.
- **Communicate via contracts** — proto files, event schemas, or HTTP DTOs.
  Never import domain entities from another service.
- **Choreography over orchestration** for long-running workflows.
  Services react to events; no central coordinator knows the full flow.
- **Eventual consistency is the default** across service boundaries.
  Design UIs and use cases to tolerate it. Fight for strong consistency only
  where money, inventory counts, or audit trails demand it.

### Layered architecture inside a service

```
Domain          ← entities, value objects, repository interfaces, domain events
Application     ← use cases / command handlers (orchestrate domain objects only)
Infrastructure  ← DB repos, message publishers, external clients
Presentation    ← thin handlers (gRPC / HTTP) — validate input, call use case, map output
```

Rules:
- Domain layer has zero framework dependencies. It is plain TypeScript or plain C#.
- Use cases contain business logic. Handlers contain none.
- Infrastructure implements interfaces defined in Domain. Domain never imports infrastructure.
- If a use case needs to call another use case, extract a domain service — do not chain use cases.

### When to break the layers

A CRUD endpoint with no business rules does not need a use case.
A read endpoint that queries a view model can bypass the domain entirely (CQRS read side).
Call out the shortcut with a comment; don't pretend it doesn't exist.

---

## Design patterns — use them when they earn their keep

### Strategy

Use when behaviour varies by a dimension that is likely to grow.

```ts
// Good: payment methods will grow
interface PaymentStrategy { charge(amount: Money): Promise<Receipt>; }
class StripePayment implements PaymentStrategy { ... }
class BankTransfer  implements PaymentStrategy { ... }
```

Do **not** introduce Strategy for two fixed variants you are certain will never change.
An if/else is simpler and honest.

### Actor / message-passing

Use for shared mutable state accessed concurrently.
Dapr's virtual actors are already available in this stack — use them for:
- Per-work-order state machines that receive concurrent status updates
- Inventory reservation ledgers where over-selling is not acceptable
- Any aggregate that is frequently written to by multiple concurrent callers

Actors enforce single-threaded access per instance. This eliminates optimistic-lock retry loops
and simplifies the state machine code dramatically.

### Repository

Always. Every aggregate root gets a repository interface in the Domain layer.
The concrete implementation lives in Infrastructure and is injected at the composition root.
Never let a use case import a Prisma client, DbContext, or Mongoose model directly.

### Factory

Use a static factory method on the entity when construction involves validation or invariants:

```ts
// Good
const wo = WorkOrder.create({ customerId, vehicleId, description });
// Never
const wo = new WorkOrder(); wo.customerId = ...; wo.save();
```

### Domain Events

Prefer domain events over direct calls for side effects that cross use-case boundaries.
Publish from inside the use case after the aggregate is saved. Keep the handler thin.

```ts
// use case
const workOrder = await repo.save(wo);
await publisher.publish('workorder.completed', { workOrderId: workOrder.id });
// subscriber (different use case / service) handles its own concern
```

### Saga / Process Manager

Use when a multi-step workflow spans multiple services and requires compensation on failure.
Implement as an event-driven state machine, not a single orchestrator class.
In this stack, a Dapr workflow or a lightweight state store-backed process manager is preferred.

### CQRS (pragmatic, not full event sourcing)

Separate the read model from the write model when:
- The query shape diverges significantly from the aggregate shape
- A read endpoint joins data from multiple aggregates for display purposes

Do **not** introduce a full event-sourced write side unless the business explicitly
needs a complete audit trail or temporal queries. Operational complexity is very high.

---

## Patterns to avoid (without a compelling reason)

| Pattern | Why it hurts here |
|---|---|
| Service Locator | Hides dependencies; makes testing painful |
| Singleton (mutable global state) | Concurrency bugs; hard to test |
| Anemic domain model | Business rules scatter into services/use-cases; domain becomes a DTO bag |
| God class / God service | Always a sign the bounded context is wrong |
| Deep inheritance hierarchies | Favour composition; inherit only for genuine is-a relationships |
| Over-abstracted repositories (generic `IRepository<T>`) | Leaks query knowledge into domain; use named query methods |

---

## Concurrency

- **Actor pattern** (Dapr Virtual Actors) for per-aggregate concurrency isolation.
- **Optimistic concurrency** (EF Core `RowVersion`, Mongoose `__v`) where actors are overkill
  but lost updates must be prevented.
- **Idempotency keys** on all mutation endpoints and event handlers.
  A message delivered twice must produce the same result as once.
- **No long transactions** spanning multiple aggregates.
  Use a saga with compensating transactions instead.
- **Never share a mutable variable across async boundaries** in Node.js services.
  `AsyncLocalStorage` for request-scoped context; never a module-level mutable.

---

## Testing

### Rules

1. **Bug fix → write a failing test first.** The test must reproduce the bug before the fix.
2. **Complex feature → test-first or at minimum test-alongside.** Never ship logic without coverage.
3. **Trivial CRUD → a happy-path integration test is enough.** Don't over-test getters.
4. **No test should touch a real database, network, or clock** unless it is explicitly labelled
   an integration test and lives in a separate test suite.

### Test pyramid

```
         /\
        /  \   E2E (few, slow, test full flows)
       /----\
      /      \ Integration (service boundary contracts, DB repos)
     /--------\
    /          \ Unit (domain logic, use cases with mocked repos)  ← most tests live here
   /____________\
```

### What to test

- **Domain entities**: all invariants, state machine transitions, calculation methods.
- **Use cases**: every branch, every error path. Mock the repository interface.
- **Route handlers (BFF)**: use Fastify `inject()` with a stub service.
  Test the HTTP contract: status codes, response shape, error mapping.
- **gRPC handlers**: test via the use case, not the handler.
  The handler is too thin to warrant direct tests.
- **Infrastructure / repos**: test against a real DB in integration tests only.

### Naming

```
<subject>_<scenario>_<expected outcome>

CreateWorkOrder_EmptyDescription_ThrowsArgumentException  // C#
createCustomer — when email already exists — throws ConflictError  // JS/TS describe/it
```

---

## Code style

### General

- **Explicit over implicit.** Name the concept. Avoid `data`, `info`, `manager`, `helper`.
- **Small functions.** If you need to scroll to understand a function, split it.
- **No premature abstraction.** Three similar lines of code is better than a wrong abstraction.
  Abstract when the third real use case appears, not the first.
- **Delete dead code.** Don't comment it out. Git history exists.
- **One level of abstraction per function.** Don't mix orchestration with implementation detail.

### TypeScript

- Strict mode always (`strict: true`).
- Prefer `type` aliases for DTOs and union types; `interface` for contracts meant to be implemented.
- No `any`. Use `unknown` and narrow it. If you reach for `any`, the type model is wrong.
- Keep imports explicit. No barrel re-exports that hide where things live.
- Use `readonly` on domain entity properties that must not change after construction.

### C# (.NET 8)

- Records for value objects and DTOs.
- Sealed classes for domain entities unless inheritance is genuinely required.
- `required` properties over nullable nullable chains in record constructors.
- Expression-bodied members for single-expression properties and simple methods.
- Async all the way down. No `.Result` or `.Wait()`.

---

## Error handling

- **Domain errors are domain objects**, not strings.
  Throw a typed exception (`CustomerNotFoundError`, `InvalidStatusTransitionError`)
  that carries structured context. The handler maps it to a status code.
- **Never swallow exceptions.** Log and re-throw, or convert to a domain error.
- **Distinguish error categories:**
  - `4xx` — caller's fault (validation, not found, conflict). Log at `warn`.
  - `5xx` — system fault. Log at `error` with full stack.
- **Correlation ID on every log line** (already wired via `AsyncLocalStorage` / Serilog `LogContext`).
  No log line is useful without it in a distributed system.

---

## When to reach for a pattern vs. when to stay simple

| Situation | Reach for | Stay simple if |
|---|---|---|
| Behaviour varies by type and will grow | Strategy | Only 2 variants, unlikely to grow |
| Concurrent writes to the same aggregate | Actor / optimistic lock | Only one writer at a time |
| Multi-service workflow with compensation | Saga | All steps are local / no compensation needed |
| Read shape diverges from write shape | CQRS read model | Read and write shape are the same |
| Construction has invariants | Factory method | No invariants, plain assignment is fine |
| Side effect crosses use-case boundary | Domain event | Side effect is in the same transaction |
| Config varies per environment | Strategy / env vars | Only one environment exists |

---

## Checklist before opening a PR

- [ ] All tests pass (`npm test` / `dotnet test`)
- [ ] No new `any` types introduced (TypeScript)
- [ ] New business logic has unit tests
- [ ] Bug fix has a regression test
- [ ] No direct DB/client import inside a use case or domain class
- [ ] Correlation ID propagated through any new service call
- [ ] Idempotency considered for any new mutation or event handler
- [ ] Error mapped to the correct HTTP/gRPC status code
- [ ] No cross-service domain model import
