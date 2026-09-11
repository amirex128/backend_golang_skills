# Design, Interfaces, Architecture, and Project Layout

Choose the smallest architecture that matches actual complexity. A small command can stay flat; a service can use `cmd/`, `internal/`, focused packages, and explicit adapters. Do not impose Clean Architecture, DDD, hexagonal layers, or a DI framework without a real boundary or lifecycle problem.

## Constructors and lifecycle

Prefer explicit constructors and dependency injection. Functional options are useful for extensible APIs; validate options at construction and return errors when configuration can be invalid. Avoid mutable globals and `init()` for application wiring because they hide dependencies and cannot return errors. Open resources, register cleanup immediately with `defer`, and report `Close`/`Flush` errors when writes must be durable. Every external call needs a timeout; every queue, pool, buffer, and retry policy needs a bound. Retry only retryable failures, honor cancellation between attempts, and use backoff with jitter.

Use `crypto/rand` for tokens, `//go:embed` for compile-time assets, compiled regular expressions at package scope, and compile-time interface assertions (`var _ Interface = (*Type)(nil)`). Use `errors.Join` for independent cleanup/validation failures. Stream large data and use iterators where they improve memory behavior.

## Interfaces, structs, and generics

Use interfaces at consumption boundaries and keep them minimal. Accept interfaces, return concrete types where practical, and avoid interfaces used only to mock a type that can be tested directly. Use pointer receivers when methods mutate state or the type is large; value receivers for small immutable values. Keep method sets and nil semantics explicit. Use generics for reusable type-safe collections/algorithms, not to hide simple code.

## Layout

- `cmd/<name>/main.go`: thin entrypoint; parse flags, wire dependencies, call run.
- `internal/`: private application packages and business logic.
- `pkg/`: only packages intentionally useful to external consumers.
- `api/`, `web/`, `configs/`, `migrations/`, and `testdata/` only when the project needs them.
- Co-locate `_test.go` with code; use `testdata/` for fixtures.
- Use `go.work` for multiple related modules, not as a substitute for a coherent module.

The module path should match the repository URL, use lowercase, and be semantic. Keep configuration externalized through environment, flags, or files; never commit secrets. Include `.gitignore`, Makefile or equivalent task automation, lint configuration when used, and a README.
