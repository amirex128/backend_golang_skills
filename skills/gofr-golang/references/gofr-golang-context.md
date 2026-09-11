# GoFr-Golang: Context

## GoFr adaptation rules

This is the GoFr-specific form of the general Golang guidance below. Use GoFr as the mandatory framework for service delivery: begin services with `gofr.New()`, keep GoFr lifecycle, configuration, health, structured logging, Prometheus metrics, OpenTelemetry tracing, datasource management, and graceful shutdown intact, and never silently replace GoFr with another web framework. Use the exact GoFr version installed by the project and verify version-sensitive APIs against the project module and official GoFr documentation.

Keep GoFr types at the adapter boundary. GoFr HTTP, gRPC, GraphQL, WebSocket, cron, and CLI handlers use the documented `func(c *gofr.Context) (any, error)` shape where applicable. Bind with `c.Bind(&value)` and check the error; read route parameters with `c.PathParam`, query values with `c.Param`, and return values/errors to GoFr instead of recreating response envelopes. Pass `*gofr.Context` through GoFr datasource/downstream calls for cancellation and trace propagation, but translate to application contracts before entering domain code.

The complete GoFr page set remains in the repository's `skills/gofr` Skill. Read the listed official pages there before implementing the relevant feature; these links are the authoritative framework-specific follow-up for this adapted reference.

## GoFr context adaptation

`*gofr.Context` is a framework boundary object, not a domain dependency. Preserve it through GoFr datasource and downstream calls where GoFr expects it. Extract only the standard `context.Context`, identity, request data, and application input needed by a use case before crossing into application/domain. Never store GoFr context in a long-lived struct or replace request cancellation with `context.Background()`.

## Required GoFr references

- `references-context.md` — https://gofr.dev/docs/references/context
- `quick-start-observability.md` — https://gofr.dev/docs/quick-start/observability
- `advanced-guide-http-communication.md` — https://gofr.dev/docs/advanced-guide/http-communication

## Unified Golang guidance

# Context

This reference consolidates all retained guidance from `golang-context`. Read it for the matching Go engineering task.


## Source Skill Guidance

> **Community default.** A company skill that explicitly supersedes `samber/cc-skills-golang@golang-context` skill takes precedence.

# Go context.Context Best Practices

`context.Context` is Go's mechanism for propagating cancellation signals, deadlines, and request-scoped values across API boundaries and between goroutines. Think of it as the "session" of a request — it ties together every operation that belongs to the same unit of work.

## Best Practices Summary

1. Propagate the same context through the entire request lifecycle: HTTP handler → service → DB → external APIs — any link that starts a fresh context keeps working after the client is gone.
2. Take `ctx` as the first parameter, named `ctx context.Context` — the fixed position is what makes context-aware APIs recognizable at a glance and what linters check.
3. Pass context through function parameters instead of storing it in a struct — the struct outlives the request that filled it, so later calls reuse a context that is already cancelled or belongs to someone else.
4. Pass `context.TODO()` rather than a `nil` context — `nil` panics on the first `Done()` or `Value()` call, far from the caller that passed it.
5. Call `cancel()` on all control-flow paths for `WithCancel`/`WithTimeout`/`WithDeadline`, unless ownership of the context and cancel function is explicitly returned or transferred — an uncalled `cancel()` keeps the child attached to its parent and leaks its timer until the parent finishes.
6. Create `context.Background()` only at top-level entry points (main, init, tests). Deeper in the call chain — especially mid-request — it detaches the work from the caller's deadline and cancellation, the propagation break shown below.
7. Use `context.TODO()` as a placeholder when a context is needed but none exists yet — it marks the gap for a later fix instead of hiding it behind a `Background()` that looks deliberate.
8. Declare context value keys as unexported types — with a plain `string` key, two packages using `"user"` silently overwrite each other.
9. Carry only request-scoped metadata in context values, never function parameters — values retrieved through `Value()` lose compile-time typing and disappear from the function signature.
10. Use `context.WithoutCancel` (Go 1.21+) when spawning background work that must outlive the parent request — otherwise the handler returning cancels the audit log or cleanup just started.

## Creating Contexts

| Situation | Use |
| --- | --- |
| Entry point (main, init, test) | `context.Background()` |
| Function needs context but caller doesn't provide one yet | `context.TODO()` |
| Inside an HTTP handler | `r.Context()` |
| Need cancellation control | `context.WithCancel(parentCtx)` |
| Need a deadline/timeout | `context.WithTimeout(parentCtx, duration)` |

## Context Propagation: The Core Principle

The most important rule: **propagate the same context through the entire call chain**. When you propagate correctly, cancelling the parent context cancels all downstream work automatically.

