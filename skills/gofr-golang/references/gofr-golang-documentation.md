# GoFr-Golang: Documentation

## GoFr adaptation rules

This is the GoFr-specific form of the general Golang guidance below. Use GoFr as the mandatory framework for service delivery: begin services with `gofr.New()`, keep GoFr lifecycle, configuration, health, structured logging, Prometheus metrics, OpenTelemetry tracing, datasource management, and graceful shutdown intact, and never silently replace GoFr with another web framework. Use the exact GoFr version installed by the project and verify version-sensitive APIs against the project module and official GoFr documentation.

Keep GoFr types at the adapter boundary. GoFr HTTP, gRPC, GraphQL, WebSocket, cron, and CLI handlers use the documented `func(c *gofr.Context) (any, error)` shape where applicable. Bind with `c.Bind(&value)` and check the error; read route parameters with `c.PathParam`, query values with `c.Param`, and return values/errors to GoFr instead of recreating response envelopes. Pass `*gofr.Context` through GoFr datasource/downstream calls for cancellation and trace propagation, but translate to application contracts before entering domain code.

The complete GoFr page set remains in the repository's `skills/gofr` Skill. Read the listed official pages there before implementing the relevant feature; these links are the authoritative framework-specific follow-up for this adapted reference.

## GoFr documentation adaptation

Document `gofr.New()` lifecycle, routes, `*gofr.Context`, configuration keys, datasource names, migrations, health/readiness, observability, authentication, GoFr version, and exact local/deployment commands. Use the official GoFr Swagger and configuration references instead of generic framework examples.

## Required GoFr references

- `advanced-guide-swagger-documentation.md` — https://gofr.dev/docs/advanced-guide/swagger-documentation
- `quick-start-configuration.md` — https://gofr.dev/docs/quick-start/configuration
- `quick-start-observability.md` — https://gofr.dev/docs/quick-start/observability
- `guides-production-logging.md` — https://gofr.dev/docs/guides/production-logging

## Unified Golang guidance

# Documentation

This reference consolidates all retained guidance from `golang-documentation`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Persona:** You are a Go technical writer and API designer. You treat documentation as a first-class deliverable — accurate, example-driven, and written for the reader who has never seen this codebase before.

**Orchestration mode:** Fan out the sub-agents described in the "Parallelizing Documentation Work" section (one per package, or one per doc layer/file) for documenting or auditing documentation across a large codebase, and merge their output into the final docs. On Claude Code, use `ultracode` to opt into multi-agent orchestration explicitly.

**Modes:**

- **Write mode** — generating or filling in missing documentation (doc comments, README, CONTRIBUTING, CHANGELOG, llms.txt). Work sequentially through the checklist in Step 2, or parallelize across packages/files using sub-agents.
- **Review mode** — auditing existing documentation for completeness, accuracy, and style. Use up to 5 parallel sub-agents: one per documentation layer (doc comments, README, CONTRIBUTING, CHANGELOG, library-specific extras).

> **Community default.** A company skill that explicitly supersedes `samber/cc-skills-golang@golang-documentation` skill takes precedence.

# Go Documentation

Write documentation that serves both humans and AI agents. Good documentation makes code discoverable, understandable, and maintainable.

## Cross-References

- See `samber/cc-skills-golang@golang-naming` skill for naming conventions in doc comments.
- See `samber/cc-skills-golang@golang-testing` skill for Example test functions.
- See `samber/cc-skills-golang@golang-project-layout` skill for where documentation files belong.
- See `samber/cc-skills@humanizer-en-asd-ste100` skill for strict, controlled English prose (ASD-STE100) when documentation demands maximal clarity and unambiguity.

## Writing Principles

Apply to every piece of documentation you write or review:

**Concision** — write the shortest version that carries the idea. Remove ornament and hollow transitions. Never drop facts, warnings, or user-requested depth.

**Intent over paraphrase** — code shows _what_ happens; docs explain _why_ it exists, _when_ to use it, _what constraints_ apply. A comment that only restates the signature wastes the reader's time.

**No invented context** — omit unsupported rationale, marketing claims (`seamlessly`, `robust`, `enterprise-grade`), or future promises. Leave gaps visible rather than filling with speculation.

**Preserve meaning when editing** — keep modality intact (`must`/`should`/`may` are different obligations). Preserve conditions, warnings, required actions. A cleaner sentence that changes obligations is wrong.

**Anti-patterns to remove on sight:** pure-paraphrase comments that start with the name but add nothing (godoc requires the name as prefix — what it forbids is stopping there), signature restatement, marketing vocabulary, groundless future claims (`future extensibility`, `easy to scale`), hollow transitions (`it's worth noting that`, `in conclusion`), template padding that adds no information.

For regulated or safety-critical documentation that requires strict controlled-English prose, → See `samber/cc-skills@humanizer-en-asd-ste100` skill.

## Step 1: Detect Project Type

Before documenting, determine the project type — it changes what documentation is needed:

**Library** — no `main` package, meant to be imported by other projects:

- Focus on godoc comments, `ExampleXxx` functions, playground demos, pkg.go.dev rendering
- See [Library Documentation](./references/library.md)

**Application/CLI** — has `main` package, `cmd/` directory, produces a binary or Docker image:

- Focus on installation instructions, CLI help text, configuration docs
- See [Application Documentation](./references/application.md)

**Both apply**: function comments, README, CONTRIBUTING, CHANGELOG.

**Architecture docs**: for complex projects, use the `docs/` directory and design description docs.

## Step 2: Documentation Checklist

Every Go project needs these (ordered by priority):

| Item | Required | Library | Application |
| --- | --- | --- | --- |
| Doc comments on exported functions | Yes | Yes | Yes |
| Package comment (`// Package foo...`) — MUST exist | Yes | Yes | Yes |
| README.md | Yes | Yes | Yes |
| LICENSE | Yes | Yes | Yes |
| Getting started / installation | Yes | Yes | Yes |
| Working code examples | Yes | Yes | Yes |
| CONTRIBUTING.md | Recommended | Yes | Yes |
| CHANGELOG.md or GitHub Releases | Recommended | Yes | Yes |
| Example test functions (`ExampleXxx`) | Recommended | Yes | No |
| Go Playground demos | Recommended | Yes | No |
| API docs (e.g., OpenAPI) | If applicable | Maybe | Maybe |
| Documentation website | Large projects | Maybe | Maybe |
| llms.txt | Recommended | Yes | Yes |

