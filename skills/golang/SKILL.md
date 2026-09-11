---
name: golang
description: Write, review, refactor, test, debug, secure, document, modernize, and architect production-quality Go 1.27 code. Use for any Golang task, including APIs, services, CLIs, libraries, concurrency, context, databases, errors, testing, security, performance, project layout, naming, documentation, Swagger, troubleshooting, and safe refactoring.
license: MIT; synthesized from the supplied Golang skill collection. Retain upstream notices where source material is redistributed.
metadata:
  author: amirex128
  project: backend-golang-skills
  source_skills: 19
  source_files: 183
  target_go: "1.27"
  progressive_disclosure: topic-routed references
---

# Unified Golang Engineering Skill

Apply this skill to every Go task. Treat the routing table as mandatory: classify the work, read the indicated reference files before coding, then implement, test, inspect, and report. Load multiple references when a task crosses boundaries; most real changes require a primary topic plus testing, errors, safety, and security review.

## Operating procedure

1. Inspect the repository first: `go.mod`, Go directive, packages, existing conventions, tests, CI, generated code, and configuration. Preserve established project conventions unless they violate correctness or security.
2. Classify the request with the router below and read all **required** references completely. Read the relevant **additional** references for cross-cutting concerns. Do not load every reference by default.
3. Prefer the standard library and the smallest dependency that solves the problem. Check the module's pinned versions and compatibility before using an API; use `go doc`, `gopls`, `go list`, and repository examples rather than guessing.
4. Build new backend work with the project's mandatory **Clean Architecture + CQRS** policy: domain rules point inward, application use cases own ports, adapters translate transport, infrastructure stays at the edge, commands handle state changes, and queries handle reads without hidden mutation. Avoid cleverness, premature abstractions, hidden globals, and unnecessary reflection.
5. Implement in small, reviewable changes. Preserve behavior during refactors with a safety net; do not mix a large structural rewrite with unrelated feature work.
6. Validate with `gofmt -w`, `go vet ./...`, targeted tests, `go test ./...`, `go test -race ./...` when concurrency or shared state is involved, fuzzing for parser/security boundaries, and `govulncheck ./...` for dependency/security work. Run relevant linters if configured.
7. Review the final diff for API compatibility, error context, resource cleanup, goroutine termination, data races, secret leakage, input validation, documentation, and maintainability.

## Non-negotiable Go defaults

- Use `gofmt`; never hand-format around it. Keep lines readable, break at semantic boundaries, and use early returns to keep the happy path flat.
- Use MixedCaps identifiers, lowercase singular package names, no `ALL_CAPS`, no `Get` prefix for getters, and `Err...` for sentinel errors. Keep exported APIs small and document exported declarations.
- Prefer `:=` for non-zero values and `var` for intentional zero values. Use keyed composite literals. Initialize maps and API-facing slices deliberately; never write to a nil map.
- Keep functions focused and parameter lists small. Pass `context.Context` first, then inputs; use pointers for mutation, large structs, or meaningful nil, not for small read-only values.
- Return errors for expected failures. Wrap with `%w` inside module boundaries, inspect with `errors.Is`/`errors.As`, aggregate independent failures with `errors.Join`, and do not log the same error at every layer.
- Every goroutine needs a clear owner, cancellation path, and termination condition. Bound queues, workers, buffers, retries, and connection pools.
- Propagate context through every I/O boundary. Never store context in a struct, use it as a random parameter bag, or replace a request context with `context.Background()`.
- Parameterize SQL and shell arguments. Validate untrusted input at boundaries. Keep secrets out of source, logs, URLs, config files, and error responses.
- Prefer interfaces at application consumption boundaries, not speculative abstractions. Keep domain/application independent of transport and infrastructure; use compile-time interface assertions where useful and avoid interface pollution.
- Use `crypto/rand` for security randomness, modern authenticated cryptography, TLS 1.2+ (prefer 1.3), secure cookies, and least-privilege dependencies.

## Capability router

