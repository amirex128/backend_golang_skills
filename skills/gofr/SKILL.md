---
name: gofr
description: Build, review, test, deploy, and document Go 1.27 backend services with GoFr only. Use for GoFr REST/CRUD, routing, configuration, Context, SQL and NoSQL datasources, migrations, observability, authentication, RBAC, HTTP clients, resilience, gRPC, GraphQL, WebSockets, streaming, Pub/Sub, cron, files, CLI, Docker, Kubernetes, CI/CD, and production operations.
license: Apache-2.0; bundled references retain GoFr attribution and upstream licensing.
metadata:
  author: amirex128
  project: backend-golang-skills
  source: https://gofr.dev/llms.txt
  snapshot: official-gofr-development
  compatibility: Go 1.27 target projects; network recommended for API verification; GoFr CLI, Docker, kubectl, and Helm are optional.
---

# GoFr Backend Skill

Use GoFr as the mandatory backend framework. Do not silently replace it with another web framework, an ORM-first architecture, or net/http-only scaffolding. If a requirement is outside GoFr, preserve GoFr's lifecycle, `*gofr.Context`, configuration, error, health, and observability conventions and use the smallest compatible companion component.

## Required workflow

1. **Classify the request.** Match it to the routing table below before writing code.
2. **Read every listed reference completely.** References are relative to this skill directory. Use `skills/manifest.json` from the repository root to resolve the authoritative source URL and exact filename. Never guess an API from memory.
3. **Read `references/AGENTS.md`** for every implementation. For uncertain or version-sensitive behavior, verify against the installed GoFr module, GoDoc, official examples, and current source.
4. **Implement with GoFr.** Start from `gofr.New()`, use the standard GoFr handler shape, preserve the request context through downstream calls, and keep handlers thin.
5. **Validate.** Run `gofmt`, `go vet`, targeted tests, and the full test suite when practical. Check configuration, health/readiness, logs, traces, metrics, graceful shutdown, and deployment concerns for production work.
6. **Report references used, implementation decisions, commands/results, and version caveats.** Do not claim an API is supported only because it appears in an old snapshot.

## GoFr invariants

- Use `func(c *gofr.Context) (any, error)` wherever GoFr exposes a handler: HTTP, gRPC, GraphQL, WebSocket, cron, and CLI.
- Use `{name}` route parameters, `c.PathParam("name")` for paths, `c.Param("name")` for query values, and `c.Bind(&value)` for request bodies. Always check bind errors.
- Return values and errors to GoFr; do not manually duplicate its response envelope.
- `gofr.New()` provides the framework's standard logging, Prometheus metrics, OpenTelemetry tracing, and health behavior. Do not duplicate these integrations without a documented reason.
- Read ports, hosts, credentials, tokens, feature flags, and datasource settings through configuration. Never hardcode secrets.
- Pass `*gofr.Context` to datasource and downstream calls for cancellation and trace propagation.
- GoFr does not bundle an ORM. Prefer `c.SQL` and plain SQL; use a companion such as sqlc or GORM only when justified.
- Middleware uses standard `net/http` middleware shape and GoFr registration.
- Use GoFr's health endpoints and datasource checks; do not create competing health endpoints without a requirement.
- Return errors instead of using `panic` for control flow.
- Use GoFr's built-in forward-only migration runner when it satisfies the requirement.

## Exact capability router

Read the **Required references** first. Read **Additional references** when the request includes that concern. If several capabilities are present, read all matching rows before implementation.

