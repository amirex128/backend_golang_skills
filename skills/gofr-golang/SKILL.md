---
name: gofr-golang
description: Build, review, test, secure, document, deploy, and scale production-ready Go 1.27 backends using the GoFr framework with Clean Architecture, CQRS, Repository Pattern, domain-driven design, concurrency, databases, observability, authentication, testing, and cloud operations. Use for any GoFr API, service, worker, CLI, datasource, integration, or backend architecture task.
license: Apache-2.0 and MIT; bundled GoFr and Golang references retain their original attribution and licensing.
metadata:
  author: amirex128
  project: backend-golang-skills
  framework: GoFr
  target_go: "1.27"
  source_gofr_references: 91
  adapted_golang_references: 19
  total_references: 110
  source: https://gofr.dev/llms.txt
---

# GoFr-Golang Backend Engineering Skill

Use this Skill for every backend task that uses GoFr. It combines the complete GoFr documentation snapshot with the unified Golang engineering Skill, rewritten at the integration boundary for GoFr. GoFr is the mandatory delivery framework; Clean Architecture, CQRS, Repository Pattern, and professional Go standards are the implementation baseline.

## Mandatory workflow

1. Inspect the repository: `go.mod`, pinned GoFr version, Go directive/toolchain, existing `gofr.New()` setup, routes, datasources, configuration, tests, deployment, and generated API files.
2. Read `references/gofr-AGENTS.md` first for every implementation. Then classify the request and read the exact GoFr references plus the matching `gofr-golang-*.md` Go reference from the router below.
3. Verify version-sensitive APIs against the installed GoFr module, GoDoc, official GoFr source, and the bundled source snapshot. Never invent a GoFr API from memory.
4. Implement with `gofr.New()` and the documented GoFr lifecycle. Keep GoFr handlers thin; put business rules in domain/application layers and concrete effects in infrastructure.
5. Preserve `*gofr.Context` at GoFr boundaries for cancellation and trace propagation. Translate it at the adapter boundary; do not put GoFr types in domain entities or application contracts.
6. Follow `references/gofr-golang-project-layout.md`: Clean Architecture dependency direction, explicit commands/queries, aggregate repositories for writes, read ports for queries, transaction boundaries, and outbox where required.
7. Validate with `gofmt`, `go vet ./...`, targeted tests, GoFr handler tests, integration tests, `go test ./...`, `go test -race ./...` for concurrent code, and security/deployment checks when relevant.
8. Report references read, GoFr version assumptions, commands and results, architectural decisions, configuration changes, and residual risks.

## Non-negotiable GoFr rules

- Start services with `gofr.New()` and preserve GoFr startup, shutdown, health, logging, metrics, and tracing conventions.
- Use the documented `func(c *gofr.Context) (any, error)` handler shape wherever GoFr exposes a handler.
- Use `{name}` route parameters, `c.PathParam("name")`, `c.Param("name")`, and `c.Bind(&value)` according to the exact GoFr reference; always check bind errors.
- Return values and errors to GoFr. Do not duplicate GoFr response envelopes or manually rebuild framework observability.
- Read configuration, ports, credentials, tokens, datasource settings, and feature flags through GoFr configuration. Never hardcode secrets.
- Pass `*gofr.Context` to GoFr datasource and downstream operations when supported.
- GoFr does not bundle an ORM by default. Prefer configured GoFr SQL/datasource APIs and plain SQL; introduce sqlc, GORM, or another companion only with a documented reason.
- Use GoFr middleware registration and standard `net/http` middleware shape where documented.
- Use GoFr health/readiness and datasource checks. Do not create competing health endpoints without a requirement.
- Return errors instead of using `panic` for control flow.
- Use GoFr's documented migration runner when it satisfies the requirement and read the exact datasource migration reference.
- Do not silently replace GoFr with another web framework, an ORM-first architecture, or net/http-only scaffolding.

## Clean Architecture and CQRS defaults

Use `references/gofr-golang-project-layout.md` as the architecture authority.

