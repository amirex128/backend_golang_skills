# GoFr-Golang: Project Layout

## GoFr integration overlay

Use GoFr as the delivery framework inside the Clean Architecture/CQRS layout. Keep `cmd/api/main.go` as a thin composition root that calls `gofr.New()`, configures GoFr datasources and lifecycle, constructs domain/application handlers, registers thin GoFr handlers, and starts the app. Put `*gofr.Context` only at the adapter boundary; translate it into `context.Context` plus application input before entering domain/application code. Keep GoFr's logger, metrics, tracing, health, configuration, and graceful-shutdown lifecycle instead of rebuilding them.

Recommended mapping: `internal/adapter/gofrhttp` contains GoFr route registration and binding; `internal/application` owns commands, queries, ports, transaction boundaries, and use cases; `internal/domain` owns aggregates and invariants; `internal/infrastructure/gofr` owns GoFr datasource adapters; `internal/infrastructure/persistence` owns SQL/NoSQL implementations; and `internal/composition` wires the graph. Read the namespaced GoFr quick-start, context, configuration, SQL, testing, and observability references alongside this architecture reference.

# Go Clean Architecture, CQRS, Repository Pattern, and Project Layout

This is the architecture standard for new Go backends and structural changes in this repository. Use **Clean Architecture** for dependency direction, **CQRS** for explicit command/query responsibilities, and the **Repository Pattern** for aggregate write persistence. Keep the design proportional to real complexity, but do not weaken the boundaries silently.

The goal is not to create ceremony. The goal is to keep business rules independent from HTTP, SQL, brokers, frameworks, generated code, and deployment details; make use cases testable; make persistence replaceable at the boundary; and make read/write responsibilities explicit.

## 1. Architectural rules

### 1.1 Dependency Rule

Dependencies point inward:

```text
Delivery / Transport / Infrastructure
                ↓
          Interface Adapters
                ↓
             Application
                ↓
               Domain
```

The arrow means “may depend on.” Inner code must not import outer code.

- **Domain** imports no application, adapter, infrastructure, transport, ORM, SQL driver, broker, or framework package.
- **Application** imports domain packages and standard-library contracts, but not concrete databases, HTTP frameworks, generated protobuf/OpenAPI transport types, or broker clients.
- **Adapters** translate external representations into application inputs and map application outputs into transport responses.
- **Infrastructure** implements ports and owns concrete databases, brokers, external clients, configuration, observability, migrations, and generated integration code.
- **Composition root** is the only place that should know most concrete implementations and assemble the object graph.

Keep the rule enforceable through Go package boundaries, `internal/`, import-cycle checks, architecture tests, code review, and `go list -deps` inspection. A package called `domain` that imports `database/sql`, a web framework, or a concrete repository is an architectural defect.

### 1.2 CQRS scope

CQRS means separating the model used to change state from the model used to read state. It does **not** automatically require event sourcing, two databases, asynchronous messaging, or a distributed system.

Apply CQRS at the bounded-context or use-case level when at least one of these is real:

- Commands enforce invariants or workflows that do not resemble CRUD.
- Read projections or joins have a different shape from write aggregates.
- Read and write workloads need different optimization or scaling.
- The domain benefits from task-oriented commands and explicit side effects.
- Independent read models or eventual consistency are an intentional product decision.

Do not force CQRS on a trivial CRUD slice only to satisfy a folder diagram. A simple query may read from the same database as writes; a command and query can initially share one process and one database while keeping their contracts separate.

### 1.3 Repository scope

A repository is an abstraction over persistence for a **domain aggregate root**, not a generic wrapper around tables or every database method.

- Define a write repository contract beside the aggregate/domain concept that consumes it.
- Implement that contract in infrastructure.
- Use one repository per aggregate root where the aggregate controls transactional consistency.
- Do not create repositories for every table, value object, or read DTO.
- Keep query access separate from aggregate repositories. A query handler may use a purpose-built read port or query implementation that returns read DTOs/projections.
- Keep repository interfaces free of SQL types, ORM entities, driver-specific options, HTTP types, and persistence-shaped DTOs.
- Use the smallest methods required by use cases. Avoid a giant `GenericRepository` with speculative CRUD methods.