A private project might not need a documentation website, llms.txt, Go Playground demos...

## Parallelizing Documentation Work

When documenting a large codebase with many packages, use up to 5 parallel sub-agents for independent tasks:

- Assign each sub-agent to verify and fix doc comments in a different set of packages
- Generate `ExampleXxx` test functions for multiple packages simultaneously
- Generate project docs in parallel: one sub-agent per file (README, CONTRIBUTING, CHANGELOG, llms.txt)

## Step 3: Function & Method Doc Comments

Every exported function and method MUST have a doc comment. Document complex internal functions too. Skip test functions.

The comment starts with the function name and a verb phrase. Focus on **why** and **when**, not restating what the code already shows. The code tells you _what_ happens — the comment should explain _why_ it exists, _when_ to use it, _what constraints_ apply, and _what can go wrong_. Include parameters, return values, error cases, and a usage example:

```go
// CalculateDiscount computes the final price after applying tiered discounts.
// Discounts are applied progressively based on order quantity: each tier unlocks
// additional percentage reduction. Returns an error if the quantity is invalid or
// if the base price would result in a negative value after discount application.
//
// Parameters:
//   - basePrice: The original price before any discounts (must be non-negative)
//   - quantity: The number of units ordered (must be positive)
//   - tiers: A slice of discount tiers sorted by minimum quantity threshold
//
// Returns the final discounted price rounded to 2 decimal places.
// Returns ErrInvalidPrice if basePrice is negative.
// Returns ErrInvalidQuantity if quantity is zero or negative.
//
// Play: https://go.dev/play/p/abc123XYZ
//
// Example:
//
//	tiers := []DiscountTier{
//	    {MinQuantity: 10, PercentOff: 5},
//	    {MinQuantity: 50, PercentOff: 15},
//	    {MinQuantity: 100, PercentOff: 25},
//	}
//	finalPrice, err := CalculateDiscount(100.00, 75, tiers)
//	if err != nil {
//	    log.Fatalf("Discount calculation failed: %v", err)
//	}
//	log.Printf("Ordered 75 units at $100 each: final price = $%.2f", finalPrice)
func CalculateDiscount(basePrice float64, quantity int, tiers []DiscountTier) (float64, error) {
    // implementation
}
```

For the full comment format, deprecated markers, interface docs, and file-level comments, see **[Code Comments](./references/code-comments.md)** — how to document packages, functions, interfaces, and when to use `Deprecated:` markers and `BUG:` notes.

## Step 4: README Structure

README SHOULD follow this exact section order. Copy the template from [templates/README.md](./assets/templates/README.md):

1. **Title** — project name as `# heading`
2. **Badges** — shields.io pictograms (Go version, license, CI, coverage, Go Report Card...)
3. **Summary** — 1-2 sentences explaining what the project does
4. **Demo** — code snippet, GIF, screenshot, or video showing the project in action
5. **Getting Started** — installation + minimal working example
6. **Features / Specification** — detailed feature list or specification (very long section)
7. **Contributing** — link to CONTRIBUTING.md or inline if very short
8. **Contributors** — thank contributors (badge or list)
9. **License** — license name + link

Common badges for Go projects:

```markdown
[![Go Version](https://img.shields.io/github/go-mod/go-version/{owner}/{repo})](https://go.dev/) [![License](https://img.shields.io/github/license/{owner}/{repo})](./LICENSE) [![Build Status](https://img.shields.io/github/actions/workflow/status/{owner}/{repo}/test.yml?branch=main)](https://github.com/{owner}/{repo}/actions) [![Coverage](https://img.shields.io/codecov/c/github/{owner}/{repo})](https://codecov.io/gh/{owner}/{repo}) [![Go Report Card](https://goreportcard.com/badge/github.com/{owner}/{repo})](https://goreportcard.com/report/github.com/{owner}/{repo}) [![Go Reference](https://pkg.go.dev/badge/github.com/{owner}/{repo}.svg)](https://pkg.go.dev/github.com/{owner}/{repo})
```