- **Domain:** GoFr-free aggregates, entities, value objects, domain errors, domain events, and write repository contracts.
- **Application:** commands, queries, handlers, DTOs, ports, authorization decisions, transaction boundaries, and orchestration.
- **Adapters:** GoFr HTTP/gRPC/GraphQL/WebSocket/CLI/messaging translation, binding, authentication extraction, presentation, and error mapping.
- **Infrastructure:** GoFr datasource adapters, SQL/NoSQL repositories, read queries, projections, outbox, clients, configuration, observability, and migrations.
- **Composition:** one wiring boundary that calls `gofr.New()`, configures GoFr, constructs dependencies, registers adapters, and starts the process.

Commands change state through an aggregate and its repository. Queries return purpose-built read models through query ports and must not mutate state. Do not introduce event sourcing, two databases, or distributed messaging merely because CQRS is present. Apply CQRS per bounded context/use case when complexity, read/write shape, workflow invariants, or scaling justify it.

## Capability router

Always read `references/gofr-AGENTS.md` and `references/gofr-golang-project-layout.md` for architecture-sensitive work. Read the primary GoFr references completely, then the paired Go reference.

| Request | Read GoFr references | Read paired Go reference |
|---|---|---|
| New GoFr service, lifecycle, first endpoint | `references/gofr-quick-start-introduction.md`, `references/gofr-references-context.md`, `references/gofr-quick-start-configuration.md` | `references/gofr-golang-project-layout.md`, `references/gofr-golang-code-style.md` |
| Routes, params, binding, responses | `references/gofr-quick-start-add-rest-handlers.md`, `references/gofr-references-context.md`, `references/gofr-advanced-guide-gofr-errors.md` | `references/gofr-golang-how-to.md`, `references/gofr-golang-error-handling.md` |
| Clean Architecture, CQRS, Repository Pattern, project structure | `references/gofr-quick-start-introduction.md`, `references/gofr-references-context.md`, `references/gofr-advanced-guide-dealing-with-sql.md`, `references/gofr-references-testing.md` | `references/gofr-golang-project-layout.md`, `references/gofr-golang-design-patterns.md`, `references/gofr-golang-refactoring.md` |
| SQL, transactions, repositories, migrations | `references/gofr-advanced-guide-dealing-with-sql.md`, `references/gofr-datasources-getting-started.md`, `references/gofr-advanced-guide-handling-data-migrations.md`, `references/gofr-references-gofrcli-migrate.md` | `references/gofr-golang-database.md`, `references/gofr-golang-error-handling.md`, `references/gofr-golang-testing.md` |
| Any named datasource | `references/gofr-datasources-getting-started.md` plus the exact `gofr-datasources-*.md` reference | `references/gofr-golang-database.md`, `references/gofr-golang-data-structures.md` |
| Redis/cache/key-value | `references/gofr-quick-start-connecting-redis.md`, `references/gofr-advanced-guide-key-value-store.md` | `references/gofr-golang-database.md`, `references/gofr-golang-context.md` |
| Configuration, environments, secrets | `references/gofr-quick-start-configuration.md`, `references/gofr-references-configs.md`, `references/gofr-guides-twelve-factor-config.md` | `references/gofr-golang-security.md`, `references/gofr-golang-documentation.md` |
| Authentication, authorization, RBAC | `references/gofr-advanced-guide-authentication.md`, `references/gofr-advanced-guide-rbac.md`, `references/gofr-guides-auth-in-kubernetes.md` | `references/gofr-golang-security.md`, `references/gofr-golang-error-handling.md` |
| Logging, metrics, tracing, health | `references/gofr-quick-start-observability.md`, exact custom metrics/tracing/health refs, relevant production guide | `references/gofr-golang-documentation.md`, `references/gofr-golang-troubleshooting.md`, `references/gofr-golang-context.md` |
| HTTP clients, resilience, circuit breaker | `references/gofr-advanced-guide-http-communication.md`, `references/gofr-advanced-guide-circuit-breaker.md` | `references/gofr-golang-context.md`, `references/gofr-golang-error-handling.md`, `references/gofr-golang-concurrency.md` |
| gRPC, streaming, GraphQL, WebSocket | exact `gofr-advanced-guide-grpc*.md`, `references/gofr-advanced-guide-graphql.md`, or `references/gofr-advanced-guide-websocket.md` plus context | `references/gofr-golang-how-to.md`, `references/gofr-golang-context.md`, `references/gofr-golang-testing.md` |
| Pub/Sub, events, queues, outbox workers | `references/gofr-advanced-guide-using-publisher-subscriber.md`, monitoring and deployment references | `references/gofr-golang-concurrency.md`, `references/gofr-golang-project-layout.md`, `references/gofr-golang-security.md` |
| Cron, startup hooks, workers, graceful shutdown | `references/gofr-advanced-guide-using-cron.md`, `references/gofr-advanced-guide-startup-hooks.md`, `references/gofr-guides-graceful-shutdown.md` | `references/gofr-golang-concurrency.md`, `references/gofr-golang-context.md`, `references/gofr-golang-safety.md` |
| Files, static assets, uploads | `references/gofr-advanced-guide-handling-file.md`, `references/gofr-advanced-guide-serving-static-files.md` | `references/gofr-golang-security.md`, `references/gofr-golang-safety.md` |
| Swagger/OpenAPI | `references/gofr-advanced-guide-swagger-documentation.md`, `references/gofr-quick-start-add-rest-handlers.md` | `references/gofr-golang-swagger.md`, `references/gofr-golang-documentation.md` |
| Testing, mocks, integration | `references/gofr-references-testing.md`, context, and exact feature reference | `references/gofr-golang-testing.md`, `references/gofr-golang-testify.md`, `references/gofr-golang-concurrency.md` |
| Debugging, pprof, performance | `references/gofr-advanced-guide-debugging.md`, `references/gofr-advanced-guide-routing-performance.md`, observability | `references/gofr-golang-troubleshooting.md`, `references/gofr-golang-modernize.md` |
| Docker, Kubernetes, Helm, cloud, CI/CD | exact `gofr-guides-*.md` deployment references | `references/gofr-golang-documentation.md`, `references/gofr-golang-security.md`, `references/gofr-golang-testing.md` |
| General Go implementation, review, refactoring | `gofr-AGENTS.md`, `references/gofr-references-context.md`, exact GoFr feature reference | matching `gofr-golang-*.md` reference and `references/gofr-golang-project-layout.md` |