```go
// ✗ Bad — creates a new context, breaking the chain
func (s *OrderService) Create(ctx context.Context, order Order) error {
    return s.db.ExecContext(context.Background(), "INSERT INTO orders ...", order.ID)
}

// ✓ Good — propagates the caller's context
func (s *OrderService) Create(ctx context.Context, order Order) error {
    return s.db.ExecContext(ctx, "INSERT INTO orders ...", order.ID)
}
```

## Deep Dives

- **[Cancellation, Timeouts & Deadlines](./references/cancellation.md)** — How cancellation propagates: `WithCancel` for manual cancellation, `WithTimeout` for automatic cancellation after a duration, `WithDeadline` for absolute time deadlines. Patterns for listening (`<-ctx.Done()`) in concurrent code, `AfterFunc` callbacks, and `WithoutCancel` for operations that must outlive their parent request (e.g., audit logs).

- **[Context Values & Cross-Service Tracing](./references/values-tracing.md)** — Safe context value patterns: unexported key types to prevent namespace collisions, when to use context values (request ID, user ID) vs function parameters. Trace context propagation: OpenTelemetry trace headers, correlation IDs for log aggregation, and marshaling/unmarshaling context across service boundaries.

- **[Context in HTTP Servers & Service Calls](./references/http-services.md)** — HTTP handler context: `r.Context()` for request-scoped cancellation, middleware integration, and propagating to services. HTTP client patterns: `NewRequestWithContext`, client timeouts, and retries with context awareness. Database operations: always use `*Context` variants (`QueryContext`, `ExecContext`) to respect deadlines.

## Cross-References

- → See the `samber/cc-skills-golang@golang-concurrency` skill for goroutine cancellation patterns using context
- → See the `samber/cc-skills-golang@golang-database` skill for context-aware database operations (QueryContext, ExecContext)
- → See the `samber/cc-skills-golang@golang-observability` skill for trace context propagation with OpenTelemetry
- → See the `samber/cc-skills-golang@golang-design-patterns` skill for timeout and resilience patterns

## Enforce with Linters

Many context pitfalls are caught automatically by linters: `govet`, `staticcheck`. → See the `samber/cc-skills-golang@golang-lint` skill for configuration and usage.


## Source Reference: `golang-context/references/cancellation.md`

# Cancellation, Timeouts & Deadlines

## Table of Contents