This gives command handlers a domain-safe write boundary and query handlers an efficient read boundary without pretending that all reads are aggregate loads.

## 2. Recommended project tree

Use this as the default for a production Go API, service, or worker. Replace `order` with a bounded context or feature name; do not create empty packages merely to match the tree.

```text
project/
├── cmd/
│   ├── api/
│   │   └── main.go                    # thin process entrypoint
│   ├── worker/
│   │   └── main.go                    # optional async/outbox consumer
│   └── migrate/
│       └── main.go                    # optional migration command
├── internal/
│   ├── domain/
│   │   ├── order/
│   │   │   ├── aggregate.go           # aggregate root and invariants
│   │   │   ├── entity.go              # child entities when needed
│   │   │   ├── value_objects.go
│   │   │   ├── events.go              # transport-neutral domain events
│   │   │   ├── errors.go               # domain errors
│   │   │   └── repository.go           # aggregate write port
│   │   └── customer/
│   │       └── ...
│   ├── application/
│   │   ├── command/
│   │   │   └── order/
│   │   │       ├── create.go           # command, handler, result
│   │   │       ├── approve.go
│   │   │       └── cancel.go
│   │   ├── query/
│   │   │   └── order/
│   │   │       ├── get.go              # query, handler, read DTO
│   │   │       └── list.go
│   │   ├── ports/
│   │   │   ├── clock.go
│   │   │   ├── id_generator.go
│   │   │   ├── transaction.go
│   │   │   ├── event_publisher.go
│   │   │   └── authorization.go
│   │   └── errors.go
│   ├── adapter/
│   │   ├── http/
│   │   │   ├── handler/
│   │   │   ├── request/
│   │   │   ├── response/
│   │   │   ├── middleware/
│   │   │   └── router.go
│   │   ├── grpc/                       # optional transport
│   │   ├── graphql/                    # optional transport
│   │   └── messaging/                  # optional consumers/producers
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── postgres/
│   │   │   │   ├── order_repository.go
│   │   │   │   ├── order_queries.go
│   │   │   │   ├── mapper.go
│   │   │   │   └── migrations/
│   │   │   ├── mysql/                  # optional alternative adapter
│   │   │   └── transaction.go
│   │   ├── projection/
│   │   │   └── order_projector.go      # optional read model projector
│   │   ├── outbox/
│   │   │   ├── store.go
│   │   │   └── publisher.go
│   │   ├── client/
│   │   ├── config/
│   │   ├── observability/
│   │   └── shutdown/
│   └── composition/
│       ├── dependencies.go             # concrete dependency graph
│       └── server.go
├── api/
│   ├── openapi.yaml                    # source API contract
│   └── proto/                          # source protobuf contracts
├── migrations/                         # if shared rather than adapter-owned
├── configs/                            # non-secret defaults/examples only
├── testdata/
├── scripts/
├── go.mod
├── go.sum
├── Makefile
├── .golangci.yml
├── README.md
└── LICENSE
```

### 2.1 `cmd/`: composition entrypoints only

`cmd/<name>/main.go` may load configuration, construct infrastructure, assemble the application, register routes/workers, install signal handling, and call `Run`. It must not contain business rules, SQL, repository logic, request validation beyond startup configuration, or feature orchestration.

Keep `main` small enough to understand the process lifecycle at a glance. Move wiring into `internal/composition` when the graph becomes difficult to read.

### 2.2 `internal/domain/`: business truth

Organize domain code by bounded context or aggregate, not by technical type alone. A domain package owns:

- Aggregate roots and entity behavior.
- Value objects and validation that is intrinsic to the concept.
- Invariants and legal state transitions.
- Domain errors that do not mention HTTP, gRPC, SQL, JSON, or framework status codes.
- Domain events that describe facts without broker or serialization types.
- Aggregate repository interfaces for write persistence when the aggregate/use case needs one.

Keep aggregate fields private when encapsulation matters. Constructors and behavior methods must prevent invalid in-memory states. Do not expose setters that allow callers to bypass invariants.

### 2.3 `internal/application/`: use cases and ports

The application layer coordinates a user-visible use case. It is not a second domain and must not become a dumping ground for SQL or transport code.