All GoFr references are available in this Skill under `references/gofr-*.md`; all 19 adapted Golang references are under `references/gofr-golang-*.md`. For an unlisted GoFr capability, search the reference filenames and `references/gofr-llms-index.md`, then read the exact page and the matching Go reference before implementation.

## GoFr-specific quality gate

Before completion, verify:

- [ ] GoFr version and Go 1.27 compatibility are known and recorded.
- [ ] `gofr.New()` owns lifecycle, configuration, observability, health, and shutdown.
- [ ] GoFr handlers only bind/validate/translate/call/present.
- [ ] Domain and application packages do not import GoFr, SQL drivers, ORM, or transport-generated types.
- [ ] Commands, queries, aggregate repositories, read ports, transaction boundaries, and outbox behavior are explicit.
- [ ] `*gofr.Context` is propagated correctly at framework and datasource boundaries.
- [ ] Errors are returned to GoFr and mapped at adapters without leaking internals.
- [ ] Datasource, migration, connection-pooling, locking, and retry behavior is tested.
- [ ] Health/readiness, logs, metrics, traces, graceful shutdown, and deployment behavior are checked.
- [ ] `gofmt`, `go vet`, GoFr tests, unit tests, integration tests, race tests, and security checks pass as applicable.
- [ ] The final response names the GoFr and Golang references used and reports all commands/results.

## Source coverage and version policy

This Skill contains the complete bundled GoFr reference snapshot represented by `https://gofr.dev/llms.txt` and all 19 adapted Golang references. See `docs/gofr-golang-source-map.json` for per-file source hashes and provenance. GoFr migration/comparison content remains excluded according to the repository scope. This snapshot is not a substitute for checking the project's pinned GoFr module and current official source when behavior is version-sensitive.