- [Cancellation](#cancellation)
  - [Why `defer cancel()` matters](#why-defer-cancel-matters)
- [Timeouts and Deadlines](#timeouts-and-deadlines)
  - [`context.WithTimeout` — relative duration](#contextwithtimeout--relative-duration)
  - [`context.WithDeadline` — absolute point in time](#contextwithdeadline--absolute-point-in-time)
  - [Nested timeouts take the shorter deadline](#nested-timeouts-take-the-shorter-deadline)
- [Listening for Cancellation](#listening-for-cancellation)
  - [The `select` pattern](#the-select-pattern)
  - [Checking cancellation in loops](#checking-cancellation-in-loops)
- [`context.AfterFunc` (Go 1.21+)](#contextafterfunc-go-121)
- [`context.WithoutCancel` (Go 1.21+)](#contextwithoutcancel-go-121)

## Cancellation

`context.WithCancel` returns a derived context and a `cancel` function. When `cancel()` is called, the context's `Done()` channel is closed, signaling all listeners to stop.

```go
func processItems(ctx context.Context, items []Item) error {
    ctx, cancel := context.WithCancel(ctx)
    defer cancel() // always defer cancel to free resources

    errCh := make(chan error, len(items))
    for _, item := range items {
        go func(item Item) {
            errCh <- processOne(ctx, item)
        }(item)
    }

    for range items {
        if err := <-errCh; err != nil {
            cancel() // cancel remaining goroutines on first error
            return fmt.Errorf("processing items: %w", err)
        }
    }
    return nil
}
```

### Why `defer cancel()` matters

Every `WithCancel`, `WithTimeout`, and `WithDeadline` creates cancellation state; timeout/deadline contexts also use timer resources. `cancel()` MUST be called on all control-flow paths unless the function explicitly returns or transfers ownership of both the context and cancel function. In ordinary scoped work, defer cancel immediately.

```go
// ✗ Bad — cancel is never called, resources leak
func fetch(ctx context.Context) error {
    ctx, _ = context.WithTimeout(ctx, 5*time.Second)
    return doWork(ctx)
}

// ✓ Good — scoped work, defer cancel immediately
func fetch(ctx context.Context) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    return doWork(ctx)
}
```

## Timeouts and Deadlines

### `context.WithTimeout` — relative duration

```go
func (s *UserService) GetUser(ctx context.Context, id string) (*User, error) {
    ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
    defer cancel()

    return s.repo.FindByID(ctx, id)
}
```

### `context.WithDeadline` — absolute point in time

```go
func (s *BatchService) ProcessBatch(ctx context.Context, batch Batch) error {
    // The batch must complete by its SLA deadline
    ctx, cancel := context.WithDeadline(ctx, batch.SLADeadline)
    defer cancel()

    for _, item := range batch.Items {
        if err := s.process(ctx, item); err != nil {
            return fmt.Errorf("processing batch item %s: %w", item.ID, err)
        }
    }
    return nil
}
```

### Nested timeouts take the shorter deadline

If a parent context has a 5s timeout and you create a child with 10s, the child still expires at 5s. The shorter deadline always wins.

```go
// Parent has 2s timeout — child's 10s is effectively ignored
parentCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
defer cancel()

childCtx, childCancel := context.WithTimeout(parentCtx, 10*time.Second)
defer childCancel()
// childCtx expires after 2s, not 10s
```

## Listening for Cancellation

### The `select` pattern

Use `ctx.Done()` in a `select` statement to react to cancellation alongside other work:

```go
func poll(ctx context.Context, interval time.Duration) error {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return ctx.Err() // context.Canceled or context.DeadlineExceeded
        case <-ticker.C:
            if err := doWork(ctx); err != nil {
                return fmt.Errorf("polling: %w", err)
            }
        }
    }
}
```

### Checking cancellation in loops

For CPU-bound work, periodically check `ctx.Err()`:

```go
func processLargeDataset(ctx context.Context, items []Item) error {
    for i, item := range items {
        if ctx.Err() != nil {
            return fmt.Errorf("processing interrupted after %d/%d items: %w", i, len(items), ctx.Err())
        }
        process(item)
    }
    return nil
}
```

## `context.AfterFunc` (Go 1.21+)

Registers a callback that runs in its own goroutine when the context is cancelled. Useful for cleanup without blocking the main flow.

```go
func watchResource(ctx context.Context, res *Resource) {
    stop := context.AfterFunc(ctx, func() {
        // Runs in a new goroutine when ctx is cancelled
        res.Release()
    })

    // If you no longer need the callback, cancel it:
    // stop() returns true if the callback was successfully cancelled
    _ = stop
}
```

## `context.WithoutCancel` (Go 1.21+)

Creates a child context that is not cancelled when the parent is. Use this for background work that must continue after the request completes — like async logging, audit trails, or enqueuing follow-up tasks.

```go
func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    order, err := h.orderService.Create(ctx, req)
    if err != nil {
        // handle error
        return
    }

    // Audit log must complete even if the client disconnects.
    // WithoutCancel preserves context values (trace_id) but detaches cancellation.
    auditCtx := context.WithoutCancel(ctx)
    go h.auditService.LogOrderCreated(auditCtx, order)

    w.WriteHeader(http.StatusCreated)
}
```

Without `WithoutCancel`, you'd have to choose between `ctx` (which gets cancelled when the handler returns, killing your background work) and `context.Background()` (which loses trace_id and other values). `WithoutCancel` gives you the best of both: values are preserved, but cancellation is detached.


## Source Reference: `golang-context/references/http-services.md`

# Context in HTTP Servers & Service Calls

## Table of Contents

- [Context in HTTP Servers](#context-in-http-servers)
- [Middleware enriching context](#middleware-enriching-context)
- [Context in Calls to Other Services](#context-in-calls-to-other-services)

## Context in HTTP Servers

`http.Request` carries a context that is cancelled when the client disconnects or the request handler returns. MUST use `r.Context()` — NEVER create a new `context.Background()` inside a handler.

```go
func (h *Handler) GetOrder(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context() // this context is cancelled if the client disconnects

    order, err := h.orderService.Get(ctx, r.PathValue("id"))
    if err != nil {
        if ctx.Err() != nil {
            // Client disconnected, no point writing a response
            return
        }
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(order)
}
```

## Middleware enriching context

Middleware injects request-scoped values before handlers run. Use unexported key types to prevent collisions:

```go
// Helpers for trace propagation
type contextKey string
const (
    traceIDKey contextKey = "trace_id"
    spanIDKey  contextKey = "span_id"
)

func TracingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        traceID := r.Header.Get("X-Trace-ID")
        if traceID == "" {
            traceID = generateTraceID()
        }
        spanID := r.Header.Get("X-Span-ID")
        if spanID == "" {
            spanID = generateSpanID()
        }

        ctx := context.WithValue(r.Context(), traceIDKey, traceID)
        ctx = context.WithValue(ctx, spanIDKey, spanID)

        w.Header().Set("X-Trace-ID", traceID)
        w.Header().Set("X-Span-ID", spanID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Propagate trace context to downstream services
func (c *HTTPClient) Do(ctx context.Context, method, url string, body io.Reader) (*http.Response, error) {
    req, err := http.NewRequestWithContext(ctx, method, url, body)
    if err != nil {
        return nil, fmt.Errorf("creating request: %w", err)
    }

    if traceID, ok := ctx.Value(traceIDKey).(string); ok {
        req.Header.Set("X-Trace-ID", traceID)
    }
    if spanID, ok := ctx.Value(spanIDKey).(string); ok {
        req.Header.Set("X-Span-ID", spanID)
    }
    return c.client.Do(req)
}
```

## Context in Calls to Other Services

Context MUST be propagated to all HTTP clients and databases using context-aware APIs: `http.NewRequestWithContext`, `QueryContext`, `ExecContext`, and `QueryRowContext`. This ensures that client disconnections cancel all downstream operations.

```go
// ✗ Bad — downstream calls ignore the request context
func (c *PaymentClient) Charge(ctx context.Context, amount int) error {
    req, _ := http.NewRequest("POST", c.url+"/charge", body)
    return c.client.Do(req) // not context-aware
}

// ✓ Good — all downstream operations respect the context
func (c *PaymentClient) Charge(ctx context.Context, amount int) error {
    req, err := http.NewRequestWithContext(ctx, "POST", c.url+"/charge", body)
    if err != nil {
        return fmt.Errorf("creating request: %w", err)
    }
    return c.client.Do(req)
}
```

```go
// ✗ Bad — downstream calls ignore the request context
func (r *UserRepo) FindByID(ctx context.Context, id string) (*User, error) {
    row := r.db.QueryRow("SELECT * FROM users WHERE id = $1", id)
    // ...
}

// ✓ Good — all downstream operations respect the context
func (r *UserRepo) FindByID(ctx context.Context, id string) (*User, error) {
    row := r.db.QueryRowContext(ctx, "SELECT * FROM users WHERE id = $1", id)
    // ...
}
```


## Source Reference: `golang-context/references/values-tracing.md`

# Context Values & Cross-Service Tracing

## Using context values correctly

Context values carry request-scoped metadata that crosses API boundaries — not function parameters, configuration, or optional arguments. Good candidates: trace IDs, span IDs, request IDs, authenticated user info, correlation IDs.

Always use an unexported type as the key to prevent collisions between packages:

```go
// ✓ Good — unexported key type prevents collisions
type contextKey string

const (
    traceIDKey   contextKey = "trace_id"
    requestIDKey contextKey = "request_id"
)

func WithTraceID(ctx context.Context, traceID string) context.Context {
    return context.WithValue(ctx, traceIDKey, traceID)
}

func TraceIDFromContext(ctx context.Context) (string, bool) {
    traceID, ok := ctx.Value(traceIDKey).(string)
    return traceID, ok
}
```

```go
// ✗ Bad — string keys collide across packages
ctx = context.WithValue(ctx, "trace_id", traceID) // another package could use the same key
```

## What belongs in context values vs function parameters

| Data | Context value? | Why |
| --- | --- | --- |
| trace_id, span_id, request_id | Yes | Request-scoped metadata for observability |
| Authenticated user/tenant | Yes | Request-scoped, crosses API boundaries |
| Database connection | No | Infrastructure dependency, pass explicitly |
| Feature flags | No | Configuration, pass explicitly or inject |
| Function arguments (user ID, order data) | No | Business logic parameters, pass as arguments |
| Logger | Depends | OK if enriched with request-scoped fields (trace_id); otherwise pass explicitly |

## Trace propagation between services

In a microservices architecture, `context.Context` is the vehicle for trace propagation. When Service A calls Service B, the trace_id and span_id travel through context values and are injected into outgoing HTTP headers (typically via OpenTelemetry). This creates a connected trace across the entire request path.

```go
// Middleware injects trace_id from incoming request headers into context
func TracingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        traceID := r.Header.Get("X-Trace-ID")
        if traceID == "" {
            traceID = generateTraceID()
        }

        ctx := WithTraceID(r.Context(), traceID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// When making outbound HTTP calls, inject trace_id from context into headers
func (c *HTTPClient) Do(ctx context.Context, method, url string, body io.Reader) (*http.Response, error) {
    req, err := http.NewRequestWithContext(ctx, method, url, body)
    if err != nil {
        return nil, fmt.Errorf("creating request: %w", err)
    }

    // Propagate trace_id to downstream service
    if traceID, ok := TraceIDFromContext(ctx); ok {
        req.Header.Set("X-Trace-ID", traceID)
    }

    return c.client.Do(req)
}
```

With OpenTelemetry, this propagation is handled automatically through the `otel` SDK and `propagation.TraceContext`, but the mechanism is the same: context carries the trace state, and it must be propagated through every layer.