- Commands express intent to change state.
- Queries express intent to read state.
- Handlers own one use case and one transaction/read flow.
- DTOs are application contracts, not database rows or generated HTTP models.
- Ports are interfaces owned by the consuming application/domain side.
- Authorization decisions that depend on the use case belong here; authentication mechanics stay at adapters/infrastructure.
- Cross-cutting ports such as clock, ID generation, transaction, event publication, and authorization keep nondeterministic dependencies injectable.

Prefer one handler per command/query. A handler should validate input shape, call ports, invoke domain behavior, persist or read, and return a stable result. It should not know whether persistence is PostgreSQL, an in-memory fake, or a remote service.

### 2.4 `internal/adapter/`: translation at boundaries

Adapters convert external protocols into application contracts and map results back.

HTTP/gRPC handlers may perform authentication extraction, request decoding, transport validation, route binding, response serialization, and error-to-status mapping. They must not implement aggregate invariants, execute SQL, or decide transaction boundaries.

Keep generated transport types at the edge. Map them into application commands/queries instead of allowing protobuf or OpenAPI types to leak into domain packages.

### 2.5 `internal/infrastructure/`: concrete effects

Infrastructure implements application/domain ports and owns effects:

- Database drivers, SQL, ORM code, row scanning, locking, migrations, and transaction implementations.
- External HTTP/gRPC clients and broker SDKs.
- Read projections and outbox delivery.
- Configuration loading, logging, metrics, tracing, and process integrations.
- Concrete repository and query implementations.

Infrastructure may depend inward on domain/application contracts. Domain and application must not import infrastructure to “save wiring time.”

## 3. Feature organization and bounded contexts

Use bounded-context or feature names below the architectural layer. Avoid a global layout such as `models/`, `services/`, and `repositories/` when it causes unrelated behavior to mix.

```text
internal/
├── domain/
│   ├── billing/
│   └── identity/
├── application/
│   ├── command/
│   │   ├── billing/
│   │   └── identity/
│   └── query/
│       ├── billing/
│       └── identity/
└── infrastructure/
    └── persistence/
        ├── billing/
        └── identity/
```

Keep a bounded context internally coherent. Share a package only when the concept is truly shared and stable; otherwise duplicate a small DTO or mapping rather than creating a dependency that couples contexts.

## 4. Command side design

### 4.1 Command contract

A command is an immutable application input representing intent, not a generic database update.

```go
package createorder

type Command struct {
    CustomerID string
    Items      []ItemInput
    IdempotencyKey string
}

type ItemInput struct {
    ProductID string
    Quantity  int
}

type Result struct {
    OrderID string
}
```

Validate required shape at the application boundary, then let the domain validate business invariants. Do not put transport types, JSON tags, or SQL columns in the domain command unless the command itself is a public application contract.

### 4.2 Command handler flow

Use this sequence:

1. Validate command shape and authorization.
2. Check idempotency when the caller may retry.
3. Begin a transaction through an application port.
4. Load the aggregate through its repository.
5. Invoke a domain method; let the aggregate enforce invariants.
6. Persist the aggregate through the repository.
7. Record domain events in an outbox within the same transaction when external publication is required.
8. Commit and return the result.
9. Publish from the outbox after commit with bounded retries and idempotent delivery.

Never publish an external event before the write transaction commits. Never make a repository method silently perform unrelated writes.

### 4.3 Command handler example

```go
package createorder

import (
    "context"
    "fmt"

    "example.com/project/internal/domain/order"
    "example.com/project/internal/application/ports"
)

type OrderRepository interface {
    Save(ctx context.Context, tx ports.Tx, value *order.Order) error
}

type Handler struct {
    orders OrderRepository
    tx     ports.TransactionManager
    ids    ports.IDGenerator
    clock  ports.Clock
}

func (h Handler) Handle(ctx context.Context, cmd Command) (Result, error) {
    var result Result
    err := h.tx.Within(ctx, func(ctx context.Context, tx ports.Tx) error {
        id, err := h.ids.New()
        if err != nil {
            return fmt.Errorf("generate order id: %w", err)
        }
        aggregate, err := order.New(id, cmd.CustomerID, cmd.Items, h.clock.Now())
        if err != nil {
            return fmt.Errorf("create order: %w", err)
        }
        if err := h.orders.Save(ctx, tx, aggregate); err != nil {
            return fmt.Errorf("save order: %w", err)
        }
        result.OrderID = aggregate.ID()
        return nil
    })
    if err != nil {
        return Result{}, err
    }
    return result, nil
}
```

