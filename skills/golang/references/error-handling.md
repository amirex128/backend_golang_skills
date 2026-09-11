# Error Handling

This reference consolidates all retained guidance from `golang-error-handling`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Persona:** You are a Go reliability engineer. You treat every error as an event that must either be handled or propagated with context — silent failures and duplicate logs are equally unacceptable.

**Orchestration mode:** Fan out the five category sub-agents described in the "Parallelizing Error Handling Audits" section (creation, wrapping, single-handling rule, panic/recover, structured logging) for auditing error handling across a large codebase, and consolidate their findings. On Claude Code, use `ultracode` to opt into multi-agent orchestration explicitly.

**Modes:**

- **Coding mode** — writing new error handling code. Follow the best practices sequentially; optionally launch a background sub-agent to grep for violations in adjacent code (swallowed errors, log-and-return pairs) without blocking the main implementation.
- **Review mode** — reviewing a PR's error handling changes. Focus on the diff: check for swallowed errors, missing wrapping context, log-and-return pairs, and panic misuse. Sequential.
- **Audit mode** — auditing existing error handling across a codebase. Use up to 5 parallel sub-agents, each targeting an independent category (creation, wrapping, single-handling rule, panic/recover, structured logging).

> **Community default.** A company skill that explicitly supersedes `samber/cc-skills-golang@golang-error-handling` skill takes precedence.

# Go Error Handling Best Practices

This skill guides the creation of robust, idiomatic error handling in Go applications. Follow these principles to write maintainable, debuggable, and production-ready error code.

## Best Practices Summary

1. **Returned errors MUST always be checked** — NEVER discard with `_`
2. **Errors MUST be wrapped with context** using `fmt.Errorf("{context}: %w", err)`
3. **Error strings MUST be lowercase**, without trailing punctuation
4. **Use `%w` internally, `%v` at system boundaries** to control error chain exposure
5. **MUST use `errors.Is` for sentinel matching and `errors.As`/`errors.AsType` for typed chain inspection** instead of direct comparison or bare type assertions. For Go 1.26+, prefer `errors.AsType[T](err)` when `T` implements `error`; use `errors.As(err, &target)` for Go <1.26 or for non-error interface targets.
6. **SHOULD use `errors.Join`** (Go 1.20+) to combine independent errors
7. **Errors MUST be either logged OR returned**, NEVER both (single handling rule)
8. **Use sentinel errors** for expected conditions, custom types for carrying data
9. **NEVER use `panic` for expected error conditions** — reserve for truly unrecoverable states
10. **SHOULD use `slog`** (Go 1.21+) for structured error logging — not `fmt.Println` or `log.Printf`
11. **Use `samber/oops`** for production errors needing stack traces, user/tenant context, or structured attributes
12. **Log HTTP requests** with structured middleware capturing method, path, status, and duration
13. **Use log levels** to indicate error severity
14. **Never expose technical errors to users** — translate internal errors to user-friendly messages, log technical details separately
15. **Keep log grouping low-cardinality** — at logging/APM boundaries, keep message templates stable and attach IDs, paths, line numbers, and counts as structured attributes. Error values may include useful operational context, but avoid putting high-cardinality data into the stable log message used for grouping.

## Detailed Reference

- **[Error Creation](./references/error-creation.md)** — How to create errors that tell the story: error messages should be lowercase, no punctuation, and describe what happened without prescribing action. Covers sentinel errors (one-time preallocation for performance), custom error types (for carrying rich context), and the decision table for which to use when.

- **[Error Wrapping and Inspection](./references/error-wrapping.md)** — Why `fmt.Errorf("{context}: %w", err)` beats `fmt.Errorf("{context}: %v", err)` (chains vs concatenation). How to inspect chains with `errors.Is`, `errors.As`, and Go 1.26+ `errors.AsType` for type-safe error handling, and `errors.Join` for combining independent errors.

- **[Error Handling Patterns and Logging](./references/error-handling.md)** — The single handling rule: errors are either logged OR returned, NEVER both (prevents duplicate logs cluttering aggregators). Panic/recover design, `samber/oops` for production errors, and `slog` structured logging integration for APM tools.

## Parallelizing Error Handling Audits

When auditing error handling across a large codebase, use up to 5 parallel sub-agents — each targets an independent error category:

- Sub-agent 1: Error creation — validate `errors.New`/`fmt.Errorf` usage, low-cardinality messages, custom types
- Sub-agent 2: Error wrapping — audit `%w` vs `%v`, verify `errors.Is`/`errors.As` patterns
- Sub-agent 3: Single handling rule — find log-and-return violations, swallowed errors, discarded errors (`_`)
- Sub-agent 4: Panic/recover — audit `panic` usage, verify recovery at goroutine boundaries
- Sub-agent 5: Structured logging — verify `slog` usage at error sites, check for PII in error messages

