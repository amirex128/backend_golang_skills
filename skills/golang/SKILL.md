---
name: golang
description: Build, review, refactor, test, debug, secure, document, modernize, and architect production-ready Golang and Go 1.27 backends. Use for Go APIs, REST services, microservices, Clean Architecture, CQRS, concurrency, context, databases, errors, testing, security, performance, project layout, naming, Swagger, documentation, troubleshooting, and any professional Go coding task.
license: MIT; synthesized from 19 supplied Golang skills. Retain upstream notices where source material is redistributed.
metadata:
  author: amirex128
  project: backend-golang-skills
  source_skills: 19
  source_knowledge_files: 107
  target_go: "1.27"
  progressive_disclosure: topic-routed references
---

# Unified Golang Engineering Skill

Apply this skill to every Go task. It consolidates 19 source skills into one coordinated engineering workflow. Classify the request, read the required topic reference completely before coding, load cross-cutting references when applicable, implement with the project architecture, validate the result, and report commands, assumptions, and remaining risks.

## Mandatory operating procedure

1. Inspect the repository before changing code: `go.mod`, Go directive/toolchain, packages, module boundaries, tests, CI, generated code, configuration, dependencies, and existing conventions.
2. Classify the task with the router below. Read the primary reference in full; read every listed cross-cutting reference that applies. Do not guess APIs from memory.
3. Preserve established behavior and public contracts unless the request explicitly changes them. Prefer the standard library and existing project dependencies over new abstractions or libraries.
4. For new backend architecture, follow **Clean Architecture with CQRS** from `references/project-layout.md`: domain rules point inward, application owns ports and use cases, adapters translate, infrastructure stays at the edge, commands change state, and queries read without hidden mutation.
5. Implement small, reviewable changes. Keep dependencies explicit, contexts propagated, resources bounded and closed, errors observable, goroutines owned, and security boundaries validated.
6. Format and validate: `gofmt`, `go vet ./...`, targeted tests, `go test ./...`, `go test -race ./...` for concurrent code, fuzzing for parsers/security boundaries, benchmarks for performance work, and `govulncheck ./...` for dependency/security work when available.
7. Review the final diff for API compatibility, package direction, error context, cleanup, cancellation, races, secret leakage, input validation, documentation, generated files, and operational behavior.

## Mandatory project defaults

- Target Go 1.27 unless the repository explicitly declares another supported version.
- Use `gofmt`; keep control flow readable with early returns and focused functions.
- Use MixedCaps identifiers, concise lowercase package names, documented exported declarations, and `Err...` sentinel names where appropriate.
- Prefer interfaces at consumption boundaries. Do not create interfaces only because mocking feels convenient.
- Return errors for expected failures; wrap with `%w`, inspect with `errors.Is`/`errors.As`, and avoid duplicate logging at every layer.
- Pass `context.Context` first at I/O boundaries. Never store context in structs or replace request context with `context.Background()`.
- Give every goroutine an owner, cancellation path, termination condition, and bounded resources.
- Parameterize SQL and shell arguments. Validate untrusted input at boundaries. Keep secrets out of source, logs, URLs, configuration, and errors.
- Do not use hidden global state, service locators, unnecessary reflection, speculative generics, or framework-driven business logic.

## Capability router

