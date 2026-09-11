# Clean Architecture, CQRS, Interfaces, and Project Layout

This repository follows **Clean Architecture with CQRS** as its architectural standard. Do not introduce a flat, ad-hoc, layered-by-HTTP, or framework-first structure for new backend work unless the repository explicitly documents an approved exception. Keep the architecture simple inside these boundaries; Clean Architecture is a dependency rule, not permission to create needless abstractions.

## Architectural policy

Use four dependency-directed areas:

1. **Domain** — enterprise business rules, entities, value objects, domain errors, invariants, and domain services. It imports only the standard library when unavoidable. It must not import HTTP, SQL, brokers, frameworks, generated transport code, or infrastructure packages.
2. **Application** — use cases and CQRS handlers. It coordinates domain behavior through ports/interfaces, owns application commands and queries, defines input/output DTOs, transactions as abstractions, authorization decisions that belong to the use case, and orchestration policies. It must not depend on concrete adapters or delivery frameworks.
3. **Interface adapters** — HTTP/gRPC/GraphQL handlers, presenters, request validation, mapping between transport DTOs and application commands/queries, repository implementations when the project groups adapters here, and serializers. Adapters translate; they do not contain business rules.
4. **Infrastructure and delivery** — SQL/NoSQL repositories, migrations, external clients, message brokers, configuration, logging, metrics, tracing, generated code, server wiring, and process entrypoints. Concrete dependencies point inward through interfaces.

The dependency rule is strict: **outer layers may depend on inner layers; inner layers must never depend on outer layers**. A package named `domain` must not import `internal/transport`, `database/sql`, a web framework, or a concrete repository. Enforce the rule with package boundaries, `go list`, import-cycle checks, architecture tests, and code review.

## CQRS policy

Separate state-changing work from state-reading work:

- A **Command** expresses an intent to change state (`CreateOrder`, `ApprovePayment`, `CancelSubscription`). It may validate invariants, open a transaction through an application port, call domain methods, persist changes, publish an outbox event, and return an identifier or result needed by the caller.
- A **Query** requests data without changing business state (`GetOrder`, `ListInvoices`, `FindAvailableProducts`). It uses a read port and read model optimized for the query. Queries must not call commands, mutate aggregates, publish events, or hide writes in a repository method.
- A **Handler** owns one use case. Prefer one command/query and one handler per file. Keep handlers thin: validate application-level input, load through ports, invoke domain behavior, persist through ports, and map the result.
- **Write and read models may differ.** Do not force query DTOs to equal domain entities. Query projections can be denormalized and read-only; never expose persistence rows as a public API contract.
- CQRS does not automatically require separate databases, event sourcing, or asynchronous messaging. Start with one database and separate interfaces/handlers. Add projections, an outbox, or asynchronous read models only for a measured requirement.

Commands must be idempotent where retries are possible. Define idempotency keys and uniqueness constraints for externally retried operations. Queries must state consistency expectations: strong reads may use the write store; eventually consistent projections must expose or document that behavior.

## Recommended project layout

Use the following as the default for a Go backend. Adjust names to the bounded context, not to a transport framework:

```text
project/
├── cmd/
│   └── api/
│       └── main.go                 # process entrypoint; composition root only
├── internal/
│   ├── domain/
│   │   ├── order/
│   │   │   ├── entity.go            # aggregate/entity and invariants
│   │   │   ├── value_objects.go
│   │   │   ├── errors.go
│   │   │   └── repository.go        # domain-facing write port if needed
│   │   └── shared/                  # only genuinely shared domain concepts
│   ├── application/
│   │   ├── command/
│   │   │   └── order/
│   │   │       ├── create.go        # command, handler, result
│   │   │       └── cancel.go
│   │   ├── query/
│   │   │   └── order/
│   │   │       ├── get.go           # query, handler, read DTO
│   │   │       └── list.go
│   │   ├── ports/
│   │   │   ├── clock.go
│   │   │   ├── transaction.go
│   │   │   ├── event_bus.go
│   │   │   └── unit_of_work.go
│   │   └── errors.go
│   ├── adapters/
│   │   ├── http/
│   │   │   ├── handler/
│   │   │   ├── request/
│   │   │   ├── response/
│   │   │   └── router.go
│   │   ├── grpc/                    # if applicable
│   │   └── messaging/               # consumers/producers and mapping
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── postgres/
│   │   │   │   ├── command_repository.go
│   │   │   │   ├── query_repository.go
│   │   │   │   └── migrations/
│   │   │   └── transaction.go
│   │   ├── projections/              # CQRS read-model projectors, if needed
│   │   ├── outbox/                   # durable event publication, if needed
│   │   ├── clients/
│   │   ├── config/
│   │   └── observability/
│   └── composition/
│       ├── dependencies.go           # concrete wiring
│       └── server.go
├── api/                              # OpenAPI/protobuf source and generated code
├── testdata/
├── go.mod
├── Makefile
├── .golangci.yml
└── README.md
```