## Cross-References

- → See `samber/cc-skills-golang@golang-samber-oops` for full samber/oops API, builder patterns, and logger integration
- → See `samber/cc-skills-golang@golang-observability` for structured logging setup, log levels, and request logging middleware
- → See `samber/cc-skills-golang@golang-safety` for nil interface trap and nil error comparison pitfalls
- → See `samber/cc-skills-golang@golang-naming` for error naming conventions (ErrNotFound, PathError)
- → See `samber/cc-skills-golang@golang-continuous-integration` skill for automated AI-driven code review in CI using these guidelines

## References

- [lmittmann/tint](https://github.com/lmittmann/tint)
- [samber/oops](https://github.com/samber/oops)
- [samber/slog-multi](https://github.com/samber/slog-multi)
- [samber/slog-sampling](https://github.com/samber/slog-sampling)
- [samber/slog-formatter](https://github.com/samber/slog-formatter)
- [samber/slog-http](https://github.com/samber/slog-http)
- [samber/slog-sentry](https://github.com/samber/slog-sentry)
- [log/slog package](https://pkg.go.dev/log/slog)


## Source Reference: `golang-error-handling/references/error-creation.md`

# Error Creation

## Table of Contents

- [Errors as Values](#errors-as-values)
- [Error String Conventions](#error-string-conventions)
- [Creating Errors](#creating-errors)
  - [`errors.New` — static error messages](#errorsnew--static-error-messages)
  - [`fmt.Errorf` — dynamic error messages](#fmterrorf--dynamic-error-messages)
  - [Decision table: which error strategy to use](#decision-table-which-error-strategy-to-use)
- [Low-Cardinality Error Messages](#low-cardinality-error-messages)
- [Custom Error Types](#custom-error-types)
  - [Custom types that wrap other errors](#custom-types-that-wrap-other-errors)

## Errors as Values

Go treats errors as ordinary values implementing the `error` interface:

```go
type error interface {
    Error() string
}
```

This means errors are returned, not thrown. Every function that can fail returns an `error` as its last return value, and every caller must check it.

```go
// ✗ Bad — silently discarding errors
data, _ := os.ReadFile("config.yaml")

// ✗ Bad — only checking in some branches
result, err := doSomething()
fmt.Println(result) // using result without checking err

// ✓ Good — always check before using other return values
data, err := os.ReadFile("config.yaml")
if err != nil {
    return fmt.Errorf("reading config: %w", err)
}
```

## Error String Conventions

Error strings MUST be lowercase, without trailing punctuation, and should not duplicate the context that wrapping will add.

```go
// ✗ Bad — capitalized, punctuation, redundant prefix
return errors.New("Failed to connect to database.")
return fmt.Errorf("UserService: failed to fetch user: %w", err)

// ✓ Good — lowercase, no punctuation, concise
return errors.New("connection refused")
return fmt.Errorf("fetching user: %w", err)
```

When errors are wrapped through multiple layers, each layer adds its own prefix. The result reads like a chain:

```
creating order: charging card: connecting to payment gateway: connection refused
```

## Creating Errors

### `errors.New` — static error messages

```go
var ErrNotFound = errors.New("not found")
var ErrUnauthorized = errors.New("unauthorized")
```

### `fmt.Errorf` — dynamic error messages

```go
import "github.com/samber/oops"

// ✗ Avoid at log/APM boundaries — each user/tenant combo becomes a unique group
return fmt.Errorf("user %s not found in tenant %s", userID, tenantID)

// ✓ Prefer for grouped production errors — static message, variable data as structured attributes
return oops.With("user_id", userID).With("tenant_id", tenantID).Errorf("user not found")
```

See [Low-Cardinality Error Messages](#low-cardinality-error-messages) for why this matters.

### Decision table: which error strategy to use

| Situation | Strategy | Example |
| --- | --- | --- |
| Caller needs to match a specific condition | Sentinel error (`errors.New` as package var) | `var ErrNotFound = errors.New("not found")` |
| Caller needs to extract structured data | Custom error type | `type ValidationError struct { Field, Msg string }` |
| Error is purely informational, not matched on | `fmt.Errorf` or `errors.New` | `fmt.Errorf("connecting to %s: %w", addr, err)` |
| Need stack traces, user context, structured attrs | `samber/oops` | See [Why Use samber/oops](./error-handling.md#why-use-samberoops) |

## Low-Cardinality Error Messages

APM and log aggregation tools (Datadog, Loki, Sentry) commonly group events by the logged message or exception fingerprint. When the stable log message contains variable data, every unique combination can create a separate group — dashboards become noisy and alerting breaks.

```go
import "github.com/samber/oops"

// ✗ Bad at the log boundary — each file/line combo can create a unique group
fmt.Errorf("error in %s at line %d of the csv", csvPath, line)

// ✓ Good (stdlib) — static error, structured attributes at the log site
err := errors.New("csv parsing error")
// ... later, at the logging boundary:
slog.Error("csv parsing failed", "error", err, "csv_file_path", csvPath, "csv_file_line", line)

// ✓ Good (samber/oops, external dependency) — attributes travel with the error
oops.With("csv_file_path", csvPath).With("csv_file_line", line).Errorf("csv parsing error")
```

The stdlib approach works but scatters context: the error travels up the stack and the handler logging it may no longer have access to the variable data. `samber/oops` (external dependency `github.com/samber/oops`) solves this by attaching structured attributes directly to the error, so they're available wherever the error is eventually logged.

**Static wrapping prefixes are fine** — `fmt.Errorf("fetching user: %w", err)` is low-cardinality because the prefix never changes. Dynamic context in returned errors is sometimes useful for CLI output or debugging, but production logging should keep the grouping message stable and attach IDs, paths, counts, and other variable data as structured attributes.

## Custom Error Types

Create custom error types when callers need to extract structured data from errors.

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// Usage
func validateAge(age int) error {
    if age < 0 {
        return &ValidationError{Field: "age", Message: "must be non-negative"}
    }
    return nil
}
```

### Custom types that wrap other errors

Implement `Unwrap()` so `errors.Is` and `errors.As` can traverse the chain:

```go
type QueryError struct {
    Query string
    Err   error
}

func (e *QueryError) Error() string {
    return fmt.Sprintf("query %q: %v", e.Query, e.Err)
}

func (e *QueryError) Unwrap() error {
    return e.Err
}
```


## Source Reference: `golang-error-handling/references/error-handling.md`

# Error Handling Patterns and Logging

## Table of Contents

- [The Single Handling Rule](#the-single-handling-rule)
- [Panic and Recover](#panic-and-recover)
  - [When to panic](#when-to-panic)
  - [Recovering from panics](#recovering-from-panics)
- [Why Use `samber/oops`](#why-use-samberoops)
- [Logging Errors with `slog`](#logging-errors-with-slog)

## The Single Handling Rule

An error MUST be handled exactly once: either log it or return it, never both. Doing both causes duplicate log entries and makes debugging harder.

```go
// ✗ Bad — logs AND returns (duplicate noise)
func processOrder(id string) error {
    err := chargeCard(id)
    if err != nil {
        log.Printf("failed to charge card: %v", err)
        return fmt.Errorf("charging card: %w", err)
    }
    return nil
}

// ✓ Good — return with context, let the caller decide
func processOrder(id string) error {
    err := chargeCard(id)
    if err != nil {
        return oops.
            With("order_id", id).
            Wrapf(err, "charging card")
    }
    return nil
}

// ✓ Good — handle at the top level (HTTP handler, main, etc.)
func handleOrder(w http.ResponseWriter, r *http.Request) {
    err := processOrder(r.FormValue("id"))
    if err != nil {
        slog.Error("order failed", "error", err)
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }
    w.WriteHeader(http.StatusOK)
}
```

## Panic and Recover

### When to panic

Panic MUST only be used for truly unrecoverable states — programmer errors, impossible conditions, or corrupt invariants. NEVER use panic for expected failures like network timeouts or missing files.

```go
// ✓ Acceptable — programmer error in initialization
func MustCompileRegex(pattern string) *regexp.Regexp {
    re, err := regexp.Compile(pattern)
    if err != nil {
        panic(fmt.Sprintf("invalid regex %q: %v", pattern, err))
    }
    return re
}

// ✗ Bad — panic for a normal failure
func GetUser(id string) *User {
    user, err := db.Find(id)
    if err != nil {
        panic(err) // callers cannot recover gracefully
    }
    return user
}
```

### Recovering from panics

Use `recover` in deferred functions at goroutine boundaries (HTTP handlers, worker goroutines) to prevent one panic from crashing the entire process.

```go
func safeHandler(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if r := recover(); r != nil {
                slog.Error("panic recovered",
                    "panic", r,
                    "stack", string(debug.Stack()),
                )
                http.Error(w, "internal error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

For structured panic recovery with `samber/oops`, see the `samber/cc-skills-golang@golang-samber-oops` skill.

## Why Use `samber/oops`

- **Stack traces** — you see `"connection refused"` but need to know where it originated
- **Structured context** — user ID, tenant ID, or request metadata attached to the error
- **Error codes** — machine-readable identifiers for monitoring dashboards
- **Public/private separation** — safe message to show end users
- ...

`samber/oops` is a **drop-in replacement** that fills these gaps. Every `oops` error implements the standard `error` interface, works with `errors.Is`/`errors.As`, and adds structured attributes:

```go
// ✗ Before — standard errors, no context
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderReq) error {
    err := s.db.Insert(ctx, req.Order)
    if err != nil {
        return fmt.Errorf("inserting order: %w", err)
    }
    return nil
}

// ✓ After — samber/oops, rich context for debugging
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderReq) error {
    err := s.db.Insert(ctx, req.Order)
    if err != nil {
        return oops.
            In("order-service").
            Code("order_insert_failed").
            User(req.UserID).
            With("order_id", req.Order.ID).
            Wrapf(err, "inserting order")
    }
    return nil
}
```

When this error is logged, you get the stack trace, user ID, order ID, domain, error code, and the full error chain — all structured and machine-parseable.

## Logging Errors with `slog`

→ See `samber/cc-skills-golang@golang-observability` skill for comprehensive structured logging guidance, including `slog` setup, log levels, log handlers, HTTP middleware, and cost considerations.


## Source Reference: `golang-error-handling/references/error-wrapping.md`

# Error Wrapping and Inspection

## Table of Contents

- [Error Wrapping with `%w`](#error-wrapping-with-w)
  - [`%w` vs `%v`: controlling exposure](#w-vs-v-controlling-exposure)
- [Inspecting Errors: `errors.Is` and `errors.As`](#inspecting-errors-errorsis-and-errorsas)
  - [`errors.Is` — match against a sentinel value](#errorsis--match-against-a-sentinel-value)
  - [`errors.As / errors.AsType` — extract a typed error from the chain](#errorsas--errorsastype--extract-a-typed-error-from-the-chain)
- [Combining Errors with `errors.Join`](#combining-errors-with-errorsjoin)
  - [Use case: validating multiple fields](#use-case-validating-multiple-fields)
  - [Use case: parallel operations with independent failures](#use-case-parallel-operations-with-independent-failures)
  - [`errors.Is` works through joined errors](#errorsis-works-through-joined-errors)

## Error Wrapping with `%w`

Wrapping preserves the original error in a chain that callers can inspect with `errors.Is` and `errors.As`. Errors SHOULD be wrapped at each layer to build a readable chain.

```go
// ✓ Good — wraps with context, preserves the chain
func (s *UserService) GetUser(id string) (*User, error) {
    user, err := s.repo.FindByID(id)
    if err != nil {
        return nil, fmt.Errorf("getting user %s: %w", id, err)
    }
    return user, nil
}
```

### `%w` vs `%v`: controlling exposure

Use `%w` within your module to preserve the error chain. Use `%v` at public API / system boundaries to prevent callers from depending on internal error types.

```go
// Internal layer — wrap to preserve chain
func (r *repo) fetch(id string) error {
    return fmt.Errorf("querying database: %w", err)
}

// Public API boundary — break chain to hide internals
func (s *PublicService) GetItem(id string) error {
    err := s.repo.fetch(id)
    if err != nil {
        return fmt.Errorf("item unavailable: %v", err) // %v — callers cannot unwrap
    }
    return nil
}
```

## Inspecting Errors: `errors.Is` and `errors.As`

### `errors.Is` — match against a sentinel value

```go
// ✗ Bad — direct comparison breaks on wrapped errors
if err == sql.ErrNoRows {

// ✓ Good — traverses the entire error chain
if errors.Is(err, sql.ErrNoRows) {
    return nil, ErrNotFound
}
```

### `errors.As / errors.AsType` — extract a typed error from the chain

```go
// ✗ Bad — type assertion breaks on wrapped errors
if ve, ok := err.(*ValidationError); ok {

// ✓ Good — traverses the entire error chain
var ve *ValidationError
if errors.As(err, &ve) {
    log.Printf("validation failed on field %s: %s", ve.Field, ve.Msg)
}

// ✓ Better (Go 1.26+) — same behavior, simpler syntax
if ve, ok := errors.AsType[*ValidationError](err); ok {
    log.Printf("validation failed on field %s: %s", ve.Field, ve.Msg)
}
```

## Combining Errors with `errors.Join`

`errors.Join` (Go 1.20+) combines multiple independent errors into one. The combined error works with `errors.Is` and `errors.As` — each inner error is inspectable.

### Use case: validating multiple fields

```go
func validateUser(u User) error {
    var errs []error

    if u.Name == "" {
        errs = append(errs, errors.New("name is required"))
    }
    if u.Email == "" {
        errs = append(errs, errors.New("email is required"))
    }

    return errors.Join(errs...) // returns nil if errs is empty
}
```

### Use case: parallel operations with independent failures

```go
func closeAll(closers ...io.Closer) error {
    var errs []error
    for _, c := range closers {
        if err := c.Close(); err != nil {
            errs = append(errs, err)
        }
    }
    return errors.Join(errs...)
}
```

### `errors.Is` works through joined errors

```go
err := errors.Join(ErrNotFound, ErrUnauthorized)

errors.Is(err, ErrNotFound)    // true
errors.Is(err, ErrUnauthorized) // true
```
