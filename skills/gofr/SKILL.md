---
name: gofr
description: Build, review, migrate, test, deploy, or document Go 1.27 backend services exclusively with the GoFr framework. Use this skill for REST, CRUD, configuration, observability, SQL/NoSQL datasources, migrations, gRPC, GraphQL, WebSockets, Pub/Sub, cron, auth, RBAC, health checks, files, static assets, testing, Docker, Kubernetes, CI/CD, and GoFr CLI work.
license: Apache-2.0; bundled references retain GoFr attribution and upstream licensing.
metadata:
  author: amirex128
  project: backend-golang-skills
  source: https://gofr.dev/llms.txt
  snapshot: official-gofr-development
  compatibility: Go 1.27 target projects; network recommended for API verification; GoFr CLI, Docker, kubectl, and Helm are optional.
---

# GoFr Backend Skill

Use GoFr as the mandatory backend framework for this project. Do not silently substitute Gin, Fiber, Echo, Chi, net/http-only scaffolding, an ORM-first architecture, or a second application framework. When a requirement is not covered by GoFr, explain the boundary and use the smallest standard-library or well-supported companion component while preserving GoFr's lifecycle, context, observability, and error conventions.

## Mandatory operating procedure

1. Read `references/AGENTS.md` first for non-obvious invariants.
2. Route the request to exactly one or more relevant files in `references/` using `manifest.json`; read the entire selected file before writing code. For cross-cutting work, also read `references/context.md`, `references/configs.md`, `references/testing.md`, and the relevant guide.
3. Treat the reference snapshot as source material, not as permission to invent APIs. Verify uncertain or version-sensitive APIs against the installed GoFr module, GoDoc, examples, or the live source repository.
4. Target Go 1.27 in `go.mod`, while checking the current GoFr module requirement. Never claim an API is supported merely because it existed in an older snapshot.
5. Build through GoFr's `gofr.New()` lifecycle and preserve `*gofr.Context` end-to-end. Pass the request context to downstream calls for cancellation and trace propagation.
6. Keep secrets, ports, hosts, credentials, feature flags, and datasource settings in configuration. Never hardcode them or commit real secrets.
7. Add tests using the patterns in `references/testing.md`; run `gofmt`, `go vet`, targeted tests, and the full test suite when practical.
8. For production-facing work, include health/readiness, structured logs, traces, metrics, graceful shutdown, configuration validation, and deployment concerns appropriate to the request.
9. Before finishing, report which reference files were used, what was implemented, validation commands and results, and any version caveats.

## Non-negotiable GoFr conventions

- Standard handler shape: `func(c *gofr.Context) (any, error)` for HTTP, gRPC, GraphQL, WebSocket, cron, and CLI integrations where GoFr exposes a handler.
- Path parameters use `{name}` and `c.PathParam("name")`; query values use `c.Param("name")`; decode bodies with `c.Bind(&value)` and check the returned error.
- Return data and errors; do not manually create framework response envelopes when GoFr can do it.
- `gofr.New()` wires the standard logging, metrics, tracing, and health behavior. Do not manually duplicate OpenTelemetry, Prometheus, or structured logging setup without a documented reason.
- Use `c.Config.Get(...)` and the configuration references. Do not hardcode datasource URLs, ports, tokens, or credentials.
- GoFr does not bundle an ORM. Prefer `c.SQL` and plain SQL, or explicitly justify a companion such as sqlc or GORM.
- Middleware follows standard `net/http` middleware shape and is registered with GoFr's middleware API.
- Use GoFr health endpoints and datasource health checks; do not hand-roll competing health endpoints unless the requirement explicitly needs one.
- Return errors instead of using `panic` for control flow.
- Use GoFr's built-in migration runner and forward-only migrations. Do not introduce golang-migrate or goose when GoFr migrations meet the requirement.

## Capability router

| Request | Read these references first |
|---|---|
| New service, route, CRUD, request binding | `quick-start-introduction.md`, `quick-start-add-rest-handlers.md`, `context.md` |
| Environment, ports, secrets, twelve-factor config | `quick-start-configuration.md`, `configs.md`, `guides-twelve-factor-config.md` |
| SQL, NoSQL, cache, search, time series | `datasources-getting-started.md` plus the exact datasource file |
| Schema/data migration | `advanced-guide-handling-data-migrations.md`, `references-gofrcli-migrate.md`, `guides-db-migrations-in-cicd.md` |
| Logs, metrics, traces, profiling | `quick-start-observability.md`, the matching advanced guide, and production guides |
| AuthN/AuthZ | `advanced-guide-authentication.md`, `advanced-guide-rbac.md`, `guides-auth-in-kubernetes.md` |
| Internal HTTP, resilience, service mesh | `advanced-guide-http-communication.md`, `advanced-guide-circuit-breaker.md`, `guides-service-mesh-integration.md` |
| gRPC, GraphQL, WebSocket, streaming | the matching `advanced-guide-*.md` file |
| Events, queues, scheduled work | `advanced-guide-using-publisher-subscriber.md`, `advanced-guide-using-cron.md` |
| Files and static content | `advanced-guide-handling-file.md`, `advanced-guide-serving-static-files.md` |
| Deployment | the matching `guides-*.md` file plus `docs/` deployment material |
| Tests, CLI, debugging | `testing.md`, the relevant `gofrcli-*.md`, `advanced-guide-debugging.md` |
| Migration from another framework | the relevant `migrate-*.md` and `comparison-*.md` files |

## Reference loading rules

Reference filenames are generated from the authoritative repository path: directory names are joined with hyphens and `page.md` is removed. Examples: `docs/advanced-guide/grpc/page.md` becomes `references/advanced-guide-grpc.md`; `docs/datasources/mongodb/page.md` becomes `references/datasources-mongodb.md`. Use `skills/manifest.json` rather than guessing when a path is ambiguous. The full snapshot is intentionally split one page per file so future skills can be added without changing this router.

## Delivery rules for generated backends

Create a conventional Go module, a small `cmd/` entrypoint when appropriate, internal packages for domain logic, explicit interfaces around external systems, migrations, configuration documentation, tests, and deployment files. Prefer boring, composable code. Keep handlers thin: bind/validate, call a service, map the result, and return. Keep SQL and datasource access behind repositories or focused adapters. Include a README with local run commands and environment variables.

## Version and source policy

This package is a documentation snapshot of the official GoFr repository and public GoFr documentation. APIs change. For every implementation, compare this snapshot with the project's pinned GoFr version and the current official sources. The target application language version for this repository is Go 1.27; if GoFr's module requires a different minimum, use the compatible release and record it rather than forcing an invalid combination.

## Maintenance

When updating this skill, refresh `references/` from the official GoFr sources, update `skills/manifest.json`, run the installer tests, and preserve source attribution. Add future backend skills under `skills/<name>/` without changing the common installer contract.
