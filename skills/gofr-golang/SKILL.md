---
name: gofr-golang
description: Build, review, refactor, test, secure, document, and deploy production-ready Go 1.27 backends with the GoFr framework. Use for GoFr APIs, services, workers, CLIs, datasources, Clean Architecture, CQRS, Repository Pattern, concurrency, context, security, testing, observability, and production operations.
license: Apache-2.0 and MIT; adapted references retain their original attribution and licensing.
metadata:
  author: amirex128
  project: backend-golang-skills
  framework: GoFr
  target_go: "1.27"
  adapted_golang_references: 19
  gofr_source: https://gofr.dev/llms.txt
---

# GoFr-Golang Engineering Skill

Use this Skill for every Golang backend task that uses GoFr. It contains exactly the 19 Golang engineering references, each rewritten with GoFr-specific implementation rules. Do not treat this as two independent Skills: the selected adapted reference is the complete workflow for the task, and its GoFr references identify the official framework pages to read before coding.

## Required operating procedure

1. Inspect the repository, `go.mod`, Go directive/toolchain, pinned GoFr version, `gofr.New()` setup, routes, datasources, configuration, tests, generated API files, and deployment files.
2. Read `references/gofr-golang-project-layout.md` for all architecture-sensitive work. For every implementation, read the selected `references/gofr-golang-*.md` reference completely and follow its **Required GoFr references** links in the existing `skills/gofr` Skill.
3. Verify version-sensitive GoFr APIs against the installed module, official GoFr source, and the project's pinned version. Never invent GoFr methods from memory.
4. Use GoFr as the mandatory framework: start with `gofr.New()`, preserve GoFr lifecycle/configuration/health/logging/metrics/tracing, use documented handlers and datasources, and do not replace GoFr with another web framework.
5. Keep GoFr at the adapter edge. Use `func(c *gofr.Context) (any, error)` where GoFr requires it, use `c.Bind`, `c.PathParam`, and `c.Param` as documented, check all errors, and return results/errors to GoFr. Do not put `*gofr.Context`, SQL rows, ORM models, generated transport types, or GoFr response objects in domain code.
6. Implement with Clean Architecture, CQRS, and Repository Pattern: domain rules inward, application use cases and ports, GoFr adapters outside, infrastructure implementations at the edge, commands for state changes, queries for reads, and one write repository per aggregate root where required.
7. Validate with `gofmt`, `go vet ./...`, targeted GoFr adapter tests, application/domain tests, integration tests, `go test ./...`, race tests for concurrent code, and deployment/security checks when relevant.
8. Report the adapted reference and GoFr pages used, GoFr/Go version assumptions, commands and results, architecture decisions, configuration changes, and remaining risks.

## Mandatory GoFr rules

- Call `gofr.New()` from the composition root and let GoFr own lifecycle and graceful shutdown.
- Preserve `*gofr.Context` for GoFr datasource/downstream calls and trace propagation; translate it before entering pure application/domain packages.
- Use GoFr's configured datasources and documented SQL/NoSQL APIs. Prefer plain SQL and focused infrastructure adapters; add companions only with a documented reason.
- Use GoFr's health endpoints and datasource checks instead of competing health systems.
- Use GoFr authentication/RBAC middleware for edge identity/access and keep business authorization in application use cases.
- Return errors through GoFr's documented error behavior; do not duplicate response envelopes or leak SQL/secrets/stack traces.
- Use GoFr's cron, Pub/Sub, startup hooks, and graceful-shutdown mechanisms for background work.
- Use GoFr's Swagger/OpenAPI workflow for API documentation and verify generated contracts against real routes.
- Treat the existing `skills/gofr` Skill and its official page references as the framework source of truth; do not rely on generic Go examples when GoFr documents a supported mechanism.

## Exact 19-reference router