| Request or implementation area | Read first | Also read when applicable |
|---|---|---|
| Any Go implementation or code review | `references/code-style.md`, `references/naming.md`, `references/error-handling.md`, `references/safety.md` | `references/testing.md`, topic reference |
| Clean Architecture, CQRS, project layout, packages, modules, dependency direction | `references/project-layout.md` | `references/design-patterns.md`, `references/refactoring.md`, `references/testing.md` |
| Interfaces, design patterns, dependency injection, lifecycle, API boundaries | `references/design-patterns.md` | `references/project-layout.md`, `references/data-structures.md`, `references/error-handling.md` |
| Naming, API surface, Go idioms, readability, code style | `references/naming.md`, `references/code-style.md` | `references/documentation.md` |
| Structs, slices, maps, pointers, generics, memory behavior | `references/data-structures.md` | `references/database.md`, `references/testing.md`, `references/troubleshooting.md` |
| Goroutines, channels, select, mutexes, workers, pipelines | `references/concurrency.md` | `references/context.md`, `references/safety.md`, `references/testing.md`, `references/troubleshooting.md` |
| Context, cancellation, deadlines, request values, tracing propagation | `references/context.md` | `references/concurrency.md`, `references/safety.md`, `references/testing.md` |
| Errors, panics, wrapping, recovery, cleanup, resource safety | `references/error-handling.md`, `references/safety.md` | `references/security.md`, `references/testing.md` |
| SQL, transactions, repositories, scanning, locking, database performance | `references/database.md` | `references/project-layout.md`, `references/security.md`, `references/testing.md` |
| HTTP/API behavior, practical implementation how-to, integration recipes | `references/how-to.md` | `references/context.md`, `references/security.md`, `references/testing.md` |
| Unit, HTTP, integration, mocks, race, fuzz, coverage, benchmarks | `references/testing.md` | `references/testify.md`, `references/database.md`, `references/concurrency.md`, `references/security.md` |
| Testify assertions, mocks, suites | `references/testify.md` | `references/testing.md`, `references/design-patterns.md` |
| Swagger/OpenAPI and swaggo | `references/swagger.md` | `references/documentation.md`, `references/security.md`, `references/testing.md` |
| Authentication, authorization, secrets, crypto, injection, SSRF, supply chain | `references/security.md` | `references/safety.md`, `references/context.md`, `references/testing.md` |
| Refactor, rename, extract, move packages, remove cycles | `references/refactoring.md` | `references/project-layout.md`, `references/testing.md`, `references/naming.md` |
| Modernize Go, upgrade toolchain, deprecations, dependencies | `references/modernize.md` | `references/refactoring.md`, `references/testing.md`, `references/troubleshooting.md` |
| Documentation, README, GoDoc, examples, CHANGELOG, project communication | `references/documentation.md` | `references/code-style.md`, `references/how-to.md` |
| Production safety, defensive programming, nil/resource hazards | `references/safety.md` | `references/security.md`, `references/error-handling.md`, `references/concurrency.md` |
| Diagnose build failures, panics, races, deadlocks, flaky tests, production incidents | `references/troubleshooting.md` | `references/error-handling.md`, `references/concurrency.md`, `references/modernize.md`, `references/testing.md` |

Every reference listed above exists under this Skill. Read the complete topic file, including its retained source guidance and source references, before making a decision in that topic.

## Clean Architecture and CQRS enforcement

For a new backend or structural change, do not place business rules in HTTP handlers, database repositories, message consumers, or `main.go`. Use these boundaries:

- **Domain:** entities, value objects, invariants, domain services, and domain errors; no transport or infrastructure imports.
- **Application:** commands, queries, handlers, DTOs, ports, authorization decisions, transaction abstractions, and orchestration.
- **Adapters:** HTTP/gRPC/GraphQL/messaging translation, validation, presenters, and protocol-specific error mapping.
- **Infrastructure:** database, brokers, external clients, configuration, observability, migrations, projections, outbox, and concrete wiring.

A command may mutate state and publish a durable outbox event within its transaction. A query must not mutate state or hide writes. Separate read models from domain aggregates where useful; do not require separate databases or event sourcing without a measured requirement. Keep `cmd/<service>/main.go` as a thin composition root.

## Completion checklist

- [ ] Correct topic references were read and implementation follows their guidance.
- [ ] Clean Architecture dependency direction is preserved.
- [ ] Commands and queries are explicit and have no hidden cross-responsibility.
- [ ] Context, cancellation, transactions, cleanup, retries, and resource bounds are correct.
- [ ] Errors are wrapped and mapped at the correct boundary without leaking secrets.
- [ ] Inputs, authorization, dependencies, logs, and external calls were security-reviewed.
- [ ] Tests cover behavior and relevant failure modes; race/fuzz/integration/benchmark tests run when appropriate.
- [ ] Formatting, vetting, linting, documentation, generated code, and CI checks are complete.
- [ ] Final response reports references used, commands run, results, assumptions, and deferred risks.

## Source coverage

This Skill was rebuilt from every non-evaluation knowledge file in the supplied ZIP: 19 original `SKILL.md` files, their complete `references/` content, and all 7 source assets/templates. Evaluation fixtures are intentionally not loaded by agents. See `docs/unified-golang-source-map.json` for per-file hashes and provenance.