Keep `cmd/*/main.go` extremely small. It should load configuration, construct concrete infrastructure, assemble handlers/routers, install observability and shutdown hooks, and call the application. It must not contain business rules or SQL. Keep all application-specific packages under `internal/`; use `pkg/` only for a deliberately public library API.

## Ports and dependency injection

Define interfaces where they are consumed. The application layer owns ports such as `OrderWriter`, `OrderReader`, `Transaction`, `Clock`, `IDGenerator`, and `EventPublisher`; infrastructure implements them. Accept interfaces in application constructors and inject concrete adapters from the composition root. Return concrete types from constructors where possible. Use compile-time assertions in adapters:

```go
var _ application.OrderWriter = (*PostgresOrderRepository)(nil)
```

Do not inject a global service locator, concrete `*sql.DB` into the domain, HTTP request objects into use cases, or a framework context into domain/application APIs. Pass `context.Context` as the first method argument at application and infrastructure I/O boundaries; do not store it in structs.

## Command transaction and event pattern

A write use case should follow this sequence:

1. Validate command shape and authorization at the application boundary.
2. Begin a transaction through an application-owned port.
3. Load the aggregate through a write repository.
4. Invoke a domain method; the domain enforces invariants.
5. Persist the aggregate and record an outbox event in the same transaction when publication is required.
6. Commit, then return the result. Do not publish an external event before the transaction commits.
7. Let an outbox worker publish durably with bounded retries, idempotency, context cancellation, and observability.

Do not use a distributed transaction or synchronous event fan-out by default. Keep domain events independent of broker/serialization types; map them in infrastructure.

## Query pattern

A query handler validates filters and authorization, calls a read port, and maps rows/projections into stable read DTOs. Keep pagination limits bounded, ordering fields allowlisted, and query results deterministic. Do not load a full aggregate when a projection answers the query. Do not let query repositories mutate state, emit events, or perform hidden writes. For eventually consistent projections, document lag and define a read-after-write strategy where the product requires it.

## Domain modeling rules

Keep invariants inside aggregates or domain services, not handlers or HTTP middleware. Use value objects for concepts with validation and behavior. Keep aggregate boundaries small; do not make every table an aggregate. Domain errors must be transport-neutral and mapped to HTTP/gRPC status in adapters. Avoid an anemic domain model when business rules are non-trivial, but do not invent domain services for simple data forwarding.

## Constructors and lifecycle

Use explicit constructors and dependency injection. Functional options are appropriate for extensible infrastructure APIs; validate options at construction and return errors when configuration can be invalid. Avoid mutable globals and `init()` for application wiring. Open resources, register cleanup immediately, and report `Close`/`Flush` errors when durability matters. Every external call needs a timeout; every queue, pool, buffer, and retry policy needs a bound. Retry only retryable failures, honor cancellation, and use backoff with jitter.

## Testing architecture

- **Domain tests:** pure unit tests for invariants, value objects, and domain errors; no database or transport.
- **Application tests:** handler tests with mocked/fake ports; assert transaction boundaries, authorization, idempotency, and emitted events.
- **Adapter tests:** HTTP/gRPC mapping, validation, status codes, serialization, and error translation with `httptest` or the transport's test tools.
- **Infrastructure integration tests:** real database/broker behavior behind integration tags; test migrations, locking, projections, outbox delivery, and SQL correctness.
- **Architecture tests:** verify forbidden imports and dependency direction; keep generated code at the edge.

## Architecture review checklist

- [ ] New code is placed in the correct Clean Architecture area.
- [ ] Imports point inward; domain has no infrastructure/transport dependency.
- [ ] Every state change is a named command with one handler and explicit transaction behavior.
- [ ] Every read is a named query with a read model and no hidden mutation.
- [ ] Ports are owned by the consuming application layer; adapters implement them.
- [ ] Domain invariants are not duplicated in handlers or transports.
- [ ] Commands are idempotent where retries are possible; outbox is transactional where events are required.
- [ ] Query consistency, projection lag, pagination, and ordering are explicit.
- [ ] `cmd` is only the composition root; no business logic or SQL is wired there.
- [ ] Domain, application, adapter, infrastructure, and end-to-end tests cover the relevant boundary.
- [ ] Architecture tests, `go vet`, linting, tests, and race detection pass as applicable.

This architecture is the project default. Deviations require a documented reason in the repository and must preserve dependency direction, testability, explicit ownership, and CQRS separation.

## Related references

- `references/database.md` for transaction, locking, scanning, and persistence details.
- `references/concurrency-context.md` for cancellation, worker lifecycles, outbox workers, and synchronization.
- `references/testing.md` for unit, integration, race, fuzz, and coverage practices.
- `references/errors-safety.md` for domain/application error mapping and cleanup.
- `references/tooling-refactoring.md` for safe package moves and dependency-cycle removal.
- `references/security.md` for authorization, secrets, input validation, and boundary security.
- `references/testify-swagger.md` for transport contract documentation and Testify patterns.

## Source note

This reference supersedes the earlier optional-architecture guidance while retaining the source collection's principles on explicit constructors, interfaces at consumption boundaries, bounded resources, lifecycle management, and testability.