The exact transaction API may differ, but the ownership is stable: the application defines the need for atomic work; infrastructure implements the transaction.

## 5. Query side design

### 5.1 Query contract

Queries should return read models designed for the caller. They should not load an aggregate merely because an aggregate repository exists.

```go
package getorder

type Query struct {
    OrderID string
}

type Result struct {
    ID        string
    Status    string
    Total     int64
    Currency  string
    CreatedAt time.Time
    Items     []Item
}
```

A query port may be defined beside the query handler or in an application `ports` package. It should expose only the read operation required by the query and return application read DTOs or a mapper-owned projection, not SQL rows.

```go
type Reader interface {
    Get(ctx context.Context, orderID string) (Result, error)
}
```

### 5.2 Query rules

- Queries must not mutate business state, publish events, or hide writes.
- Keep pagination bounded and deterministic.
- Allowlist sortable fields; never concatenate untrusted SQL identifiers.
- Document consistency: strong, read-your-write, or eventually consistent.
- Use a projection or denormalized read model when joins or response shape justify it.
- Expose projection lag and recovery behavior when eventual consistency affects the product.
- Map `sql.ErrNoRows` or driver errors into application-level errors at the adapter boundary.

## 6. Repository Pattern in Go

### 6.1 Where interfaces belong

Place a repository interface at the boundary that consumes it:

- An aggregate write repository usually belongs in the aggregate's domain package because it is part of the domain/application need to load and save that aggregate.
- A query reader belongs with the query/application contract because it returns a query-specific read model.
- A transaction manager, clock, ID generator, or event publisher belongs in application ports when use cases consume it.
- Concrete SQL/ORM implementations belong in infrastructure.

The precise package can vary, but the interface must not live in the infrastructure package if that forces application code to depend outward.

### 6.2 Repository methods model use cases

Prefer intention-revealing methods:

```go
package order

type Repository interface {
    Get(ctx context.Context, id ID) (*Order, error)
    Save(ctx context.Context, tx Transaction, aggregate *Order) error
}
```

Avoid this by default:

```go
type GenericRepository[T any] interface {
    Create(ctx context.Context, value T) error
    Get(ctx context.Context, id any) (T, error)
    Update(ctx context.Context, value T) error
    Delete(ctx context.Context, id any) error
    List(ctx context.Context, filters map[string]any) ([]T, error)
}
```

The generic form hides aggregate boundaries, encourages table-shaped thinking, weakens type-safe invariants, and makes every use case depend on methods it does not need.

### 6.3 One repository per aggregate root

An aggregate root controls consistency for the objects inside it. Load and save the aggregate through one repository where the command must preserve its invariants. Do not create a repository for every table or child entity.

It is valid for a query side to join tables directly through a query adapter because reads do not mutate aggregate state. It is not valid for a command to update aggregate tables through arbitrary query SQL and bypass domain behavior.

### 6.4 Concrete repository implementation

Infrastructure maps between persistence records and domain types:

```go
package postgres

type OrderRepository struct {
    db *sql.DB
}

var _ order.Repository = (*OrderRepository)(nil)

func (r *OrderRepository) Get(ctx context.Context, id order.ID) (*order.Order, error) {
    row := r.db.QueryRowContext(ctx, `
        SELECT id, customer_id, status, created_at
        FROM orders WHERE id = $1`, id.String())

    record, err := scanOrder(row)
    if err != nil {
        return nil, mapDatabaseError(err)
    }
    return toDomainOrder(record)
}
```

Keep SQL, scan structs, ORM models, column names, locks, and retry behavior in infrastructure. Mapping errors should preserve context without exposing credentials or raw database details to a public response.

### 6.5 Concurrency and optimistic locking

For concurrent commands, choose and document a consistency strategy:

- Database row lock inside the command transaction.
- Optimistic version column checked on update.
- Aggregate-specific uniqueness constraints.
- Idempotency key with a durable result.
- Serialized command processing for a bounded partition.

Do not rely on a process-local mutex to protect a multi-instance service. Convert a version conflict into a typed application error and let the adapter map it to the correct transport response.

