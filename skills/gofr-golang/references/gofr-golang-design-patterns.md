# GoFr-Golang: Design Patterns

## GoFr integration overlay

Choose patterns that preserve GoFr lifecycle and Clean Architecture. Prefer manual composition around `gofr.New()`, focused ports, and thin GoFr adapters. Do not introduce a second web framework, an ORM-first service layer, or duplicate GoFr observability merely to apply a pattern.

# Design Patterns Under Clean Architecture and CQRS

Apply patterns only when they clarify a real boundary. Prefer explicit composition, small interfaces at consumption points, and use-case-oriented commands and queries. Patterns must preserve inward dependencies and must not become speculative framework layers.


## Source Skill Guidance

**Persona:** You are a Go architect who values simplicity and explicitness. You apply patterns only when they solve a real problem — not to demonstrate sophistication — and you push back on premature abstraction.

**Modes:**

- **Design mode** — creating new APIs, packages, or application structure: ask the developer about their architecture preference before proposing patterns; favor the smallest pattern that satisfies the requirement.
- **Review mode** — auditing existing code for design issues: scan for `init()` abuse, unbounded resources, missing timeouts, and implicit global state; report findings before suggesting refactors.

> **Community default.** A company skill that explicitly supersedes `samber/cc-skills-golang@golang-design-patterns` skill takes precedence.

# Go Design Patterns & Idioms

Idiomatic Go patterns for production-ready code. For error handling details see the `samber/cc-skills-golang@golang-error-handling` skill; for context propagation see `samber/cc-skills-golang@golang-context` skill; for struct/interface design see `samber/cc-skills-golang@golang-structs-interfaces` skill.

## Best Practices Summary

1. Constructors SHOULD use **functional options** — they scale better as APIs evolve (one function per option, no breaking changes)
2. Functional options MUST **return an error** if validation can fail — catch bad config at construction, not at runtime
3. **Avoid `init()`** — runs implicitly, cannot return errors, makes testing unpredictable. Use explicit constructors
4. Enums SHOULD **start at 1** (or Unknown sentinel at 0) — Go's zero value silently passes as the first enum member
5. Error cases MUST be **handled first** with early return — keep happy path flat
6. **Panic is for bugs, not expected errors** — callers can handle returned errors; panics crash the process
7. **`defer Close()` immediately after opening** — later code changes can accidentally skip cleanup
8. **`runtime.AddCleanup`** over `runtime.SetFinalizer` — finalizers are unpredictable and can resurrect objects
9. Every external call SHOULD **have a timeout** — a slow upstream hangs your goroutine indefinitely
10. **Limit everything** (pool sizes, queue depths, buffers) — unbounded resources grow until they crash
11. Retry logic MUST **check context cancellation** between attempts
12. **Use `strings.Builder`** for concatenation in loops → see `samber/cc-skills-golang@golang-code-style`
13. string vs []byte: **use `[]byte` for mutation and I/O**, `string` for display and keys — conversions allocate
14. Iterators (Go 1.23+): **use for lazy evaluation** — avoid loading everything into memory
15. **Stream large transfers** — loading millions of rows causes OOM; stream keeps memory constant
16. `//go:embed` for **static assets** — embeds at compile time, eliminates runtime file I/O errors
17. **Use `crypto/rand`** for keys/tokens — `math/rand` is predictable → see `samber/cc-skills-golang@golang-security`
18. Regexp MUST be **compiled once at package level** — compilation is O(n) and allocates
19. Compile-time interface checks: **`var _ Interface = (*Type)(nil)`**
20. **A little recode > a big dependency** — each dep adds attack surface and maintenance burden
21. **Design for testability** — accept interfaces, inject dependencies

## Constructor Patterns: Functional Options vs Builder

### Functional Options (Preferred)

```go
type Server struct {
    addr         string
    readTimeout  time.Duration
    writeTimeout time.Duration
    maxConns     int
}

type Option func(*Server)

func WithReadTimeout(d time.Duration) Option {
    return func(s *Server) { s.readTimeout = d }
}

func WithWriteTimeout(d time.Duration) Option {
    return func(s *Server) { s.writeTimeout = d }
}

func WithMaxConns(n int) Option {
    return func(s *Server) { s.maxConns = n }
}

func NewServer(addr string, opts ...Option) *Server {
    // Default options
    s := &Server{
        addr:         addr,
        readTimeout:  5 * time.Second,
        writeTimeout: 10 * time.Second,
        maxConns:     100,
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage
srv := NewServer(":8080",
    WithReadTimeout(30*time.Second),
    WithMaxConns(500),
)
```

Constructors SHOULD use **functional options** — they scale better with API evolution and require less code. Use builder pattern only if you need complex validation between configuration steps.

## Constructors & Initialization

### Avoid `init()` and Mutable Globals

`init()` runs implicitly, makes testing harder, and creates hidden dependencies:

- Multiple `init()` functions run in declaration order, across files in **filename alphabetical order** — fragile
- Cannot return errors — failures must panic or `log.Fatal`
- Runs before `main()` and tests — side effects make tests unpredictable