For the full README guidance and application-specific sections, see [Project Docs](./references/project-docs.md#readme).

## Step 5: CONTRIBUTING & Changelog

**CONTRIBUTING.md** — Help contributors get started in under 10 minutes, covering prerequisites, clone, build, test, and PR process. If setup takes longer, improve the process with a Makefile, docker-compose, or devcontainer. See [Project Docs](./references/project-docs.md#contributingmd).

**Changelog** — Track changes using [Keep a Changelog](https://keepachangelog.com/) format or GitHub Releases, copying the template from [templates/CHANGELOG.md](./assets/templates/CHANGELOG.md). Write each entry to answer _what changed for the reader_ — internal refactors without user-visible impact belong in commit history, and a fixed edge case never becomes a broad "reliability improvement" claim. See [Project Docs](./references/project-docs.md#changelog).

## Step 6: Library-Specific Documentation

For Go libraries, add these on top of the basics:

- **Go Playground demos** — create runnable demos and link them in doc comments with `// Play: https://go.dev/play/p/xxx`. Use a Go Playground integration when one is available to create and share playground URLs.
- **Example test functions** — write `func ExampleXxx()` in `_test.go` files. These are executable documentation verified by `go test`.
- **Generous code examples** — include multiple examples in doc comments showing common use cases.
- **godoc** — your doc comments render on [pkg.go.dev](https://pkg.go.dev). Use `go doc` locally to preview; to inspect how a published package renders its docs, symbols, and examples, → See `samber/cc-skills-golang@golang-pkg-go-dev` skill.
- **Documentation website** — for large libraries, consider Docusaurus or MkDocs Material with sections: Getting Started, Tutorial, How-to Guides, Reference, Explanation.
- **Register for discoverability** — add to Context7, DeepWiki, OpenDeep, zRead. Even for private libraries.

See [Library Documentation](./references/library.md) for details.

## Step 7: Application-Specific Documentation

For Go applications/CLIs:

- **Installation methods** — pre-built binaries (GoReleaser), `go install`, Docker images, Homebrew...
- **CLI help text** — make `--help` comprehensive; it's the primary documentation
- **Configuration docs** — document all env vars, config files, CLI flags

See [Application Documentation](./references/application.md) for details.

## Step 8: API Documentation

If your project exposes an API:

| API Style    | Format      | Tool                                         |
| ------------ | ----------- | -------------------------------------------- |
| REST/HTTP    | OpenAPI 3.x | swaggo/swag (auto-generate from annotations) |
| Event-driven | AsyncAPI    | Manual or code-gen                           |
| gRPC         | Protobuf    | buf, grpc-gateway                            |

Prefer auto-generation from code annotations when possible. See [Application Documentation](./references/application.md#api-documentation) for details.

## Step 9: AI-Friendly Documentation

Make your project consumable by AI agents:

- **llms.txt** — add a `llms.txt` file at the repository root. Copy the template from [templates/llms.txt](./assets/templates/llms.txt). This file gives LLMs a structured overview of your project.
- **Structured formats** — use OpenAPI, AsyncAPI, or protobuf for machine-readable API docs.
- **Consistent doc comments** — well-structured godoc comments are easily parsed by AI tools.
- **Clarity** — a clear, well-structured documentation helps AI agents understand your project quickly.

## Step 10: Delivery Documentation

Document how users get your project:

**Libraries:**

```bash
go get github.com/{owner}/{repo}
```

**Applications:**

```bash
# Pre-built binary
curl -sSL https://github.com/{owner}/{repo}/releases/latest/download/{repo}-$(uname -s)-$(uname -m) -o /usr/local/bin/{repo}

# From source
go install github.com/{owner}/{repo}@latest

# Docker
docker pull {registry}/{owner}/{repo}:latest
```

See [Project Docs](./references/project-docs.md#delivery) for Dockerfile best practices and Homebrew tap setup.


## Source Reference: `golang-documentation/references/application.md`

# Application Documentation

→ See `samber/cc-skills-golang@golang-cli` skill for CLI application patterns and frameworks.

## Table of Contents

- [CLI Help Text](#cli-help-text)
- [Configuration Documentation](#configuration-documentation)
- [Architecture & design decisions](#architecture--design-decisions)
- [API Documentation](#api-documentation)
  - [REST APIs — OpenAPI / Swagger](#rest-apis--openapi--swagger)
  - [Event-Driven — AsyncAPI](#event-driven--asyncapi)
  - [gRPC — Protobuf](#grpc--protobuf)
  - [When to Use Each Format](#when-to-use-each-format)

## CLI Help Text

For CLI applications, `--help` output is the primary documentation. CLI tools MUST have comprehensive `--help` text:

```go
// Use cobra or similar framework for structured help text
var rootCmd = &cobra.Command{
    Use:   "mytool",
    Short: "A brief description of mytool",
    Long: `A longer description that explains the tool in detail.

mytool helps you do X, Y, and Z. It connects to your
database and performs analysis on the data.

Environment variables:
  MYTOOL_DB_URL    Database connection string (required)
  MYTOOL_LOG_LEVEL Log level: debug, info, warn, error (default: info)
  MYTOOL_TIMEOUT   Request timeout (default: 30s)`,
    Example: `  # Basic usage
  mytool analyze --input data.csv

  # With custom configuration
  mytool analyze --input data.csv --output report.json --format json

  # Using environment variables
  export MYTOOL_DB_URL="postgres://localhost/mydb"
  mytool serve`,
}
```

---

## Configuration Documentation

Configuration SHOULD be documented. Document all configuration sources in the README or a dedicated `docs/configuration.md`:

````markdown
## Configuration

Configuration is loaded in this order (later sources override earlier ones):

1. Default values
2. Configuration file (`~/.config/mytool/config.yaml`)
3. Environment variables
4. Command-line flags

### Environment Variables

| Variable           | Description                | Default | Required |
| ------------------ | -------------------------- | ------- | -------- |
| `MYTOOL_DB_URL`    | Database connection string | —       | Yes      |
| `MYTOOL_LOG_LEVEL` | Log verbosity              | `info`  | No       |
| `MYTOOL_PORT`      | HTTP server port           | `8080`  | No       |
| `MYTOOL_TIMEOUT`   | Request timeout            | `30s`   | No       |

### Configuration File

```yaml
# ~/.config/mytool/config.yaml
database:
  url: postgres://localhost/mydb
  max_connections: 25
server:
  port: 8080
  read_timeout: 30s
logging:
  level: info
  format: json
```
````

---

## Architecture & design decisions

For complex applications, document architectural decisions in `docs/architecture/`:

```
docs/
  architecture/
    0001-use-postgres-as-primary-store.md
    0002-event-driven-architecture.md
    0003-jwt-for-authentication.md
    README.md
```

Each design document follows a standard format:

```markdown
# Use PostgreSQL as Primary Store

## Context

We need a persistent data store that supports...

## Design

We use PostgreSQL because...

## Consequences

- Positive: ACID transactions, rich query language...
- Negative: Operational overhead, connection management...
```

---

## API Documentation

### REST APIs — OpenAPI / Swagger

Use [swaggo/swag](https://github.com/swaggo/swag) to auto-generate OpenAPI docs from Go annotations:

```go
// @Summary Get user by ID
// @Description Returns a single user
// @Tags users
// @Accept json
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} User
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /users/{id} [get]
func GetUser(w http.ResponseWriter, r *http.Request) {
```

Generate the spec:

```bash
go get -tool github.com/swaggo/swag/cmd/swag@latest
go tool swag init -g cmd/server/main.go -o docs/swagger
```

This produces `docs/swagger/swagger.json` and `docs/swagger/swagger.yaml`. Serve with Swagger UI or Redoc.

### Event-Driven — AsyncAPI

For message-based APIs (Kafka, NATS, RabbitMQ), use [AsyncAPI](https://www.asyncapi.com/):

```yaml
asyncapi: "2.6.0"
info:
  title: Order Events
  version: "1.0.0"
channels:
  orders/created:
    publish:
      message:
        payload:
          type: object
          properties:
            orderId:
              type: string
            amount:
              type: number
```

### gRPC — Protobuf

Protobuf files serve as both code contracts and documentation. Add comments to messages and RPCs:

```protobuf
syntax = "proto3";

// UserService manages user accounts.
service UserService {
  // GetUser retrieves a user by their unique identifier.
  // Returns NOT_FOUND if the user does not exist.
  rpc GetUser(GetUserRequest) returns (User);

  // CreateUser registers a new user account.
  // Returns ALREADY_EXISTS if the email is taken.
  rpc CreateUser(CreateUserRequest) returns (User);
}

// User represents a registered user account.
message User {
  // Unique identifier for the user (UUID v4).
  string id = 1;
  // User's display name (1-100 characters).
  string name = 2;
  // User's email address (must be unique across all users).
  string email = 3;
}
```

Use [buf](https://buf.build/) for linting and breaking change detection:

```bash
buf lint
buf breaking --against '.git#branch=main'
```

For REST+gRPC, use [grpc-gateway](https://github.com/grpc-ecosystem/grpc-gateway) to serve both from the same protobuf definition.

### When to Use Each Format

| API Style | Format | Auto-generation |
| --- | --- | --- |
| REST/HTTP with Go handlers | OpenAPI 3.x | swaggo/swag from annotations |
| REST/HTTP with framework | OpenAPI 3.x | Framework-specific (e.g., huma) |
| gRPC services | Protobuf | Proto files are the source of truth |
| gRPC + REST gateway | Protobuf + OpenAPI | grpc-gateway generates OpenAPI |
| Message queues / events | AsyncAPI | Manual or code-gen |
| GraphQL | SDL schema | Schema is the docs |


## Source Reference: `golang-documentation/references/code-comments.md`

# Code Comments

→ See `samber/cc-skills-golang@golang-naming` skill for naming conventions that reduce the need for comments.

## Table of Contents

- [Function & Method Doc Comments](#function--method-doc-comments)
  - [Why, Not What](#why-not-what)
  - [Anti-Patterns to Remove on Sight](#anti-patterns-to-remove-on-sight)
  - [Format](#format)
  - [Full Comment Template](#full-comment-template)
  - [What to Document](#what-to-document)
  - [Error Cases and Limitations](#error-cases-and-limitations)
  - [Deprecated Functions](#deprecated-functions)
  - [Interface Documentation](#interface-documentation)
  - [Method Comments on Structs](#method-comments-on-structs)
  - [Inline Code Examples in Comments](#inline-code-examples-in-comments)
  - [Playground Links](#playground-links)
- [File & Package Comments](#file--package-comments)
  - [Package Comment](#package-comment)
  - [File-Level Description](#file-level-description)
  - [When to Add File Descriptions](#when-to-add-file-descriptions)
  - [Godoc Headings in Comments](#godoc-headings-in-comments)

## Function & Method Doc Comments

### Why, Not What

The most common mistake in doc comments is restating the code. The code already tells the reader _what_ happens — comments SHOULD explain why, not what:

- **Why** this function exists (its purpose in the system)
- **When** to use it (and when not to)
- **What constraints** apply (preconditions, thread safety, performance)
- **What can go wrong** (error cases, panics, edge cases)

Bad — restates the code:

```go
// GetUser gets a user by ID.
func GetUser(id string) (*User, error) {
```

Good — explains why, when, and what can go wrong:

```go
// GetUser retrieves a user from the database by their unique identifier.
// Use this for authenticated endpoints where you need the full user profile.
// For listing or searching, use ListUsers instead — it returns lighter projections.
//
// Returns ErrNotFound if no user exists with the given ID.
// Returns ErrDatabaseUnavailable if the connection pool is exhausted.
func GetUser(id string) (*User, error) {
```

### Anti-Patterns to Remove on Sight

| Anti-pattern | Example | Fix |
| --- | --- | --- |
| Pure paraphrase | `// GetUser gets a user` on `func GetUser()` — starts with the name (required by godoc) but adds nothing | After the name, add _when_ to use it, constraints, and what can go wrong |
| Signature restatement | `// Returns a string and an error` | Document _which_ error and _why_ — the signature already shows types |
| Marketing vocabulary | `seamlessly`, `powerful`, `robust`, `enterprise-grade` | Remove — state facts instead |
| Invented rationale | `// designed to improve scalability` | Only document what the code actually does |
| Groundless future claims | `// supports future extensibility` | Remove or back it with an interface or configuration |
| Hollow filler | `// It's worth noting that...`, `// As mentioned above` | Cut — restate the fact directly if it matters |

### Format

Every doc comment MUST start with the function/method name followed by a verb phrase. This is how godoc renders it in package indexes.

```go
// FuncName verb-phrase describing what it does.
```

### Full Comment Template

Use this structure for exported functions and complex internal functions. Omit sections that don't apply (e.g., no Parameters section for zero-arg functions). Focus on the "why" — don't restate what the code already makes obvious:

```go
// FuncName summarizes what this function does in one sentence.
// Additional context explaining behavior, algorithms, or design decisions
// that callers need to know.
//
// Parameters:
//   - paramName: description of what this parameter represents
//   - anotherParam: description with valid ranges or constraints
//
// Returns description of the return value(s).
// Returns ErrSomething if [condition].
// Returns ErrAnother if [different condition].
//
// Panics if [condition] (only document if the function can panic).
//
// It is safe for concurrent use (or: It is NOT safe for concurrent use).
//
// Play: https://go.dev/play/p/xxxxx
//
// Example:
//
//	result, err := pkg.FuncName(arg1, arg2)
//	if err != nil {
//	    log.Fatal(err)
//	}
//	fmt.Println(result)
func FuncName(paramName Type, anotherParam Type) (ResultType, error) {
```

### What to Document

| Element | Document? |
| --- | --- |
| Exported functions/methods | Always |
| Exported types and interfaces | Always |
| Exported constants and variables | Always |
| Complex internal functions | Yes — algorithms, non-obvious logic |
| Simple internal helpers | Optional — only if the name isn't self-explanatory |
| Test functions | No |
| Getters/setters with no logic | Brief one-liner is enough |

`TODO` comments SHOULD include a tracking issue reference when one exists (e.g., `// TODO(#123): ...`). For informal notes, `// TODO(username): ...` or plain `// TODO: ...` is acceptable.

### Error Cases and Limitations

Document every error a function can return, and any edge cases or limitations:

```go
// Parse parses a duration string such as "300ms", "1.5h", or "2h45m".
//
// Parameters:
//   - s: A duration string. Valid time units are "ns", "us", "ms", "s", "m", "h".
//
// Returns the parsed duration.
// Returns ErrInvalidDuration if the string is empty or has an invalid format.
// Returns ErrOverflow if the duration exceeds math.MaxInt64 nanoseconds.
//
// Limitations:
//   - Does not support day, week, month, or year units.
//   - Precision is limited to nanoseconds.
func Parse(s string) (time.Duration, error) {
```

### Deprecated Functions

Use the `Deprecated:` marker. godoc renders this with special styling:

```go
// OldFunc does something.
//
// Deprecated: Use NewFunc instead. OldFunc will be removed in v3.0.0.
func OldFunc() {}
```

### Interface Documentation

Document the interface itself and each method. Explain the contract that implementations must satisfy:

```go
// Store defines a persistent key-value storage backend.
// Implementations must be safe for concurrent use by multiple goroutines.
//
// All methods accept a context for cancellation and deadlines.
// Implementations should respect context cancellation and return
// ctx.Err() when the context is done.
type Store interface {
    // Get retrieves the value associated with key.
    // Returns ErrNotFound if the key does not exist.
    // Returns ErrExpired if the key exists but has expired.
    Get(ctx context.Context, key string) ([]byte, error)

    // Set stores a key-value pair with an optional TTL.
    // If ttl is 0, the entry does not expire.
    // Overwrites any existing value for the same key.
    Set(ctx context.Context, key string, value []byte, ttl time.Duration) error

    // Delete removes a key from the store.
    // Returns nil (not an error) if the key does not exist.
    Delete(ctx context.Context, key string) error
}
```

### Method Comments on Structs

```go
// Close gracefully shuts down the server.
// It waits for active connections to complete up to the configured timeout.
//
// Returns an error if the shutdown times out or if the server
// encounters an error while draining connections.
//
// Close is idempotent — calling it multiple times is safe.
// It is NOT safe to call Close concurrently from multiple goroutines.
func (s *Server) Close() error {
```

### Inline Code Examples in Comments

Indent code examples by one tab in doc comments. godoc renders these as formatted code blocks:

```go
// Transform applies a function to each element of a slice and returns
// a new slice with the results.
//
// Example:
//
//	names := []string{"alice", "bob"}
//	upper := Transform(names, strings.ToUpper)
//	// upper: ["ALICE", "BOB"]
func Transform[T any, U any](slice []T, fn func(T) U) []U {
```

### Playground Links

Add a `Play:` line linking to a runnable Go Playground example of a public library. Use a Go Playground integration to create and share playground URLs when one is available:

```go
// Map applies a function to each element of a slice.
//
// Play: https://go.dev/play/p/abc123xyz
//
// Example:
//
//	  doubled := Map([]int{1, 2, 3}, func(x int) int { return x * 2 })
//	  // doubled: [2, 4, 6]
func Map[T any, U any](s []T, fn func(T) U) []U {
```

---

## File & Package Comments

### Package Comment

Every package should have a doc comment. Place it in one of these locations:

1. **At the top of the main `.go` file** — for small packages with one or two files
2. **In a dedicated `doc.go` file** — for packages with many files

```go
// Package httputil provides HTTP utility functions for request parsing,
// response writing, and middleware chaining.
//
// It is designed to work with the standard net/http package and does not
// depend on any specific HTTP framework.
package httputil
```

Use `doc.go` when the package has 3+ files or the package comment is longer than ~10 lines:

```go
// Package auth implements authentication and authorization for the API server.
//
// # Architecture
//
// The package uses a middleware-based approach where each authentication
// strategy (JWT, API key, OAuth2) implements the Authenticator interface.
// Strategies are chained and tried in order until one succeeds.
//
// # Token Lifecycle
//
// Access tokens expire after 15 minutes. Refresh tokens expire after 7 days.
// Token rotation is automatic — each refresh request issues a new refresh token
// and invalidates the previous one.
//
// # Thread Safety
//
// All exported functions and types are safe for concurrent use.
package auth
```

### File-Level Description

For files that implement a specific algorithm, feature, or contain complex logic, add a descriptive comment block below the imports. This is a macro description — explain **why** this file or package exists, what problem it solves, and what design choices were made. Use ASCII art to describe complex flows or architectures. Don't describe what each line does:

```go
package scheduler

import (
    "container/heap"
    "sync"
    "time"
)

// This file implements a priority-queue-based task scheduler.
//
// Tasks are scheduled with a target execution time and stored in a min-heap
// ordered by deadline. A single dispatcher goroutine polls the heap and
// executes tasks when their deadline arrives.
//
// Supports: recurring tasks, one-shot tasks, task cancellation, and
// graceful shutdown with drain timeout.
//
// Architecture:
//
//	            Schedule(task)
//                  |
//                  v
//            [Min-Heap Queue]
//             (by deadline)
//                  |
//         Dispatcher Goroutine
//            (polling loop)
//           /              \
//          /                \
//     Deadline              Deadline
//   not reached             reached
//        |                     |
//      wait                    v
//                           Execute
//                              |
//                  Recurring?  |  One-shot
//                  /           |           \
//                 /            v            \
//            Re-queue      Complete      Discard
//                 \            |           /
//                  \           |          /
//                   v          v         v
//                     [Continue polling]

type Scheduler struct {
```

### When to Add File Descriptions

| Scenario | Add description? |
| --- | --- |
| File implements an algorithm (sorting, scheduling, tree traversal) | Yes |
| File contains a complex state machine or protocol | Yes |
| File has 200+ lines of related logic | Yes |
| File is a simple CRUD handler or data model | No |
| File name already explains everything (`json_parser.go`) | Only if non-obvious |

### Godoc Headings in Comments

Use `# Heading` syntax in doc comments (Go 1.19+) for structured documentation:

```go
// Package config provides configuration loading and validation.
//
// # Supported Sources
//
// Configuration can be loaded from environment variables, YAML files,
// or command-line flags. Sources are merged in order of precedence:
// flags > env vars > config file > defaults.
//
// # Validation
//
// All configuration values are validated at load time. Invalid values
// cause an immediate error rather than failing later at runtime.
package config
```


## Source Reference: `golang-documentation/references/library.md`

# Library Documentation

→ See `samber/cc-skills-golang@golang-testing` skill for writing effective Example test functions.

## Table of Contents

- [Public vs Private Libraries](#public-vs-private-libraries)
- [Go Playground Demos](#go-playground-demos)
- [Example Test Functions](#example-test-functions)
- [Code Examples in Doc Comments](#code-examples-in-doc-comments)
- [godoc and pkg.go.dev](#godoc-and-pkggodev)
- [Documentation Website](#documentation-website)
  - [Recommended Frameworks](#recommended-frameworks)
  - [Recommended Sections](#recommended-sections)
  - [llms.txt](#llmstxt)
  - [Register for Discoverability](#register-for-discoverability)

## Public vs Private Libraries

Not all documentation applies equally. Adapt to your audience:

| Documentation | Public Library | Private Library |
| --- | --- | --- |
| Doc comments on exported symbols | Required | Required |
| Package comments | Required | Required |
| README.md | Required | Required |
| Code examples in comments | Generous | Generous |
| `ExampleXxx()` test functions | Recommended | Recommended |
| Go Playground demos | Recommended | N/A (code not public) |
| pkg.go.dev / godoc | Primary docs surface | Use `go doc` locally or internal tooling |
| Documentation website | Large projects | Only if many teams consume the library |
| Register in Context7/DeepWiki/etc. | Recommended | N/A |
| llms.txt | Recommended | Optional |
| CHANGELOG.md | Recommended | Recommended |
| CONTRIBUTING.md | Recommended | Recommended (internal wiki may suffice) |

**Private libraries** should still have excellent doc comments and examples — teams rotate, people forget, and AI agents need context to help effectively. The main difference is you skip public-facing artifacts (playground, pkg.go.dev, registries).

---

## Go Playground Demos

Create runnable demos on the Go Playground and link them in doc comments. This lets users try your library without installing anything. Only applicable to public libraries.

Add a `Play:` line in the doc comment:

```go
// Map applies fn to each element of the slice and returns a new slice.
//
// Play: https://go.dev/play/p/abc123xyz
//
// Example:
//
//	doubled := Map([]int{1, 2, 3}, func(x int) int { return x * 2 })
//	// doubled: [2, 4, 6]
func Map[T any, U any](s []T, fn func(T) U) []U {
```

When a Go Playground integration is available, use it to create and share playground URLs. Otherwise, create them manually at <https://go.dev/play/>.

Guidelines for playground demos:

- Keep demos self-contained — include all imports and a `main()` function
- Show the most common use case first
- Show real-world examples
- Print results so the output is visible when someone clicks "Run"
- Add comments explaining what each section does

---

## Example Test Functions

Libraries MUST have Example test functions for exported APIs. Example functions are executable documentation. They appear in godoc and are verified by `go test`:

```go
// In map_example_test.go

package mypackage_test

import (
    "fmt"
    "github.com/{owner}/{repo}"
)

// ExampleMap demonstrates mapping over a slice.
func ExampleMap() {
    result := mypackage.Map([]int{1, 2, 3}, func(x int) int {
        return x * 2
    })
    fmt.Println(result)
    // Output: [2 4 6]
}

// ExampleMap_strings demonstrates mapping with string transformation.
func ExampleMap_strings() {
    result := mypackage.Map([]string{"hello", "world"}, strings.ToUpper)
    fmt.Println(result)
    // Output: [HELLO WORLD]
}
```

Naming conventions:

- `ExampleFuncName()` — example for a package-level function
- `ExampleTypeName()` — example for a type
- `ExampleTypeName_MethodName()` — example for a method
- `ExampleFuncName_suffix()` — multiple examples for the same function (suffix is lowercase)
- `Example()` — example for the whole package

The `// Output:` comment MUST be included for `go test` to verify the example. Without it, the example compiles but doesn't verify output.

---

## Code Examples in Doc Comments

Be generous with examples in doc comments. Show common use cases, edge cases, and error handling:

```go
// NewClient creates a new HTTP client with the given options.
//
// Example — basic client:
//
//	client := NewClient()
//
// Example — with custom timeout and retries:
//
//	client := NewClient(
//	    WithTimeout(10 * time.Second),
//	    WithRetries(3),
//	    WithRetryBackoff(time.Second),
//	)
//
// Example — with authentication:
//
//	client := NewClient(
//	    WithBearerToken(os.Getenv("API_TOKEN")),
//	)
func NewClient(opts ...Option) *Client {
```

---

## godoc and pkg.go.dev

Your doc comments automatically render on [pkg.go.dev](https://pkg.go.dev) when you tag a release and someone imports your package. This is the primary documentation surface for public Go libraries.

**How godoc renders comments:**

- First sentence of each doc comment appears in the package index
- `// Package foo provides...` appears as the package description
- Code blocks (indented by one tab) render as formatted code
- `# Heading` syntax (Go 1.19+) creates sections
- `[Link text]` syntax creates hyperlinks
- `[Identifier]` links to other symbols in the package
- `Deprecated:` marker gets special styling

**For private libraries:** pkg.go.dev won't index private modules. Use `go doc` locally or run `pkgsite` on your internal network. Some teams set up a shared pkgsite instance for internal Go modules.

```bash
# View docs for a specific symbol
go doc github.com/{owner}/{repo}.FuncName

# View full package docs
go doc -all github.com/{owner}/{repo}

# Start a local godoc server
go get -tool golang.org/x/pkgsite/cmd/pkgsite@latest
go tool pkgsite -http=:6060
# Then open http://localhost:6060
```

---

## Documentation Website

For larger libraries or frameworks, consider a dedicated documentation website.

### Recommended Frameworks

- **Docusaurus** (React-based) — best for large projects, supports versioning natively
- **MkDocs Material** (Python-based) — simpler setup, great search, clean design

Both can be deployed on Vercel.

### Recommended Sections

Follow the [Diataxis framework](https://diataxis.fr/) for organizing documentation:

| Section | Purpose | Example |
| --- | --- | --- |
| Getting Started | First steps, installation, hello world | "Install and run your first query in 5 minutes" |
| Tutorial | Step-by-step learning | "Build a REST API with authentication" |
| How-to Guides | Task-oriented recipes | "How to configure connection pooling" |
| Reference | Complete API documentation | Auto-generated from godoc |
| Deep dive / internals | Conceptual understanding | "How the scheduler algorithm works" |

### llms.txt

Add a `llms.txt` file at the repository root to help AI agents understand your project. Copy the template from [templates/llms.txt](./templates/llms.txt).

This is an emerging convention for making projects AI-friendly. Place it alongside your README.

### Register for Discoverability

Make your library findable by AI agents and documentation aggregators:

- **Context7** — <https://context7.com> — submit your library for inclusion in AI-accessible documentation
- **DeepWiki** — <https://deepwiki.com> — auto-generates wiki-style docs from GitHub repos
- **OpenDeep** — <https://opendeep.wiki> — open documentation platform for AI consumption
- **zRead** — <https://zread.ai> — developer documentation reader


## Source Reference: `golang-documentation/references/project-docs.md`

# Project Documentation

→ See `samber/cc-skills-golang@golang-continuous-integration` skill for automating changelog generation and release workflows.

## Table of Contents

- [README.md](#readmemd)
  - [Section Order](#section-order)
- [CONTRIBUTING.md](#contributingmd)
  - [The 10-Minute Rule](#the-10-minute-rule)
- [Changelog](#changelog)
  - [Format](#format)
  - [Change Categories](#change-categories)
  - [GitHub Releases as Alternative](#github-releases-as-alternative)
- [Distribution](#distribution)
  - [Dockerfile Best Practices](#dockerfile-best-practices)

## README.md

A LICENSE file MUST exist in every project. The README is the project's front page — make it simple, clear, and scannable. A copy-paste template with empty sections is available at [templates/README.md](./templates/README.md).

### Section Order

Follow this exact order (all sections are in the template):

1. **Title** — project name as `# heading`
2. **Badges** — shields.io pictograms (Go version, license, CI, coverage, Go Report Card)
3. **Summary** — 1-2 sentences explaining what the project does
4. **Demo** — code snippet (libraries), GIF/video (CLIs), or screenshot (web UIs)
5. **Getting Started** — installation + minimal working example
6. **Features / Specification** — the longest section, organized by feature area
7. **Contributing** — link to CONTRIBUTING.md or inline if very short
8. **License** — license name + link

The template includes commented-out sections for applications (binary download table, Docker, Homebrew) that you can uncomment as needed.

---

## CONTRIBUTING.md

The goal: a new contributor should be able to clone the repo, make a change, and run the tests **in under 10 minutes**. If your project takes longer, add tooling to fix that.

Copy the template from [templates/CONTRIBUTING.md](./templates/CONTRIBUTING.md).

### The 10-Minute Rule

If setup takes more than 10 minutes, add these improvements:

| Problem | Solution |
| --- | --- |
| Complex build steps | Add a `Makefile` with `make build`, `make test`, `make lint` |
| External service dependencies | Add `docker-compose.yml` for local dev |
| Inconsistent dev environments | Add `.devcontainer/` for VS Code devcontainers |
| Slow test suite | Separate unit tests (fast) from integration tests (build tags) |
| Missing documentation | Add `make help` that lists available targets |

---

## Changelog

CHANGELOG MUST be updated for every release, tracking the notable changes it contains. Use [Keep a Changelog](https://keepachangelog.com/) format. Copy the template from [templates/CHANGELOG.md](./templates/CHANGELOG.md).

### Format

```markdown
## [1.2.0] - 2026-03-08

### Added

- New `WithTimeout` option for client configuration

### Changed

- Improved retry logic to use exponential backoff

### Fixed

- Race condition in connection pool under heavy load

### Deprecated

- `SetTimeout()` method — use `WithTimeout()` option instead

[1.2.0]: https://github.com/{owner}/{repo}/compare/v1.1.0...v1.2.0
```

### Change Categories

- **Added** — new features
- **Changed** — changes in existing functionality
- **Deprecated** — features that will be removed
- **Removed** — removed features
- **Fixed** — bug fixes
- **Security** — vulnerability fixes

### GitHub Releases as Alternative

For simpler projects, GitHub Releases can replace a CHANGELOG file. GoReleaser auto-generates release notes from git commits.

---

## Distribution

**YOU MUST offer multiple installation paths** (binaries, containers, APT/Homebrew/... package managers, source). Because:

- Each installation method eliminates friction for a different user segment
- Users adopt tools that fit their workflow, not tools that force workflow changes
- A single installation path is a hidden tax on adoption—DevOps engineers skip tools requiring npm, macOS developers skip tools without Homebrew
- Tools users _want to_ use spread faster than tools users _have to_ accommodate

### Dockerfile Best Practices

Use multi-stage builds with a minimal final image:

```dockerfile
# Build stage
FROM golang:1.27-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app/binary ./cmd/server

# Final stage
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /app/binary /binary
ENTRYPOINT ["/binary"]
```


## Source Asset: `golang-documentation/assets/templates/CHANGELOG.md`

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Arabic translation (#21).

### Changed

- Improve French translation (#42).

### Deprecated

### Removed

### Fixed

- Fix missing logo in home page

### Security

### Other (dependencies, CI, tools...)

## [1.0.0] - YYYY-MM-DD

### Added

- Initial release

[Unreleased]: https://github.com/{owner}/{repo}/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/{owner}/{repo}/releases/tag/v1.0.0


## Source Asset: `golang-documentation/assets/templates/CONTRIBUTING.md`

# Contributing to {project-name}

Thank you for your interest in contributing!

## Prerequisites

- Go {version} or later
- Make (optional but recommended)
- Docker (for integration tests only)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/{owner}/{repo}.git
cd {repo}

# Build
go build -o myapp ./cmd/main.go

# Run unit tests
go test -race ./...

# Run integration tests
go test -race -tags=integration -timeout=300s ./...

# Run linter
golangci-lint run --fix ./...
```

## Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Add tests for new functionality
5. Run `go test ./...` and `golangci-lint run`
6. Commit with a descriptive message
7. Push and open a Pull Request

## Code Guidelines

- Follow [Effective Go](https://go.dev/doc/effective_go)
- Add doc comments to all exported symbols
- Write table-driven tests
- Keep test coverage above {X}%

## Reporting Issues

Use [GitHub Issues](https://github.com/{owner}/{repo}/issues). Include:

- Go version (`go version`)
- OS and architecture
- Steps to reproduce
- Expected vs actual behavior


## Source Asset: `golang-documentation/assets/templates/README.md`

# {project-name}

<!-- Replace {owner} and {repo} throughout this file -->

[![Go Version](https://img.shields.io/github/go-mod/go-version/{owner}/{repo})](https://go.dev/) [![License](https://img.shields.io/github/license/{owner}/{repo})](./LICENSE) [![Build Status](https://img.shields.io/github/actions/workflow/status/{owner}/{repo}/test.yml?branch=main)](https://github.com/{owner}/{repo}/actions) [![Coverage](https://img.shields.io/codecov/c/github/{owner}/{repo})](https://codecov.io/gh/{owner}/{repo}) [![Go Report Card](https://goreportcard.com/badge/github.com/{owner}/{repo})](https://goreportcard.com/report/github.com/{owner}/{repo}) [![Go Reference](https://pkg.go.dev/badge/github.com/{owner}/{repo}.svg)](https://pkg.go.dev/github.com/{owner}/{repo})

<!-- Additional badges (pick what's relevant):
[![Release](https://img.shields.io/github/v/release/{owner}/{repo})](https://github.com/{owner}/{repo}/releases)
[![Downloads](https://img.shields.io/github/downloads/{owner}/{repo}/total)](https://github.com/{owner}/{repo}/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/{owner}/{repo})](https://hub.docker.com/r/{owner}/{repo})
-->

<!-- 1-2 sentences: what does this project do and who is it for? -->

<!-- Show the project in action: code snippet, GIF, screenshot, or video.
     For libraries: show a minimal working code example.
     For CLIs/tools: a GIF or screenshot is often more effective. -->

```go
// Minimal working example showing the most common use case
```

## 🚀 Getting Started

<!-- For libraries: -->

```bash
go get github.com/{owner}/{repo}
```

```go
package main

import "github.com/{owner}/{repo}"

func main() {
    // Minimal working example
}
```

<!-- For applications, uncomment and use this instead:

### Pre-built binaries

Download from [GitHub Releases](https://github.com/{owner}/{repo}/releases/latest).

| Platform | Architecture | Download                                                                                        |
| -------- | ------------ | ----------------------------------------------------------------------------------------------- |
| Linux    | amd64        | [Download](https://github.com/{owner}/{repo}/releases/latest/download/{repo}-linux-amd64)       |
| Linux    | arm64        | [Download](https://github.com/{owner}/{repo}/releases/latest/download/{repo}-linux-arm64)       |
| macOS    | amd64        | [Download](https://github.com/{owner}/{repo}/releases/latest/download/{repo}-darwin-amd64)      |
| macOS    | arm64        | [Download](https://github.com/{owner}/{repo}/releases/latest/download/{repo}-darwin-arm64)      |
| Windows  | amd64        | [Download](https://github.com/{owner}/{repo}/releases/latest/download/{repo}-windows-amd64.exe) |

### From source

```bash
go install github.com/{owner}/{repo}@latest
```

### Docker

```bash
docker pull {registry}/{owner}/{repo}:latest
docker run --rm {registry}/{owner}/{repo}:latest --help
```

### Homebrew (macOS)

```bash
brew install {owner}/{repo}
```

### APT (debian/ubuntu)

```bash
apt install {package}
```

-->

## ✨ Features

<!-- Very detailed feature descriptions, organized by area.
     This is the longest section of the README.
     Use headings, tables, and code examples generously. -->

### Feature Area 1

<!-- Description with code examples -->

### Feature Area 2

<!-- Description with code examples -->

## 🤝 Contributing

Please read the [contributing guide](CONTRIBUTING.md) before submitting a PR.

<!-- Or if the contributing guide is very short:

```bash
# Build
go build -o myapp ./cmd/main.go

# Run unit tests
go test -race ./...

# Run integration tests
go test -race -tags=integration -timeout=300s ./...

# Run linter
golangci-lint run --fix ./...
-->

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## Source Asset: `golang-documentation/assets/templates/llms.txt`

# {project-name}

> {One-line description of the project}

## Overview

{2-3 sentences explaining what this project does, what problem it solves, and who it's for.}

## Quick Start

```bash
go get github.com/{owner}/{repo}
```

```go
package main

import "github.com/{owner}/{repo}"

func main() {
    // Minimal working example
}
```

## Key Concepts

- **{Concept 1}**: {Brief explanation}
- **{Concept 2}**: {Brief explanation}
- **{Concept 3}**: {Brief explanation}

## API Reference

### Core Functions

- `FuncName(params) returns` - {What it does and when to use it}
- `AnotherFunc(params) returns` - {What it does and when to use it}

### Core Types

- `TypeName` - {What it represents}
- `AnotherType` - {What it represents}

## Common Patterns

### {Pattern 1 Name}

```go
// Example code showing this pattern
```

### {Pattern 2 Name}

```go
// Example code showing this pattern
```

## Error Handling

- `ErrName` - {When this error occurs and how to handle it}
- `ErrAnother` - {When this error occurs and how to handle it}

## References

- Documentation: {URL}
- Repository: https://github.com/{owner}/{repo}
- Go Reference: https://pkg.go.dev/github.com/{owner}/{repo}
- Issues: https://github.com/{owner}/{repo}/issues