| User intent | Read required references first | Then read when applicable |
|---|---|---|
| Any new Go code or code review | `references/style-naming.md`, `references/errors-safety.md` | `references/design-layout.md`, topic-specific file |
| Package/type/function naming | `references/style-naming.md` | `references/documentation.md`, `references/errors-safety.md` |
| Structs, interfaces, receivers, generics, Clean Architecture, CQRS | `references/design-layout.md` | `references/style-naming.md`, `references/data-structures.md` |
| New project, module, backend layout, Clean Architecture structure | `references/design-layout.md` | `references/tooling-refactoring.md`, `references/documentation.md` |
| Commands, queries, handlers, ports, projections, outbox | `references/design-layout.md` | `references/database.md`, `references/testing.md`, `references/concurrency-context.md` |
| Slices, maps, arrays, containers, pointers, generics | `references/data-structures.md`, `references/errors-safety.md` | `references/performance-testing.md` |
| Goroutines, channels, mutexes, worker pools, pipelines | `references/concurrency-context.md` | `references/errors-safety.md`, `references/testing.md`, `references/troubleshooting.md` |
| Context, cancellation, deadlines, request values | `references/concurrency-context.md` | `references/testing.md`, `references/security.md` |
| Errors, panic/recover, wrapping, logging failures | `references/errors-safety.md` | `references/security.md`, `references/testing.md` |
| SQL, database/sql, pgx/sqlx, transactions, locking, scanning | `references/database.md` | `references/security.md`, `references/testing.md`, `references/performance-testing.md` |
| Tests, mocks, HTTP tests, integration, fuzzing | `references/testing.md` | `references/database.md`, `references/concurrency-context.md`, `references/security.md` |
| Testify assertions, mocks, suites | `references/testing.md` | `references/testify-swagger.md` |
| API docs, OpenAPI, Swagger, swaggo | `references/testify-swagger.md` | `references/documentation.md`, `references/security.md` |
| Security audit, auth, crypto, cookies, SSRF, injection, secrets | `references/security.md` | `references/errors-safety.md`, `references/concurrency-context.md`, `references/testing.md` |
| Refactor, rename, extract, move packages, break cycles | `references/tooling-refactoring.md`, `references/testing.md` | `references/design-layout.md`, `references/style-naming.md` |
| Modernize Go or upgrade the Go/toolchain | `references/tooling-refactoring.md` | `references/testing.md`, `references/performance-testing.md` |
| Debug panic, compile error, deadlock, race, flaky test | `references/troubleshooting.md` | `references/errors-safety.md`, `references/concurrency-context.md`, `references/performance-testing.md` |
| Benchmark, profile, optimize, pprof | `references/performance-testing.md` | `references/troubleshooting.md`, `references/data-structures.md` |
| README, godoc, examples, CHANGELOG, project docs | `references/documentation.md` | `references/style-naming.md`, topic-specific file |
| Production readiness or CI quality gate | `references/security.md`, `references/testing.md`, `references/tooling-refactoring.md` | `references/troubleshooting.md`, `references/documentation.md` |

## Routing discipline

- Read the primary topic first; do not substitute a similarly named file. The reference files are compact syntheses, not optional background.
- For a new HTTP/database service, load `design-layout` first; then load `concurrency-context`, `errors-safety`, `database`, `testing`, and `security` in addition to the API-specific material. All new backend services must follow the Clean Architecture + CQRS layout in that reference.
- For a bug, start with `troubleshooting`, reproduce it with a focused test, then load the design topic that explains the root cause. Do not “fix” symptoms with arbitrary retries or sleeps.
- For optimization, measure first with benchmarks/profiles; then change one bottleneck at a time and compare with `benchstat`.
- For refactoring, establish tests and compile checks before changing structure; use semantic tooling such as `gopls` for renames and references.
- If a source skill appears to recommend an external library, verify whether the project already uses it and whether the standard library is sufficient.

## Completion checklist

- `gofmt`/`goimports` where configured; `go vet`; relevant linter; tests and race tests as applicable.
- No unchecked errors, accidental nil maps, leaked goroutines, unclosed resources, unbounded retries, context loss, data races, or secret exposure.
- Public API, error strings, package docs, examples, configuration, migrations, and operational behavior are documented as applicable.
- Report commands run, failures that remain, compatibility assumptions, and any intentionally deferred risks.