| Capability / user intent | Required references | Additional references |
|---|---|---|
| New service, first endpoint, server lifecycle | `references/quick-start-introduction.md`, `references/references-context.md`, `references/AGENTS.md` | `references/quick-start-configuration.md` |
| Routing, path/query params, request binding, response handling | `references/quick-start-add-rest-handlers.md`, `references/references-context.md` | `references/advanced-guide-routing-performance.md`, `references/advanced-guide-setting-custom-response-headers.md` |
| Auto CRUD REST handlers | `references/quick-start-add-rest-handlers.md` | `references/advanced-guide-dealing-with-sql.md`, exact datasource reference |
| Configuration, environment variables, ports, secrets | `references/quick-start-configuration.md`, `references/references-configs.md` | `references/guides-twelve-factor-config.md`, `references/guides-multi-environment-deployment.md` |
| Observability baseline | `references/quick-start-observability.md` | `references/advanced-guide-custom-spans-in-tracing.md`, `references/advanced-guide-publishing-custom-metrics.md`, `references/advanced-guide-remote-log-level-change.md`, production tracing/logging/Prometheus references |
| Logging in production | `references/quick-start-observability.md`, `references/guides-production-logging.md` | `references/advanced-guide-remote-log-level-change.md` |
| Metrics / Prometheus | `references/quick-start-observability.md`, `references/advanced-guide-publishing-custom-metrics.md` | `references/guides-production-prometheus-kubernetes.md` |
| Tracing / spans / trace propagation | `references/quick-start-observability.md`, `references/advanced-guide-custom-spans-in-tracing.md` | `references/guides-distributed-tracing.md`, `references/guides-production-tracing.md` |
| SQL queries, transactions, connection behavior | `references/advanced-guide-dealing-with-sql.md`, `references/datasources-getting-started.md` | `references/quick-start-connecting-mysql.md`, `references/guides-connection-pooling.md` |
| Redis connection / cache / key-value | `references/quick-start-connecting-redis.md`, `references/advanced-guide-key-value-store.md` | `references/datasources-getting-started.md` |
| Any datasource | `references/datasources-getting-started.md`, the exact datasource file below | `references/advanced-guide-monitoring-service-health.md`, `references/references-context.md` |
| ArangoDB | `references/datasources-arangodb.md` | `references/datasources-getting-started.md` |
| Cassandra | `references/datasources-cassandra.md` | `references/datasources-getting-started.md` |
| ClickHouse | `references/datasources-clickhouse.md` | `references/datasources-getting-started.md` |
| Cloud SQL | `references/datasources-cloudsql.md` | `references/datasources-getting-started.md`, deployment guides |
| CockroachDB | `references/datasources-cockroachdb.md` | `references/datasources-getting-started.md` |
| Couchbase | `references/datasources-couchbase.md` | `references/datasources-getting-started.md` |
| DGraph | `references/datasources-dgraph.md` | `references/datasources-getting-started.md` |
| Elasticsearch | `references/datasources-elasticsearch.md` | `references/datasources-migrations-elasticsearch.md`, `references/datasources-getting-started.md` |
| InfluxDB | `references/datasources-influxdb.md` | `references/datasources-getting-started.md` |
| MongoDB | `references/datasources-mongodb.md` | `references/datasources-getting-started.md` |
| OpenTSDB | `references/datasources-opentsdb.md` | `references/datasources-getting-started.md` |
| Oracle | `references/datasources-oracle.md` | `references/datasources-getting-started.md` |
| ScyllaDB | `references/datasources-scylladb.md` | `references/datasources-getting-started.md` |
| Solr | `references/datasources-solr.md` | `references/datasources-getting-started.md` |
| SurrealDB | `references/datasources-surrealdb.md` | `references/datasources-getting-started.md` |
| Schema or data migrations | `references/advanced-guide-handling-data-migrations.md`, `references/references-gofrcli-migrate.md` | `references/guides-db-migrations-in-cicd.md`, exact datasource reference |
| Authentication | `references/advanced-guide-authentication.md` | `references/references-context.md`, `references/guides-auth-in-kubernetes.md` |
| Authorization / RBAC | `references/advanced-guide-rbac.md` | `references/advanced-guide-authentication.md`, `references/guides-auth-in-kubernetes.md` |
| Service-to-service HTTP | `references/advanced-guide-http-communication.md` | `references/advanced-guide-circuit-breaker.md`, `references/guides-service-mesh-integration.md` |
| Circuit breaker / resilience | `references/advanced-guide-circuit-breaker.md`, `references/advanced-guide-http-communication.md` | `references/guides-service-mesh-integration.md` |
| Health, readiness, liveness | `references/advanced-guide-monitoring-service-health.md` | deployment and graceful-shutdown references |
| gRPC server or client | `references/advanced-guide-grpc.md` | `references/advanced-guide-grpc-streaming.md`, `references/references-gofrcli-wrap-grpc.md` |
| gRPC streaming | `references/advanced-guide-grpc-streaming.md`, `references/advanced-guide-grpc.md` | `references/references-gofrcli-wrap-grpc.md` |
| GraphQL | `references/advanced-guide-graphql.md`, `references/references-context.md` | `references/advanced-guide-authentication.md` |
| WebSocket | `references/advanced-guide-websocket.md`, `references/references-context.md` | `references/advanced-guide-authentication.md` |
| HTTP streaming | `references/advanced-guide-streaming.md`, `references/references-context.md` | `references/advanced-guide-setting-custom-response-headers.md` |
| Pub/Sub, events, queues | `references/advanced-guide-using-publisher-subscriber.md` | `references/advanced-guide-monitoring-service-health.md`, production deployment references |
| Cron / scheduled jobs | `references/advanced-guide-using-cron.md`, `references/references-context.md` | `references/advanced-guide-monitoring-service-health.md` |
| File upload/download/storage | `references/advanced-guide-handling-file.md`, `references/references-context.md` | configuration and datasource references |
| Static assets | `references/advanced-guide-serving-static-files.md` | deployment references |
| Swagger / API documentation | `references/advanced-guide-swagger-documentation.md` | `references/quick-start-add-rest-handlers.md` |
| Startup initialization | `references/advanced-guide-startup-hooks.md` | `references/advanced-guide-monitoring-service-health.md` |
| Errors and error responses | `references/advanced-guide-gofr-errors.md`, `references/references-context.md` | `references/quick-start-add-rest-handlers.md` |
| Custom database driver | `references/advanced-guide-injecting-databases-drivers.md` | `references/datasources-getting-started.md` |
| LLM integration | `references/advanced-guide-llm.md` | `references/references-context.md`, `references/quick-start-configuration.md` |
| MCP integration | `references/advanced-guide-mcp.md` | `references/references-context.md`, `references/quick-start-configuration.md` |
| Debugging / profiling / pprof | `references/advanced-guide-debugging.md` | `references/quick-start-observability.md` |
| CLI application | `references/advanced-guide-building-cli-applications.md`, `references/quick-start-cli.md`, `references/references-gofrcli.md` | the exact CLI command reference |
| Testing and mocks | `references/references-testing.md` | `references/references-context.md`, the feature reference under test |
| Docker image | `references/guides-dockerizing-gofr-services.md` | `references/guides-graceful-shutdown.md`, configuration and observability references |
| Kubernetes deployment | `references/guides-deploying-to-kubernetes.md` | `references/guides-auth-in-kubernetes.md`, `references/guides-production-prometheus-kubernetes.md`, `references/guides-horizontal-pod-autoscaler.md` |
| Helm | `references/guides-helm-chart-starter.md` | `references/guides-deploying-to-kubernetes.md` |
| Cloud deployment | `references/guides-cloud-deployment.md` | `references/guides-deploying-to-kubernetes.md` |
| CI/CD | `references/guides-cicd-recipes.md` | `references/guides-db-migrations-in-cicd.md`, `references/guides-dockerizing-gofr-services.md` |
| Graceful shutdown | `references/guides-graceful-shutdown.md` | `references/advanced-guide-monitoring-service-health.md` |
| Load testing | `references/guides-load-testing.md` | `references/guides-connection-pooling.md`, production observability references |
| HPA | `references/guides-horizontal-pod-autoscaler.md` | `references/guides-deploying-to-kubernetes.md`, `references/guides-production-prometheus-kubernetes.md` |
| GoFr examples, changelog, roadmap, FAQ, Learn, showcase, team, or events | `references/project-pages.md`, then the relevant implementation reference | `references/llms-index.md`, `references/llms-full-live.txt` |