```go
// Bad — hidden global state
var db *sql.DB

func init() {
    var err error
    db, err = sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err)
    }
}

// Good — explicit initialization, injectable
func NewUserRepository(db *sql.DB) *UserRepository {
    return &UserRepository{db: db}
}
```

### Enums: Start at 1

Zero values should represent invalid/unset state:

```go
type Status int

const (
    StatusUnknown Status = iota // 0 = invalid/unset
    StatusActive                // 1
    StatusInactive              // 2
    StatusSuspended             // 3
)
```

### Compile Regexp Once

```go
// Good — compiled once at package level
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

func ValidateEmail(email string) bool {
    return emailRegex.MatchString(email)
}
```

### Use `//go:embed` for Static Assets

```go
import "embed"

//go:embed templates/*
var templateFS embed.FS

//go:embed version.txt
var version string
```

### Compile-Time Interface Checks

→ See `samber/cc-skills-golang@golang-structs-interfaces` for the `var _ Interface = (*Type)(nil)` pattern.

## Error Flow Patterns

Error cases MUST be handled first with early return — keep the happy path at minimal indentation. → See `samber/cc-skills-golang@golang-code-style` for the full pattern and examples.

### When to Panic vs Return Error

- **Return error**: network failures, file not found, invalid input — anything a caller can handle
- **Panic**: nil pointer in a place that should be impossible, violated invariant, `Must*` constructors used at init time
- **`.Close()` / `Flush()` errors**: read-only cleanup can often use `defer f.Close()`, but write/flush resources must report close or flush errors when durability matters

## Data Handling

### string vs []byte vs []rune

| Type     | Default for | Use when                                            |
| -------- | ----------- | --------------------------------------------------- |
| `string` | Everything  | Immutable, safe, UTF-8                              |
| `[]byte` | I/O         | Writing to `io.Writer`, building strings, mutations |
| `[]rune` | Unicode ops | `len()` must mean characters, not bytes             |

Avoid repeated conversions — each one allocates. Stay in one type until you need the other.

### Iterators & Streaming for Large Data

Use iterators (Go 1.23+) and streaming patterns to process large datasets without loading everything into memory. For large transfers between services (e.g., 1M rows DB to HTTP), stream to prevent OOM.

For code examples, see [Data Handling Patterns](references/data-handling.md).

## Resource Management

`defer Close()` immediately after opening — don't wait, don't forget:

```go
f, err := os.Open(path)
if err != nil {
    return err
}
defer f.Close() // right here, not 50 lines later

rows, err := db.QueryContext(ctx, query)
if err != nil {
    return err
}
defer rows.Close()
```

For graceful shutdown, resource pools, and `runtime.AddCleanup`, see [Resource Management](references/resource-management.md).

## Resilience & Limits

### Timeout Every External Call

```go
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

resp, err := httpClient.Do(req.WithContext(ctx))
```

### Retry & Context Checks

Retry logic MUST check `ctx.Err()` between attempts and use exponential/linear backoff via `select` on `ctx.Done()`. Long loops MUST check `ctx.Err()` periodically. → See `samber/cc-skills-golang@golang-context` skill.

## Database Patterns

→ See `samber/cc-skills-golang@golang-database` skill for sqlx/pgx, transactions, nullable columns, connection pools, repository interfaces, testing.

## Architecture

Ask the developer which architecture they prefer: clean architecture, hexagonal, DDD, or flat layout. Don't impose complex architecture on a small project.

Core principles regardless of architecture:

- **Keep domain pure** — no framework dependencies in the domain layer
- **Fail fast** — validate at boundaries, trust internal code
- **Make illegal states unrepresentable** — use types to enforce invariants
- **Respect 12-factor app** principles — → see `samber/cc-skills-golang@golang-project-layout`

## Detailed Guides

| Guide | Scope |
| --- | --- |
| [Architecture Patterns](references/architecture.md) | High-level principles, when each architecture fits |
| [Clean Architecture](references/clean-architecture.md) | Use cases, dependency rule, layered adapters |
| [Hexagonal Architecture](references/hexagonal-architecture.md) | Ports and adapters, domain core isolation |
| [Domain-Driven Design](references/ddd.md) | Aggregates, value objects, bounded contexts |

## Code Philosophy

- **Avoid repetitive code** — but don't abstract prematurely
- **Minimize dependencies** — a little recode > a big dependency
- **Design for testability** — accept interfaces, inject dependencies, keep functions pure

## Cross-References

- → See `samber/cc-skills-golang@golang-data-structures` skill for data structure selection, internals, and container/ packages
- → See `samber/cc-skills-golang@golang-error-handling` skill for error wrapping, sentinel errors, and the single handling rule
- → See `samber/cc-skills-golang@golang-structs-interfaces` skill for interface design and composition
- → See `samber/cc-skills-golang@golang-concurrency` skill for goroutine lifecycle and graceful shutdown
- → See `samber/cc-skills-golang@golang-context` skill for timeout and cancellation patterns
- → See `samber/cc-skills-golang@golang-project-layout` skill for architecture and directory structure
- → See `samber/cc-skills-golang@golang-refactoring` skill for safely staging a migration toward one of these patterns (options struct, DI, consumer-side interfaces) across an existing codebase


