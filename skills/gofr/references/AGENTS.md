# GoFr — guide for AI coding assistants

GoFr is an opinionated Go framework for microservices. Apache 2.0. Requires Go 1.25+. Repo: https://github.com/gofr-dev/gofr.

## Core rules

1. One handler signature for HTTP / gRPC / GraphQL / WebSocket / cron / CLI: `func(c *gofr.Context) (any, error)`.
2. Path params use `{name}`, not `:name`; use `c.PathParam("id")` for path, `c.Param("q")` for query, and `c.Bind(&v)` for body.
3. Do not manually wire OpenTelemetry, Prometheus, or structured logging; `gofr.New()` does it.
4. Pass `*gofr.Context` to downstream calls so trace propagation and cancellation work.
5. Configuration comes from `configs/.env` via `c.Config.Get(key)`. Do not hardcode ports, hosts, or secrets.
6. No ORM is bundled. Use plain SQL via `c.SQL`, or explicitly pair GoFr with sqlc/GORM.
7. Middleware is standard `net/http`: `func(http.Handler) http.Handler`, registered with `app.UseMiddleware(...)`.
8. Health is auto-exposed at `/.well-known/health` and `/.well-known/alive`.
9. Do not use `panic()` for control flow; return errors.

## Minimal app

```go
package main

import "gofr.dev/pkg/gofr"

func main() {
    app := gofr.New()
    app.GET("/hello", func(c *gofr.Context) (any, error) {
        return "Hello, world", nil
    })
    app.Run()
}
```

## Migrations

Use GoFr's built-in migration runner. Files live in `migrations/<unix-ts>_<name>.go` or the project's documented timestamp convention. `migrations/all.go` exports `All() map[int64]migration.Migrate`; wire with `a.Migrate(migrations.All())`. Each migration uses `migration.Migrate{UP: func(d migration.Datasource) error {...}}`. Migrations run once per environment; there is no down migration, so rollback is a new forward migration. Keep one feature purpose per migration.

## Where to look

Fetch the exact official page when implementing a feature: quick-start introduction, configuration, routing, context, configs, testing, observability, custom spans, custom metrics, datasources, Pub/Sub, gRPC, GraphQL, WebSockets, cron, HTTP communication, authentication, RBAC, migrations, file storage, startup hooks, errors, and the relevant production guide. The full index is https://gofr.dev/llms.txt and full dump is https://gofr.dev/llms-full.txt.