| Task | Read this adapted reference |
|---|---|
| General GoFr implementation, style, handlers, API review | `references/gofr-golang-code-style.md`, `references/gofr-golang-how-to.md` |
| Goroutines, workers, Pub/Sub, cron, shutdown | `references/gofr-golang-concurrency.md`, `references/gofr-golang-context.md` |
| Context propagation and request lifecycle | `references/gofr-golang-context.md` |
| Binding structs, DTOs, aggregates, datasource models | `references/gofr-golang-data-structures.md` |
| SQL/NoSQL, transactions, datasources, migrations | `references/gofr-golang-database.md` |
| Design patterns and dependency injection | `references/gofr-golang-design-patterns.md` |
| Documentation, Swagger, configuration, operations | `references/gofr-golang-documentation.md`, `references/gofr-golang-swagger.md` |
| Errors and GoFr error responses | `references/gofr-golang-error-handling.md` |
| Practical feature implementation | `references/gofr-golang-how-to.md` |
| Go or GoFr modernization and version changes | `references/gofr-golang-modernize.md` |
| Naming, public APIs, domain language, GoFr API names | `references/gofr-golang-naming.md` |
| Clean Architecture, CQRS, Repository Pattern, project layout | `references/gofr-golang-project-layout.md` |
| Safe package and architecture refactoring | `references/gofr-golang-refactoring.md` |
| Nil/resource/lifecycle safety | `references/gofr-golang-safety.md` |
| Authentication, RBAC, secrets, validation, threat boundaries | `references/gofr-golang-security.md` |
| Swagger/OpenAPI implementation | `references/gofr-golang-swagger.md` |
| Testify and GoFr mocks | `references/gofr-golang-testify.md` |
| Unit, adapter, datasource, integration, race, fuzz, architecture tests | `references/gofr-golang-testing.md` |
| Debugging, profiling, GoFr health/observability incidents | `references/gofr-golang-troubleshooting.md` |

Every listed path exists and is one of the 19 adapted references. The adapted file contains the general Golang source knowledge plus its GoFr adaptation overlay and official GoFr page list. Do not load a copied GoFr page into this Skill; follow the listed page in the existing GoFr Skill when needed.

## Architecture enforcement

For new GoFr services, use this default flow:

```text
GoFr handler (*gofr.Context)
    → bind/validate/translate
    → application command or query
    → domain aggregate / application port
    → infrastructure GoFr datasource adapter
    → application result
    → GoFr response/error mapping
```

- `cmd/api/main.go` calls `gofr.New()`, constructs dependencies, registers handlers, and starts the app.
- `internal/domain` imports neither GoFr nor infrastructure.
- `internal/application` owns commands, queries, handlers, DTOs, ports, and transaction boundaries.
- `internal/adapter/gofrhttp` owns routes, binding, authentication extraction, response presentation, and GoFr error mapping.
- `internal/infrastructure` owns GoFr datasource adapters, repositories, SQL/NoSQL, clients, projections, outbox, configuration, and migrations.
- Commands load and save aggregates through repositories; queries use purpose-built read ports and never mutate hidden state.
- Use a transactional outbox when a state change and external publication must be atomic.

## Completion checklist

- [ ] The correct one of 19 adapted references was read completely.
- [ ] Its listed official GoFr pages were consulted for framework behavior.
- [ ] GoFr version and Go 1.27 compatibility were verified.
- [ ] `gofr.New()` and GoFr lifecycle/configuration/health/observability remain the source of truth.
- [ ] Handlers are thin and use documented `*gofr.Context` APIs.
- [ ] Domain/application packages do not import GoFr, SQL drivers, ORM, or transport types.
- [ ] Commands, queries, aggregate repositories, read ports, and transaction boundaries are explicit.
- [ ] Datasource, migration, locking, cancellation, retry, and error behavior are tested.
- [ ] Security, secrets, authentication, RBAC, logs, metrics, traces, readiness, and shutdown are reviewed.
- [ ] Formatting, vetting, unit/integration/adapter/race/security tests pass as applicable.
- [ ] The final report names references, GoFr pages, commands, results, assumptions, and risks.

## Source scope

This Skill intentionally contains exactly 19 adapted Golang references. The complete GoFr source pages remain in `skills/gofr`; `docs/gofr-golang-source-map.json` records the 19 source files and the GoFr pages read to adapt each one. This avoids duplicating the GoFr Skill while ensuring every Golang topic is implemented through GoFr conventions.