## Reference index and scope

The exact page-to-file mapping is in `skills/manifest.json` at the repository root. The bundled references correspond to the official GoFr Quick Start, Advanced Guide, Datasources, Production Guides, and References sections from `https://gofr.dev/llms.txt`. `references/project-pages.md` covers the official non-API project links from that index. `references/llms-full-live.txt` is the complete concatenated fallback; `references/AGENTS.md` is the official AI-assistant guidance.

This Skill intentionally excludes all GoFr framework/language migration and comparison materials: do not load or use `migrate-*`, `comparison-*`, or framework-comparison pages. The remaining GoFr project pages such as FAQ and Learn may be used only for conceptual clarification, never as an implementation API source.

## Generated backend quality bar

Create a conventional Go module targeting Go 1.27, a small `cmd/` entrypoint when appropriate, internal packages for domain logic, explicit interfaces around external systems, tests, configuration documentation, migrations, and deployment files. Keep handlers thin: bind and validate, call a service, map the result, and return. Keep datasource access behind focused repositories or adapters. Include a README with local commands and environment variables.

## Version policy

This package is a documentation snapshot. Always compare the snapshot with the project's pinned GoFr version and current official sources. If the installed GoFr release requires a different minimum Go version, use a compatible release and record the decision; do not force an invalid Go 1.27 combination.

## Maintenance

When refreshing this Skill, fetch `https://gofr.dev/llms.txt`, update every non-migration page reference and `skills/manifest.json`, preserve one focused reference file per page, run the Agent Skills validator and installer tests, and verify that no `migrate-*` or `comparison-*` reference remains.