## 7. Transactions, Unit of Work, and Outbox

### 7.1 Unit of Work

Use a Unit of Work or transaction manager only when a command requires atomic changes across one or more repositories. It belongs at the application boundary as an abstraction and is implemented in infrastructure.

```go
type TransactionManager interface {
    Within(ctx context.Context, fn func(context.Context, Tx) error) error
}
```

Rules:

- Start and commit the transaction around the complete command use case.
- Do not expose `*sql.Tx` to domain code.
- Do not keep a transaction open across network calls unless the design explicitly accepts the failure mode.
- Roll back on errors and panic safely according to the driver contract.
- Keep transactions short and bounded.
- Use database constraints as a final invariant guard, not as a replacement for domain validation.

### 7.2 Transactional outbox

When a command changes state and must publish an integration event, write the domain state and an outbox record in the same transaction:

```text
command handler
    ├── load aggregate
    ├── apply domain behavior
    ├── save aggregate
    └── insert outbox event  ── same transaction ──> commit
                                                      ↓
                                             outbox publisher
```

The publisher claims pending records, publishes with an idempotency key, marks success, and retries only retryable failures with backoff. Include attempts, next-attempt time, lease/claim ownership, and dead-letter policy when operationally required. Do not put broker SDK types in domain events.

## 8. HTTP, gRPC, and messaging flow

Keep external flow explicit:

```text
HTTP request
  → adapter decodes and validates
  → application Command or Query
  → handler
  → domain / ports
  → infrastructure adapter
  → application Result
  → adapter presenter / transport response
```

Adapters must:

- Validate syntax and transport constraints.
- Authenticate and extract identity.
- Map transport input into an application contract.
- Map typed application/domain errors to status codes.
- Avoid leaking stack traces, SQL, tokens, or internal topology.

Use the same application handlers from HTTP, gRPC, and messaging adapters when the use case is the same. Do not duplicate business logic per transport.

## 9. Dependency injection and composition root

Prefer manual constructor injection in Go:

```go
func NewApplication(
    orders order.Repository,
    orderReader getorder.Reader,
    tx ports.TransactionManager,
    clock ports.Clock,
) Application {
    return Application{...}
}
```

Construct concrete adapters in `internal/composition`:

```go
func Build(cfg Config) (*Server, error) {
    db, err := postgres.Open(cfg.Database)
    if err != nil { return nil, err }

    orderRepo := postgres.NewOrderRepository(db)
    orderReader := postgres.NewOrderReader(db)
    tx := postgres.NewTransactionManager(db)
    app := application.New(orderRepo, orderReader, tx, systemClock{})
    return server.New(app), nil
}
```

Avoid service locators, package-level mutable singletons, hidden `init()` wiring, and DI frameworks that obscure ownership. If a DI tool is introduced, generated wiring must remain at the composition boundary and dependencies must stay inspectable.

## 10. Testing the architecture

### Domain tests

Test aggregates, value objects, invariants, transitions, and domain errors with pure unit tests. No database, transport, clock, or broker is required unless explicitly represented by a domain port.

### Application tests

Use fakes or mocks for repository, transaction, clock, authorization, and publisher ports. Assert:

- Correct command/query behavior.
- Transaction begins/commits/rolls back at the expected boundary.
- Repository methods receive the intended aggregate.
- Authorization is enforced.
- Idempotent retries do not duplicate state.
- Domain errors are preserved.
- Query handlers do not call write ports.

### Adapter tests

Use `httptest`, gRPC test servers, or transport-specific harnesses to test decoding, validation, status mapping, serialization, authentication extraction, and response contracts. Do not retest domain invariants through every transport test.

### Infrastructure integration tests

Run against isolated real dependencies for SQL queries, migrations, locks, transactions, mapping, projection updates, outbox claiming, and external-client behavior. Mark integration tests with a build tag or explicit environment gate. Never run them against production.

### Architecture tests

Add checks that enforce forbidden imports and package direction. At minimum verify:

- `internal/domain/...` does not import adapter or infrastructure packages.
- `internal/application/...` does not import concrete persistence or transport packages.
- `cmd/...` does not contain business packages or SQL imports.
- Query packages do not depend on command handlers.
- Generated transport code is not imported by domain packages.