## Source Reference: `golang-design-patterns/references/architecture.md`

# Architecture Patterns

## Table of Contents

- [Choose the Right Level of Architecture](#choose-the-right-level-of-architecture)
- [Keep Domain Pure](#keep-domain-pure)
- [Fail Fast — Validate at Boundaries](#fail-fast--validate-at-boundaries)
- [Make Illegal States Unrepresentable](#make-illegal-states-unrepresentable)
- [Detailed Architecture Guides](#detailed-architecture-guides)
- [12-Factor App Principles](#12-factor-app-principles)
- [Explicit Over Implicit](#explicit-over-implicit)

## Choose the Right Level of Architecture

Architecture complexity MUST match project scope — don't over-architect small projects. When starting a new project, ask the developer what architecture they prefer:

| Project Size | Recommended Approach |
| --- | --- |
| Script / small CLI (<500 lines) | Flat `main.go` + a few files, no layers |
| Medium service (500-5K lines) | Simple layered: `handler/`, `service/`, `repository/` |
| Large service / monolith (5K+ lines) | Clean architecture, hexagonal, or DDD — ask the team |

A 100-line CLI does not need a domain layer, ports and adapters, or dependency injection frameworks. Start simple and refactor when complexity demands it.

## Keep Domain Pure

Domain logic MUST remain pure — no framework or infrastructure dependencies. The domain layer contains business logic and types:

```go
// domain/order.go — pure business logic, no imports from infrastructure
package domain

type Order struct {
    ID     string
    Items  []Item
    Status OrderStatus
}

func (o *Order) AddItem(item Item) error {
    if o.Status != StatusDraft {
        return ErrOrderNotEditable
    }
    o.Items = append(o.Items, item)
    return nil
}
```

Infrastructure concerns (database queries, HTTP clients, message queues) live in separate packages that depend on the domain — never the reverse.

## Fail Fast — Validate at Boundaries

Input MUST be validated at system boundaries (HTTP handlers, CLI argument parsing, message consumers). Once data enters your domain layer, trust it:

```go
// Handler layer — validate here
func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
    var req CreateOrderRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid JSON", http.StatusBadRequest)
        return
    }
    if req.UserID == "" {
        http.Error(w, "user_id is required", http.StatusBadRequest)
        return
    }
    if len(req.Items) == 0 {
        http.Error(w, "at least one item required", http.StatusBadRequest)
        return
    }

    // Domain layer trusts this data is valid
    order, err := h.service.CreateOrder(r.Context(), req.UserID, req.Items)
    // ...
}
```

Don't re-validate the same data at every layer — it clutters the code and violates DRY.

## Make Illegal States Unrepresentable

Use Go's type system to prevent invalid states from being expressible in code:

```go
// Bad — status is a raw string, anything goes
type Order struct {
    Status string // "pending"? "PENDING"? "active"? anything?
}

// Good — typed enum constrains the values
type OrderStatus int

const (
    OrderStatusUnknown   OrderStatus = iota // 0 = invalid
    OrderStatusDraft                        // 1
    OrderStatusConfirmed                    // 2
    OrderStatusShipped                      // 3
)

type Order struct {
    Status OrderStatus
}
```

```go
// Bad — email is a raw string, could be anything
func SendEmail(to string, body string) error { ... }

// Good — validated type enforces the constraint
type Email struct {
    address string // unexported: can only be created via constructor
}

func NewEmail(raw string) (Email, error) {
    if !isValidEmail(raw) {
        return Email{}, fmt.Errorf("invalid email: %s", raw)
    }
    return Email{address: raw}, nil
}
```

## Detailed Architecture Guides

For projects that warrant a formal architecture (typically 5K+ lines), see the dedicated guides:

- [Domain-Driven Design (DDD)](./ddd.md) — aggregates, value objects, bounded contexts
- [Clean Architecture](./clean-architecture.md) — use cases, dependency rule, layered adapters
- [Hexagonal Architecture](./hexagonal-architecture.md) — ports, adapters, domain core isolation

## 12-Factor App Principles

→ See `samber/cc-skills-golang@golang-project-layout` for 12-Factor App conventions.

## Explicit Over Implicit

Go favors explicitness. Code should express its intent clearly without requiring the reader to know hidden conventions:

```go
// Bad — implicit behavior hidden in struct tags and reflection
type Config struct {
    Port int `default:"8080"`
}

// Good — explicit defaults visible in code
func NewConfig() Config {
    return Config{Port: 8080}
}
```

```go
// Bad — implicit dependency via global
func HandleRequest(w http.ResponseWriter, r *http.Request) {
    user := globalDB.FindUser(r.Context(), userID) // where does globalDB come from?
}

// Good — explicit dependency via injection
func (h *Handler) HandleRequest(w http.ResponseWriter, r *http.Request) {
    user := h.db.FindUser(r.Context(), userID) // clear: db is a field on Handler
}
```

→ See `samber/cc-skills-golang@golang-project-layout` skill for directory structure and layout patterns.


## Source Reference: `golang-design-patterns/references/clean-architecture.md`

# Clean Architecture in Go

## Table of Contents

- [When to Use](#when-to-use)
- [The Dependency Rule](#the-dependency-rule)
- [Project Structure](#project-structure)
- [Code Examples](#code-examples)
  - [Entity — pure domain logic, zero dependencies](#entity--pure-domain-logic-zero-dependencies)
  - [Use Case — orchestrates business operations](#use-case--orchestrates-business-operations)
  - [Adapter — implements a port](#adapter--implements-a-port)
  - [Handler — translates HTTP to use case calls](#handler--translates-http-to-use-case-calls)
- [Key Principle](#key-principle)
- [Wiring](#wiring)

## When to Use

Apply clean architecture when you need strong separation between business logic and infrastructure — typically medium-to-large services (2K+ lines) where testability, framework independence, and clear dependency direction matter. Do NOT use for small CLI tools or scripts.

## The Dependency Rule

Dependencies point inward only. Inner layers never import outer layers.

```
Frameworks & Drivers  →  Interface Adapters  →  Use Cases  →  Entities
(HTTP, DB, gRPC)         (handlers, repos)      (app logic)   (domain)
```

Each layer defines interfaces for what it needs. Outer layers implement those interfaces.

## Project Structure

```
order-service/
├── cmd/
│   └── server/
│       └── main.go                  # Wiring only — builds the dependency graph
├── internal/
│   ├── entity/
│   │   ├── order.go                 # Order entity + business rules
│   │   ├── item.go                  # OrderItem
│   │   └── status.go                # OrderStatus enum
│   ├── order/
│   │   ├── place.go                 # PlaceOrderUseCase
│   │   ├── cancel.go                # CancelOrderUseCase
│   │   └── port.go                  # Interfaces this use case depends on
│   ├── adapter/
│   │   ├── handler/
│   │   │   └── order_handler.go    # HTTP handler — calls use cases
│   │   ├── repository/
│   │   │   └── order_postgres.go   # OrderRepository — implements port
│   │   └── gateway/
│   │       └── payment_client.go   # External payment API client
│   └── infrastructure/
│       ├── router.go               # HTTP router setup
│       ├── database.go             # DB connection
│       └── config.go               # Config loading
├── go.mod
└── go.sum
```

## Code Examples

### Entity — pure domain logic, zero dependencies

```go
// internal/entity/order.go
package entity

type Order struct {
    ID     string
    Items  []Item
    Status OrderStatus
}

func (o *Order) Cancel() error {
    if o.Status == StatusShipped {
        return ErrCannotCancelShipped
    }
    o.Status = StatusCancelled
    return nil
}

func (o *Order) Total() int64 {
    var sum int64
    for _, item := range o.Items {
        sum += item.Price * int64(item.Quantity)
    }
    return sum
}
```

### Use Case — orchestrates business operations

```go
// internal/order/port.go
package order

// Ports — interfaces defined by the use case, implemented by adapters
type OrderRepository interface {
    Save(ctx context.Context, order *entity.Order) error
    FindByID(ctx context.Context, id string) (*entity.Order, error)
}

type PaymentGateway interface {
    Charge(ctx context.Context, orderID string, amount int64) error
}
```

```go
// internal/order/place.go
package order

type PlaceOrderUseCase struct {
    orders   OrderRepository
    payments PaymentGateway
}

func NewPlaceOrderUseCase(orders OrderRepository, payments PaymentGateway) *PlaceOrderUseCase {
    return &PlaceOrderUseCase{orders: orders, payments: payments}
}

func (uc *PlaceOrderUseCase) Execute(ctx context.Context, orderID string) error {
    order, err := uc.orders.FindByID(ctx, orderID)
    if err != nil {
        return fmt.Errorf("finding order: %w", err)
    }

    if err := uc.payments.Charge(ctx, order.ID, order.Total()); err != nil {
        return fmt.Errorf("charging payment: %w", err)
    }

    order.Status = entity.StatusPlaced
    return uc.orders.Save(ctx, order)
}
```

### Adapter — implements a port

```go
// internal/adapter/repository/order_postgres.go
package repository

type OrderPostgres struct {
    db *sql.DB
}

func NewOrderPostgres(db *sql.DB) *OrderPostgres {
    return &OrderPostgres{db: db}
}

func (r *OrderPostgres) FindByID(ctx context.Context, id string) (*entity.Order, error) {
    // SQL query, scan into entity.Order
}

func (r *OrderPostgres) Save(ctx context.Context, order *entity.Order) error {
    // SQL upsert
}
```

### Handler — translates HTTP to use case calls

```go
// internal/adapter/handler/order_handler.go
package handler

type OrderHandler struct {
    placeOrder *usecase.PlaceOrderUseCase
}

func (h *OrderHandler) HandlePlaceOrder(w http.ResponseWriter, r *http.Request) {
    orderID := chi.URLParam(r, "id")

    if err := h.placeOrder.Execute(r.Context(), orderID); err != nil {
        // Map domain errors to HTTP status codes
        http.Error(w, err.Error(), mapToHTTPStatus(err))
        return
    }

    w.WriteHeader(http.StatusOK)
}
```

## Key Principle

Interfaces live where they are consumed, not where they are implemented. The `usecase/order/port.go` file defines `OrderRepository` — the adapter in `adapter/repository/` implements it. This keeps the use case layer free from infrastructure imports.

## Wiring

All dependency construction happens in `cmd/server/main.go`. → See `samber/cc-skills-golang@golang-dependency-injection` skill for DI library alternatives.


## Source Reference: `golang-design-patterns/references/data-handling.md`

# Data Handling Patterns

## Iterators for Large Data (Go 1.23+)

Process large datasets without allocating everything into memory:

```go
// Bad — loads all rows into memory
func AllUsers(db *sql.DB) ([]User, error) {
    rows, err := db.Query("SELECT * FROM users")
    // ... scan all into slice
}

// Good — iterator yields one at a time
func AllUsers(db *sql.DB) iter.Seq2[User, error] {
    return func(yield func(User, error) bool) {
        rows, err := db.Query("SELECT * FROM users")
        if err != nil {
            yield(User{}, err)
            return
        }
        defer rows.Close()

        for rows.Next() {
            var u User
            if err := rows.Scan(&u.ID, &u.Name, &u.Email); err != nil {
                yield(User{}, err)
                return
            }
            if !yield(u, nil) {
                return
            }
        }
    }
}
```

## Streaming Large Transfers

When transferring large data between services (e.g., 1M rows from DB, 1M rows in HTTP response), use streaming patterns with iterators or `github.com/samber/ro` to prevent OOM:

```go
// Stream JSON array to HTTP response — constant memory
func (h *Handler) ExportUsers(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte("["))

    first := true
    for user, err := range h.repo.AllUsers(r.Context()) {
        if err != nil {
            slog.Error("streaming user", "error", err)
            return
        }
        if !first {
            w.Write([]byte(","))
        }
        json.NewEncoder(w).Encode(user)
        first = false
    }

    w.Write([]byte("]"))
}
```


## Source Reference: `golang-design-patterns/references/ddd.md`

# Domain-Driven Design (DDD) in Go

## Table of Contents

- [When to Use](#when-to-use)
- [Building Blocks](#building-blocks)
- [Project Structure](#project-structure)
- [Code Examples](#code-examples)
  - [Value Object — Money](#value-object--money)
  - [Aggregate Root — Order](#aggregate-root--order)
  - [Repository Interface — defined in domain](#repository-interface--defined-in-domain)
  - [Application Service — orchestrates a use case](#application-service--orchestrates-a-use-case)
- [Bounded Contexts](#bounded-contexts)
- [Wiring](#wiring)

## When to Use

Apply DDD when the business domain is complex enough that the code structure should mirror the business model — typically services with 5K+ lines, multiple bounded contexts, or rich business rules. Do NOT use for simple CRUD apps or CLI tools.

## Building Blocks

| Concept | Go Mapping | Purpose |
| --- | --- | --- |
| **Entity** | Struct with identity field | Has unique ID, mutable state, lifecycle |
| **Value Object** | Immutable struct, compared by value | No identity — represents a measurement, quantity, or descriptor |
| **Aggregate** | Entity + child entities/value objects | Consistency boundary — all mutations go through the root |
| **Repository** | Interface in domain, impl in infrastructure | Persistence abstraction for aggregates |
| **Domain Service** | Function or struct in domain package | Logic that spans multiple aggregates |
| **Domain Event** | Struct describing a fact that happened | Decouples bounded contexts |

## Project Structure

Organize by **bounded context**, grouping domain, application, and adapters vertically. This scales across multiple contexts and clarifies ownership.

```
order-service/
├── cmd/
│   └── server/
│       └── main.go                  # Wiring only
├── internal/
│   ├── order/                       # Bounded context: Order
│   │   ├── domain/
│   │   │   ├── order.go             # Order aggregate root
│   │   │   ├── item.go              # OrderItem entity
│   │   │   ├── status.go            # OrderStatus enum
│   │   │   ├── repository.go        # OrderRepository interface
│   │   │   └── events.go            # OrderPlaced, OrderShipped events
│   │   ├── application/
│   │   │   ├── place_order.go       # PlaceOrderHandler (command)
│   │   │   └── get_order.go         # GetOrderHandler (query)
│   │   └── adapters/
│   │       ├── persistence/
│   │       │   └── postgres.go      # OrderRepository implementation
│   │       └── http/
│   │           └── handler.go       # HTTP transport
│   ├── billing/                     # Bounded context: Billing (another example)
│   │   ├── domain/
│   │   ├── application/
│   │   └── adapters/
│   ├── shared/
│   │   └── money.go                 # Value object reused across contexts
│   └── events/
│       └── publisher.go             # Shared event bus (infrastructure)
├── go.mod
└── go.sum
```

**Key principles:**

- Group each bounded context **vertically** (domain → application → adapters), not by technical role
- Use `adapters/` instead of `infrastructure/` to be explicit about Hexagonal Architecture
- Make cross-context boundaries explicit (see **Bounded Contexts** section below)
- Place shared infrastructure (event bus, logging) at `internal/{shared}/` or `internal/events/`

## Code Examples

### Value Object — Money

```go
// internal/domain/shared/money.go
package shared

type Money struct {
    amount   int64  // cents — avoids float precision issues
    currency string
}

func NewMoney(amount int64, currency string) (Money, error) {
    if currency == "" {
        return Money{}, errors.New("currency is required")
    }
    return Money{amount: amount, currency: currency}, nil
}

func (m Money) Add(other Money) (Money, error) {
    if m.currency != other.currency {
        return Money{}, fmt.Errorf("cannot add %s to %s", other.currency, m.currency)
    }
    return Money{amount: m.amount + other.amount, currency: m.currency}, nil
}
```

### Aggregate Root — Order

```go
// internal/domain/order/order.go
package order

type Order struct {
    id     string
    items  []Item
    status Status
    total  shared.Money
}

func NewOrder(id string) *Order {
    return &Order{id: id, status: StatusDraft}
}

// All mutations go through the aggregate root
func (o *Order) AddItem(item Item) error {
    if o.status != StatusDraft {
        return ErrOrderNotEditable
    }
    o.items = append(o.items, item)
    return o.recalculateTotal()
}

func (o *Order) Place() (OrderPlaced, error) {
    if len(o.items) == 0 {
        return OrderPlaced{}, ErrEmptyOrder
    }
    o.status = StatusPlaced
    return OrderPlaced{OrderID: o.id, Total: o.total}, nil
}
```

### Repository Interface — defined in domain

```go
// internal/order/domain/repository.go
package domain

type Repository interface {
    Save(ctx context.Context, order *Order) error
    FindByID(ctx context.Context, id string) (*Order, error)
}
```

The implementation lives in `internal/order/adapters/persistence/postgres.go` and depends on the domain — never the reverse.

### Application Service — orchestrates a use case

```go
// internal/order/application/place_order.go
package application

import (
    "context"
    "fmt"

    "myapp/internal/order/domain"
)

type PlaceOrderHandler struct {
    orders domain.Repository
    events EventPublisher
}

func (h *PlaceOrderHandler) Handle(ctx context.Context, cmd PlaceOrderCommand) error {
    order, err := h.orders.FindByID(ctx, cmd.OrderID)
    if err != nil {
        return fmt.Errorf("finding order: %w", err)
    }

    evt, err := order.Place()
    if err != nil {
        return fmt.Errorf("placing order: %w", err)
    }

    if err := h.orders.Save(ctx, order); err != nil {
        return fmt.Errorf("saving order: %w", err)
    }

    return h.events.Publish(ctx, evt)
}
```

## Bounded Contexts

Each bounded context maps to a top-level package under `internal/` with its own domain, application, and adapters. Contexts communicate through domain events or explicit anti-corruption layers — never by importing each other's internal types directly.

**Anti-corruption layer example:** If `billing/` needs to consume an `order.OrderPlaced` event, translate it to a billing-specific type:

```go
// internal/billing/adapters/events/order_events.go
package events

import (
    "myapp/internal/events"
    "myapp/internal/billing/domain"
)

type OrderPlacedSubscriber struct {
    invoices domain.InvoiceRepository
}

// Receives order.OrderPlaced, translates to billing domain
func (s *OrderPlacedSubscriber) OnOrderPlaced(evt events.OrderPlaced) error {
    // Translate and create invoice
    return s.invoices.Create(evt.OrderID, evt.Total)
}
```

This prevents billing from depending on order's internal types.

For large systems, each context can be its own Go module in a workspace (`go.work`). See the `samber/cc-skills-golang@golang-project-layout` skill for workspace setup.

## Wiring

Wire dependencies in `cmd/server/main.go` using manual constructor injection. → See `samber/cc-skills-golang@golang-dependency-injection` skill for DI library alternatives.


## Source Reference: `golang-design-patterns/references/hexagonal-architecture.md`

# Hexagonal Architecture (Ports & Adapters) in Go

## Table of Contents

- [When to Use](#when-to-use)
- [Core Concepts](#core-concepts)
- [Project Structure](#project-structure)
- [Code Examples](#code-examples)
  - [Domain — pure business logic](#domain--pure-business-logic)
  - [Ports — interfaces defined separately from implementations](#ports--interfaces-defined-separately-from-implementations)
  - [Service — implements primary port, depends on secondary ports](#service--implements-primary-port-depends-on-secondary-ports)
  - [Primary Adapter — HTTP handler calls the service port](#primary-adapter--http-handler-calls-the-service-port)
  - [Secondary Adapter — implements a driven port](#secondary-adapter--implements-a-driven-port)
- [Multiple Entry Points](#multiple-entry-points)
- [Wiring](#wiring)

## When to Use

Apply hexagonal architecture when a service interacts with multiple external systems (databases, APIs, message queues, caches) and you want the domain logic fully decoupled from all of them. Particularly effective when the same business logic needs multiple entry points (HTTP, gRPC, CLI, message consumer). Do NOT use for simple CRUD apps or libraries.

## Core Concepts

- **Domain** — Business logic and types. No external dependencies.
- **Ports** — Interfaces that define how the domain interacts with the outside world.
  - **Primary (driving) ports**: How the outside world calls into the domain (e.g., `OrderService` interface).
  - **Secondary (driven) ports**: How the domain calls out to infrastructure (e.g., `OrderRepository`, `PaymentGateway` interfaces).
- **Adapters** — Concrete implementations of ports.
  - **Primary adapters**: HTTP handlers, gRPC servers, CLI commands — they call primary ports.
  - **Secondary adapters**: PostgreSQL repository, Stripe client, Redis cache — they implement secondary ports.

## Project Structure

```
order-service/
├── cmd/
│   ├── server/
│   │   └── main.go                  # HTTP server wiring
│   └── worker/
│       └── main.go                  # Message consumer wiring
├── internal/
│   ├── domain/
│   │   ├── order.go                 # Order entity + business rules
│   │   ├── item.go                  # OrderItem
│   │   └── status.go               # OrderStatus enum
│   ├── port/
│   │   ├── incoming.go             # Primary ports (OrderService interface)
│   │   └── outgoing.go             # Secondary ports (OrderRepository, PaymentGateway)
│   ├── service/
│   │   └── order_service.go        # Implements primary ports — orchestrates domain + secondary ports
│   └── adapter/
│       ├── primary/
│       │   ├── http/
│       │   │   ├── router.go
│       │   │   └── order_handler.go # HTTP adapter — calls OrderService
│       │   └── grpc/
│       │       └── order_server.go  # gRPC adapter — calls OrderService
│       └── secondary/
│           ├── postgres/
│           │   └── order_repo.go    # Implements OrderRepository
│           └── stripe/
│               └── payment.go      # Implements PaymentGateway
├── go.mod
└── go.sum
```

## Code Examples

### Domain — pure business logic

```go
// internal/domain/order.go
package domain

type Order struct {
    ID     string
    Items  []Item
    Status OrderStatus
}

func (o *Order) Ship() error {
    if o.Status != StatusPaid {
        return ErrOrderNotPaid
    }
    o.Status = StatusShipped
    return nil
}
```

### Ports — interfaces defined separately from implementations

```go
// internal/port/incoming.go
package port

// Primary port — how the outside world drives the application
type OrderService interface {
    PlaceOrder(ctx context.Context, items []domain.Item) (string, error)
    ShipOrder(ctx context.Context, orderID string) error
    GetOrder(ctx context.Context, orderID string) (*domain.Order, error)
}
```

```go
// internal/port/outgoing.go
package port

// Secondary ports — how the application reaches external systems
type OrderRepository interface {
    Save(ctx context.Context, order *domain.Order) error
    FindByID(ctx context.Context, id string) (*domain.Order, error)
}

type PaymentGateway interface {
    Charge(ctx context.Context, orderID string, amount int64) error
}
```

### Service — implements primary port, depends on secondary ports

```go
// internal/service/order_service.go
package service

type orderService struct {
    orders   port.OrderRepository
    payments port.PaymentGateway
}

func NewOrderService(orders port.OrderRepository, payments port.PaymentGateway) port.OrderService {
    return &orderService{orders: orders, payments: payments}
}

func (s *orderService) PlaceOrder(ctx context.Context, items []domain.Item) (string, error) {
    order := domain.NewOrder(items)

    if err := s.payments.Charge(ctx, order.ID, order.Total()); err != nil {
        return "", fmt.Errorf("charging payment: %w", err)
    }

    if err := s.orders.Save(ctx, order); err != nil {
        return "", fmt.Errorf("saving order: %w", err)
    }

    return order.ID, nil
}
```

### Primary Adapter — HTTP handler calls the service port

```go
// internal/adapter/primary/http/order_handler.go
package http

type OrderHandler struct {
    svc port.OrderService
}

func NewOrderHandler(svc port.OrderService) *OrderHandler {
    return &OrderHandler{svc: svc}
}

func (h *OrderHandler) HandlePlaceOrder(w http.ResponseWriter, r *http.Request) {
    var req PlaceOrderRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request", http.StatusBadRequest)
        return
    }

    id, err := h.svc.PlaceOrder(r.Context(), req.Items)
    if err != nil {
        http.Error(w, err.Error(), mapToHTTPStatus(err))
        return
    }

    json.NewEncoder(w).Encode(map[string]string{"id": id})
}
```

### Secondary Adapter — implements a driven port

```go
// internal/adapter/secondary/postgres/order_repo.go
package postgres

type OrderRepo struct {
    db *sql.DB
}

func NewOrderRepo(db *sql.DB) *OrderRepo {
    return &OrderRepo{db: db}
}

func (r *OrderRepo) Save(ctx context.Context, order *domain.Order) error {
    // SQL upsert
}

func (r *OrderRepo) FindByID(ctx context.Context, id string) (*domain.Order, error) {
    // SQL query
}
```

## Multiple Entry Points

The hexagonal approach shines when the same `OrderService` is called from different primary adapters — HTTP for external clients, gRPC for internal services, a message consumer for async events. Each adapter is wired in its own `cmd/` entry point.

## Wiring

Construct adapters and inject them in `cmd/server/main.go`. → See `samber/cc-skills-golang@golang-dependency-injection` skill for DI library alternatives.


## Source Reference: `golang-design-patterns/references/resource-management.md`

# Resource Management Patterns

## Table of Contents

- [Defer Close Immediately](#defer-close-immediately)
- [`runtime.AddCleanup` over `runtime.SetFinalizer`](#runtimeaddcleanup-over-runtimesetfinalizer)
- [Resource Pools](#resource-pools)
- [Graceful Shutdown](#graceful-shutdown)

## Defer Close Immediately

`defer Close()` MUST be called immediately after opening — NEVER delay. This prevents leaks when code is modified later and new return paths are added:

```go
// Good — defer is right next to open
f, err := os.Open(path)
if err != nil {
    return err
}
defer f.Close()

// Bad — Close() is far from Open(), easy to forget when adding early returns
f, err := os.Open(path)
if err != nil {
    return err
}
// ... 50 lines of code ...
f.Close() // might never run if a new return is added above
```

This applies to all closeable resources: files, SQL rows, HTTP response bodies, gzip readers, bufio scanners wrapping readers, etc.

```go
resp, err := http.Get(url)
if err != nil {
    return err
}
defer resp.Body.Close()

rows, err := db.QueryContext(ctx, query)
if err != nil {
    return err
}
defer rows.Close()
```

## `runtime.AddCleanup` over `runtime.SetFinalizer`

`runtime.AddCleanup` SHOULD be preferred over `runtime.SetFinalizer` (Go 1.24+):

```go
type Resource struct {
    handle uintptr
}

func NewResource() *Resource {
    r := &Resource{handle: acquireHandle()}
    runtime.AddCleanup(r, func(handle uintptr) {
        releaseHandle(handle)
    }, r.handle)
    return r
}
```

`AddCleanup` is preferred because:

- Multiple cleanups can be attached to the same object
- The cleanup function receives a copy of the value, not the object itself — no resurrection risk
- Cleanups run even if the object is part of a cycle

## Resource Pools

Resource pools SHOULD use channels with a fixed capacity for bounded allocation. Use channel-based pools or `sync.Pool` to manage limited resources between consumers. Always set a maximum size:

```go
type ConnPool struct {
    conns chan *Conn
}

func NewConnPool(maxSize int, factory func() (*Conn, error)) (*ConnPool, error) {
    pool := &ConnPool{
        conns: make(chan *Conn, maxSize),
    }
    // Pre-fill with initial connections
    for range maxSize {
        conn, err := factory()
        if err != nil {
            return nil, fmt.Errorf("creating connection: %w", err)
        }
        pool.conns <- conn
    }
    return pool, nil
}

func (p *ConnPool) Get(ctx context.Context) (*Conn, error) {
    select {
    case conn := <-p.conns:
        return conn, nil
    case <-ctx.Done():
        return nil, ctx.Err()
    }
}

func (p *ConnPool) Put(conn *Conn) {
    select {
    case p.conns <- conn:
    default:
        conn.Close() // pool is full, discard
    }
}
```

## Graceful Shutdown

Graceful shutdown MUST use `signal.NotifyContext` for clean termination. All resources (connections, files, channels) MUST be drained before process exit. Use `os/signal` and context cancellation:

```go
func main() {
    ctx, stop := signal.NotifyContext(context.Background(),
        syscall.SIGINT, syscall.SIGTERM,
    )
    defer stop()

    srv := &http.Server{Addr: ":8080", Handler: router}

    // Start server in background
    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            slog.Error("server error", "error", err)
        }
    }()

    slog.Info("server started", "addr", ":8080")

    // Wait for interrupt signal
    <-ctx.Done()
    slog.Info("shutting down...")

    // Give outstanding requests time to complete
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(shutdownCtx); err != nil {
        slog.Error("shutdown error", "error", err)
    }

    // Close other resources: database connections, message queues, etc.
    db.Close()
    slog.Info("shutdown complete")
}
```

This pattern applies to any long-running service — gRPC servers, message consumers, background workers. The key elements are:

1. Capture OS signals with `signal.NotifyContext`
2. Start the server in a goroutine
3. Block on context cancellation
4. Shut down with a timeout to drain in-flight requests
5. Close all remaining resources in order

For goroutine shutdown patterns, see the `samber/cc-skills-golang@golang-concurrency` skill.