Run `go list -deps`, `go vet`, tests, race tests for concurrent code, and configured lint rules in CI.

## 11. Common failure modes

| Failure | Why it is harmful | Corrective action |
|---|---|---|
| `handlers/`, `services/`, `repositories/` global folders | Couples unrelated features and creates giant services | Organize by bounded context and use case |
| Domain imports SQL/HTTP/ORM | Business rules become technology-bound | Move concrete code to infrastructure and expose a port |
| Repository per table | Bypasses aggregate consistency | Use one write repository per aggregate root; separate read ports |
| Generic CRUD repository | Hides intent and weakens type boundaries | Define small use-case or aggregate-specific interfaces |
| Query loads aggregate for a list screen | Slow and couples reads to write model | Use a projection/read model and query port |
| Command updates tables directly | Bypasses invariants and events | Load aggregate, invoke behavior, persist through repository |
| Handler owns a transaction and broker publish | Inconsistent commits and duplicate events | Use application transaction boundary and outbox |
| `main.go` contains wiring plus business logic | Hard to test and maintain | Keep `cmd` as composition root; move behavior inward |
| CQRS everywhere by default | Adds complexity where CRUD is sufficient | Apply per bounded context/use case based on real benefit |
| Shared mutable global dependencies | Hidden coupling and flaky tests | Use constructors and explicit lifecycle ownership |

## 12. Migration from a legacy layout

Do not perform a blind big-bang rewrite. Use a strangler/refactoring sequence:

1. Record the current package graph and add behavior characterization tests.
2. Identify one bounded context or use case with clear business value.
3. Extract domain invariants from handlers/services into an aggregate or domain service.
4. Define the smallest repository or query port at the consuming boundary.
5. Add an infrastructure adapter and mapper behind that port.
6. Introduce one command or query handler and route one adapter through it.
7. Add architecture checks to prevent regression.
8. Move adjacent behavior in small commits, preserving compatibility at each step.

Do not rename every package, change the database, introduce CQRS, and replace the transport in one unreviewable change.

## 13. Delivery checklist

- [ ] Project type and bounded contexts are identified.
- [ ] `cmd` is a thin composition root.
- [ ] Domain contains business rules and no outer-layer imports.
- [ ] Application contains explicit commands, queries, handlers, DTOs, and ports.
- [ ] Commands and queries have separate responsibilities and contracts.
- [ ] One write repository exists per aggregate root where needed.
- [ ] Repository interfaces are consumer-owned and persistence-neutral.
- [ ] Query readers return read models and do not hide mutations.
- [ ] Transactions are owned by application use cases and implemented in infrastructure.
- [ ] Outbox is used when state change and external publication must be atomic.
- [ ] Adapters translate transport; they do not contain business logic or SQL.
- [ ] Concrete dependencies are assembled in one composition root.
- [ ] Domain, application, adapter, infrastructure, and architecture tests cover the relevant boundaries.
- [ ] Pagination, consistency, idempotency, locking, retries, and projection lag are documented.
- [ ] `gofmt`, `go vet`, tests, race tests, linting, and security checks pass as applicable.

## 14. References

This guidance is synthesized and cross-checked against:

1. [Martin Fowler — CQRS](https://martinfowler.com/bliki/CQRS.html): CQRS separates update and read models, can support different scaling/read representations, and should be applied cautiously where its complexity is justified.
2. [Three Dots Labs — Combining DDD, CQRS, and Clean Architecture in Go](https://threedots.tech/post/ddd-cqrs-clean-architecture-combined/): domain-first Go modeling, aggregate behavior, use cases, and practical Clean Architecture refactoring.
3. [Three Dots Labs — The Repository Pattern in Go](https://threedots.tech/post/repository-pattern-in-go/): consumer-facing repository interfaces, aggregate persistence, in-memory testing adapters, and database decoupling.
4. [Microsoft — Designing the Infrastructure Persistence Layer](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design): repository-per-aggregate guidance, unit of work, command-side persistence, query-side flexibility, and test boundaries.
5. [Go Project Layout source material](https://github.com/golang-standards/project-layout): practical Go conventions for `cmd`, `internal`, `pkg`, configuration, tests, and operational files.

Use these sources for rationale and the rules in this file for implementation decisions in this repository.

