# GoFr-Golang: How To

## GoFr adaptation rules

This is the GoFr-specific form of the general Golang guidance below. Use GoFr as the mandatory framework for service delivery: begin services with `gofr.New()`, keep GoFr lifecycle, configuration, health, structured logging, Prometheus metrics, OpenTelemetry tracing, datasource management, and graceful shutdown intact, and never silently replace GoFr with another web framework. Use the exact GoFr version installed by the project and verify version-sensitive APIs against the project module and official GoFr documentation.

Keep GoFr types at the adapter boundary. GoFr HTTP, gRPC, GraphQL, WebSocket, cron, and CLI handlers use the documented `func(c *gofr.Context) (any, error)` shape where applicable. Bind with `c.Bind(&value)` and check the error; read route parameters with `c.PathParam`, query values with `c.Param`, and return values/errors to GoFr instead of recreating response envelopes. Pass `*gofr.Context` through GoFr datasource/downstream calls for cancellation and trace propagation, but translate to application contracts before entering domain code.

The complete GoFr page set remains in the repository's `skills/gofr` Skill. Read the listed official pages there before implementing the relevant feature; these links are the authoritative framework-specific follow-up for this adapted reference.

## GoFr implementation adaptation

When a recipe is requested, implement it with the exact GoFr quick-start and reference API: start from `gofr.New()`, register the documented GoFr handler, use GoFr context/configuration/datasource facilities, and place business behavior behind the adapted Clean Architecture layers. Do not substitute generic net/http code when GoFr provides the feature.

## Required GoFr references

- `quick-start-introduction.md` — https://gofr.dev/docs/quick-start/introduction
- `quick-start-add-rest-handlers.md` — https://gofr.dev/docs/quick-start/add-rest-handlers
- `quick-start-configuration.md` — https://gofr.dev/docs/quick-start/configuration
- `references-context.md` — https://gofr.dev/docs/references/context

## Unified Golang guidance

# How To

This reference consolidates all retained guidance from `golang-how-to`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Persona:** You are a Go skills orchestrator. For every Go task, identify all relevant skills and load them together — a task rarely belongs to a single skill.

**Modes:**

- **Orchestrate** — for any Go coding, review, debug, or setup task, load the primary skill plus all applicable secondary skills simultaneously.
- **Disambiguate** — when two skills seem to overlap, show the boundary table. See [disambiguation.md](references/disambiguation.md).
- **Configure** — write the always-load directive for `golang-how-to` itself, plus an optional `## Required Go skills` block, to the project's agent-config file (CLAUDE.md, AGENTS.md, or equivalent). Follow [project-config.md](references/project-config.md).

**Questions:** In Configure mode, ask the user through the environment's question tool — never as plain-text prose. One question at a time, wait for the answer. If the environment has no question tool, ask in prose with the same options.

**Dependencies:** `gopls` — `go install golang.org/x/tools/gopls@latest`; Claude Code's built-in `LSP` tool also needs `ENABLE_LSP_TOOL=1` and a Go language server wired (see [Code navigation with gopls](#code-navigation-with-gopls)).

## Skill loading

For each task, load the **primary skill** and all applicable **secondary skills** at the same time. Do not wait — load them together at the start.

| Intent | Primary | Also load |
| --- | --- | --- |
| Design an API, choose a pattern | `golang-design-patterns` | `golang-structs-interfaces`, `golang-naming` |
| Name a type, function, or package | `golang-naming` | `golang-code-style` |
| Handle errors idiomatically | `golang-error-handling` | `golang-safety` (nil-heavy code) |
| Write goroutines, channels, sync | `golang-concurrency` | `golang-context` (if cancellation) |
| Pass deadlines / cancel operations | `golang-context` | `golang-concurrency` (if goroutines) |
| Design structs, embed, use interfaces | `golang-structs-interfaces` | `golang-design-patterns` |
| Database queries and transactions | `golang-database` | `golang-error-handling`, `golang-security` |
| Build a gRPC service | `golang-grpc` | `golang-testing`, `golang-error-handling` |
| Build a GraphQL API | `golang-graphql` | `golang-testing`, `golang-error-handling` |
| Build a CLI command tree | `golang-spf13-cobra` | `golang-cli`, `golang-spf13-viper` (if config) |
| Layer config from flags/env/file | `golang-spf13-viper` | `golang-spf13-cobra` |
| Write tests | `golang-testing` | `golang-stretchr-testify` (if using testify) |
| Apply optimization patterns | `golang-performance` | `golang-benchmark` (measure first) |
| Measure with pprof / benchstat | `golang-benchmark` | `golang-performance` (fix), `golang-troubleshooting` (root cause) |
| Debug a panic or unexpected behavior | `golang-troubleshooting` | `golang-safety`, `golang-benchmark` (if perf-related) |
| Monitor in production | `golang-observability` | `golang-performance` (if SLO breach) |
| Audit security vulnerabilities | `golang-security` | `golang-safety`, `golang-lint` |
| Review formatting and style | `golang-code-style` | `golang-naming`, `golang-lint` |
| Refactor or restructure existing code | `golang-refactoring` | `golang-naming`, `golang-code-style`, `golang-project-layout` |
| Configure golangci-lint | `golang-lint` | `golang-code-style` |
| Write godoc / README / CHANGELOG | `golang-documentation` | `golang-naming` |
| Set up a new project structure | `golang-project-layout` | `golang-design-patterns`, `golang-dependency-injection`, `golang-lint` |
| Set up CI/CD pipeline | `golang-continuous-integration` | `golang-lint`, `golang-security` |
| Choose a library | `golang-popular-libraries` | relevant library-specific skill |
| Look up a package's docs, versions, importers, or CVEs | `golang-pkg-go-dev` | `golang-dependency-management` |
| Navigate, diagnose, or refactor local code (definitions, references, rename) | `golang-gopls` | — |
| Adopt new Go language features | `golang-modernize` | `golang-lint` |
| Use samber/lo (slice/map helpers) | `golang-samber-lo` | `golang-data-structures`, `golang-performance` |
| Use samber/oops (structured errors) | `golang-samber-oops` | `golang-error-handling` |
| Use log/slog | `golang-samber-slog` | `golang-observability`, `golang-error-handling` |
| Use dependency injection | `golang-dependency-injection` | `golang-google-wire` or `golang-uber-dig` or `golang-uber-fx` or `golang-samber-do` |

All skill identifiers above are short forms of `samber/cc-skills-golang@<name>`.

## Code navigation with gopls

`gopls` gives semantic code intelligence for Go — go-to-definition, find references, diagnostics, package API, symbol search, refactoring. → See `samber/cc-skills-golang@golang-gopls` skill for the three ways to reach it (its own MCP server, the native `LSP` tool, and its CLI), the full capability matrix, and efficient read/edit workflows.

`gopls` only reasons about code that is present and resolvable in the local build: your workspace plus every dependency exactly as pinned in `go.sum` (including `replace` directives). For any fact that isn't tied to your local build — version history, licenses, ecosystem-wide importers, a package you haven't added yet — use `golang-pkg-go-dev` (`godig`). See the `godig` vs gopls vs Context7 vs govulncheck section below for the full boundary.

## `godig` vs gopls vs Context7 vs govulncheck

Four tools can answer "is this dependency OK to use," and they don't overlap as much as they look:

- **Context7** is a general-purpose, cross-language documentation fetcher — useful when no more specific source exists. For a Go package or module, `godig` is almost always the better choice: it pulls **structured, Go-specific data** straight from pkg.go.dev — exact versions, exported symbols with signatures, runnable examples, `imported-by`, and known vulnerabilities — rather than Context7's generic scraped/curated docs, which don't expose that structure and can lag or miss lesser-known Go modules. Reach for Context7 only when a dependency's documentation genuinely doesn't exist or isn't indexed on pkg.go.dev.
- **`godig`** answers questions about the **published ecosystem**: any Go package or module, whether or not it's in your `go.mod` yet — it calls the remote pkg.go.dev API and never touches your local checkout. Its `vulns` command reports CVEs known for a package/version in isolation, regardless of whether your build actually reaches the vulnerable code path.
- **`gopls`** (→ `samber/cc-skills-golang@golang-gopls`, via its MCP server, the native `LSP` tool, or its CLI) answers questions about **your specific build**: your code plus every dependency exactly as pinned in `go.sum`, including `replace` directives pointing at forks or local paths — neither `godig` nor Context7 can see that. Its `go_vulncheck` operation runs a single, on-demand reachability check against the workspace as it stands right now.
- **`govulncheck`** (the standalone CLI, wrapped by the `samber/cc-skills-golang@golang-security` skill) is the whole-tree audit: it walks the entire module's call graph to confirm which known vulnerabilities are actually reachable, and is the tool of record for CI gates and periodic security sweeps — `gopls`'s `go_vulncheck` is a lighter-weight, single-shot version of the same analysis for use mid-edit.

Pick by task:

| Task | Tool | How |
| --- | --- | --- |
| Find where a symbol is defined in your own repo | `gopls` | `samber/cc-skills-golang@golang-gopls` — `go_search`, then `go_file_context` |
| Understand a file's intra-package dependencies | `gopls` | `samber/cc-skills-golang@golang-gopls` — `go_file_context` |
| Jump into a dependency's exact resolved source (incl. forks/`replace`d versions) | `gopls` | `samber/cc-skills-golang@golang-gopls` — `go_package_api`, or the native `LSP` tool's `goToDefinition` |
| Find every call site in your own code that references a dependency's symbol | `gopls` | `samber/cc-skills-golang@golang-gopls` — `go_symbol_references` — `godig`'s `imported-by` only lists public _packages_, not call sites in your repo |
| Get compiler diagnostics right after an edit | `gopls` | `samber/cc-skills-golang@golang-gopls` — `go_diagnostics` (MCP), or automatic with the native `LSP` tool |
| Check whether your current build can reach a known vulnerability, mid-edit | `gopls` | `samber/cc-skills-golang@golang-gopls` — `go_vulncheck` |
| Rename, extract, inline, or otherwise refactor local code | `gopls` | `samber/cc-skills-golang@golang-gopls` — safe rename, `refactor.*` code actions |
| Whole-tree vulnerability audit across the module (CI, periodic sweep) | `govulncheck` | `samber/cc-skills-golang@golang-security` skill — `govulncheck ./...` |
| List available versions of a published package | `godig` | `godig versions <path>` |
| Check known CVEs for a package/version you haven't added yet | `godig` | `godig vulns <path>` |
| See exported symbols/signatures of a published package | `godig` | `godig symbols` / `symbol doc` |
| Get runnable code examples for a symbol | `godig` | `godig symbol examples` |
| Read a package's rendered README/docs | `godig` | `godig module readme` / `package doc` |
| See who imports a package across the whole public ecosystem | `godig` | `godig imported-by` |
| Search for a package or library candidate | `godig` | `godig search` |
| Check a package's or module's license | `godig` | `godig package licenses` / `module licenses` |
| Get docs for a non-Go library, or a Go module not indexed on pkg.go.dev | Context7 | `resolve-library-id` / `query-docs` |

See the `samber/cc-skills-golang@golang-pkg-go-dev` skill for the full `godig` command reference, and the `samber/cc-skills-golang@golang-security` skill for the whole-tree `govulncheck` remediation workflow.

## Categories at a glance

Full catalog with "use when" hooks: [by-category.md](references/by-category.md)

| Category | Skills |
| --- | --- |
| Code Quality | `golang-code-style` `golang-documentation` `golang-error-handling` `golang-lint` `golang-naming` `golang-safety` `golang-security` `golang-structs-interfaces` |
| Architecture & Design | `golang-concurrency` `golang-context` `golang-data-structures` `golang-database` `golang-dependency-injection` `golang-design-patterns` `golang-modernize` `golang-refactoring` |
| QA & Performance | `golang-benchmark` `golang-observability` `golang-performance` `golang-testing` `golang-troubleshooting` |
| Project Setup | `golang-cli` `golang-continuous-integration` `golang-dependency-management` `golang-gopls` `golang-pkg-go-dev` `golang-popular-libraries` `golang-project-layout` `golang-stay-updated` |
| APIs | `golang-graphql` `golang-grpc` `golang-swagger` |
| Dependency Injection | `golang-dependency-injection` `golang-google-wire` `golang-uber-dig` `golang-uber-fx` `golang-samber-do` |
| Frameworks | `golang-spf13-cobra` `golang-spf13-viper` |
| samber/\* | `golang-samber-do` `golang-samber-hot` `golang-samber-lo` `golang-samber-mo` `golang-samber-oops` `golang-samber-ro` `golang-samber-slog` |
| Testing | `golang-stretchr-testify` `golang-testing` |

## Competing clusters — boundary lines

Full boundary tables with routing examples: [disambiguation.md](references/disambiguation.md)

Key clusters and their owners:

- **Performance**: `golang-performance` (optimization patterns) · `golang-benchmark` (measurement) · `golang-troubleshooting` (root cause) · `golang-observability` (always-on production)
- **DI**: `golang-dependency-injection` (concepts/decision) · `golang-google-wire` (compile-time) · `golang-uber-dig` (runtime reflection) · `golang-uber-fx` (lifecycle framework) · `golang-samber-do` (type-safe container)
- **samber/\***: `golang-samber-lo` (finite transforms) · `golang-samber-ro` (reactive streams) · `golang-samber-mo` (monadic types)
- **Errors**: `golang-error-handling` (idioms) · `golang-samber-oops` (structured errors) · `golang-safety` (prevent panics)
- **Style**: `golang-code-style` · `golang-naming` · `golang-lint` · `golang-documentation`
- **CLI**: `golang-cli` (architecture) · `golang-spf13-cobra` (command tree) · `golang-spf13-viper` (config layering)
- **Package lookup**: `golang-pkg-go-dev` (query pkg.go.dev for an existing path: versions/docs/symbols/importers/CVEs) · `golang-gopls` (navigate/refactor your locally resolved build) · `golang-popular-libraries` (which library to adopt) · `golang-dependency-management` (manage go.mod) · `golang-security` (whole-tree CVE scan)
- **Gap — type vs arch**: `golang-structs-interfaces` (type design) vs `golang-design-patterns` (architectural patterns)
- **Gap — goroutine vs cancel**: `golang-concurrency` + `golang-context` — load both when cancelling goroutines via context
- **Gap — correctness vs threat**: `golang-safety` (internal bugs) vs `golang-security` (external threats)
- **Gap — features vs rules**: `golang-modernize` (language adoption) vs `golang-lint` (static analysis config)
- **Gap — process vs target rules**: `golang-refactoring` (the safe, staged, at-scale _process_ of changing existing code — planning, ordering, gopls-driven mechanics, staged PRs) vs `golang-naming`/`golang-code-style`/`golang-project-layout`/`golang-design-patterns`/`golang-modernize` (what the resulting code should look like) — load `golang-refactoring` alongside whichever of these owns the target shape

## Configure mode

Write an always-load directive for `golang-how-to` itself to the project's agent-config file (CLAUDE.md, AGENTS.md, GEMINI.md, Cursor rules, or Copilot instructions — whichever the project's harness reads), and optionally force-trigger specific secondary skills too.

`samber/cc-skills-golang@golang-project-layout` writes the always-load directive automatically at project creation, with no user confirmation needed — it costs one skill description and never imposes project-specific choices. Running `/golang-how-to configure` writes it too if missing, and additionally lets the user confirm a `## Required Go skills` block for skills that must always apply beyond routing. Follow [project-config.md](references/project-config.md).

---

This skill is not exhaustive. Refer to individual skill files and the official Go documentation for detailed guidance.

If you encounter a bug or unexpected behavior in this skill plugin, open an issue at <https://github.com/samber/cc-skills-golang/issues>.


## Source Reference: `golang-how-to/references/by-category.md`

# Golang skills — full catalog by category

42 skills. Skills marked ⭐️ are recommended for all Go projects. Skills marked ⚙️ can be superseded by a company-specific skill.

---

## Table of Contents

- [Code Quality](#code-quality)
  - [`samber/cc-skills-golang@golang-code-style` ⭐️ ⚙️](#sambercc-skills-golanggolang-code-style-%EF%B8%8F-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-documentation` ⭐️ ⚙️](#sambercc-skills-golanggolang-documentation-%EF%B8%8F-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-error-handling` ⭐️ ⚙️](#sambercc-skills-golanggolang-error-handling-%EF%B8%8F-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-lint`](#sambercc-skills-golanggolang-lint)
  - [`samber/cc-skills-golang@golang-naming` ⭐️ ⚙️](#sambercc-skills-golanggolang-naming-%EF%B8%8F-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-safety` ⭐️](#sambercc-skills-golanggolang-safety-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-security` ⭐️ 🧠](#sambercc-skills-golanggolang-security-%EF%B8%8F-)
  - [`samber/cc-skills-golang@golang-structs-interfaces` ⚙️](#sambercc-skills-golanggolang-structs-interfaces-%EF%B8%8F)
- [Architecture & Design](#architecture--design)
  - [`samber/cc-skills-golang@golang-concurrency` ⚙️](#sambercc-skills-golanggolang-concurrency-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-context` ⚙️](#sambercc-skills-golanggolang-context-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-data-structures` ⭐️](#sambercc-skills-golanggolang-data-structures-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-database` ⭐️ ⚙️](#sambercc-skills-golanggolang-database-%EF%B8%8F-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-dependency-injection` ⚙️](#sambercc-skills-golanggolang-dependency-injection-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-design-patterns` ⭐️ ⚙️](#sambercc-skills-golanggolang-design-patterns-%EF%B8%8F-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-modernize` ⭐️](#sambercc-skills-golanggolang-modernize-%EF%B8%8F)
- [QA & Performance](#qa--performance)
  - [`samber/cc-skills-golang@golang-benchmark` 🧠](#sambercc-skills-golanggolang-benchmark-)
  - [`samber/cc-skills-golang@golang-observability` ⚙️](#sambercc-skills-golanggolang-observability-%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-performance` 🧠](#sambercc-skills-golanggolang-performance-)
  - [`samber/cc-skills-golang@golang-testing` ⭐️ 🧠 ⚙️](#sambercc-skills-golanggolang-testing-%EF%B8%8F--%EF%B8%8F)
  - [`samber/cc-skills-golang@golang-troubleshooting` ⭐️ 🧠](#sambercc-skills-golanggolang-troubleshooting-%EF%B8%8F-)
- [Project Setup](#project-setup)
  - [`samber/cc-skills-golang@golang-cli`](#sambercc-skills-golanggolang-cli)
  - [`samber/cc-skills-golang@golang-continuous-integration`](#sambercc-skills-golanggolang-continuous-integration)
  - [`samber/cc-skills-golang@golang-dependency-management`](#sambercc-skills-golanggolang-dependency-management)
  - [`samber/cc-skills-golang@golang-pkg-go-dev`](#sambercc-skills-golanggolang-pkg-go-dev)
  - [`samber/cc-skills-golang@golang-popular-libraries`](#sambercc-skills-golanggolang-popular-libraries)
  - [`samber/cc-skills-golang@golang-project-layout`](#sambercc-skills-golanggolang-project-layout)
  - [`samber/cc-skills-golang@golang-stay-updated`](#sambercc-skills-golanggolang-stay-updated)
- [APIs](#apis)
  - [`samber/cc-skills-golang@golang-graphql`](#sambercc-skills-golanggolang-graphql)
  - [`samber/cc-skills-golang@golang-grpc`](#sambercc-skills-golanggolang-grpc)
  - [`samber/cc-skills-golang@golang-swagger`](#sambercc-skills-golanggolang-swagger)
- [Dependency Injection](#dependency-injection)
  - [`samber/cc-skills-golang@golang-dependency-injection` ⚙️](#sambercc-skills-golanggolang-dependency-injection-%EF%B8%8F-1)
  - [`samber/cc-skills-golang@golang-google-wire`](#sambercc-skills-golanggolang-google-wire)
  - [`samber/cc-skills-golang@golang-uber-dig`](#sambercc-skills-golanggolang-uber-dig)
  - [`samber/cc-skills-golang@golang-uber-fx`](#sambercc-skills-golanggolang-uber-fx)
  - [`samber/cc-skills-golang@golang-samber-do`](#sambercc-skills-golanggolang-samber-do)
- [Frameworks](#frameworks)
  - [`samber/cc-skills-golang@golang-spf13-cobra`](#sambercc-skills-golanggolang-spf13-cobra)
  - [`samber/cc-skills-golang@golang-spf13-viper`](#sambercc-skills-golanggolang-spf13-viper)
- [samber/\*](#samber)
  - [`samber/cc-skills-golang@golang-samber-do`](#sambercc-skills-golanggolang-samber-do-1)
  - [`samber/cc-skills-golang@golang-samber-hot`](#sambercc-skills-golanggolang-samber-hot)
  - [`samber/cc-skills-golang@golang-samber-lo`](#sambercc-skills-golanggolang-samber-lo)
  - [`samber/cc-skills-golang@golang-samber-mo` 🧠](#sambercc-skills-golanggolang-samber-mo-)
  - [`samber/cc-skills-golang@golang-samber-oops`](#sambercc-skills-golanggolang-samber-oops)
  - [`samber/cc-skills-golang@golang-samber-ro` 🧠](#sambercc-skills-golanggolang-samber-ro-)
  - [`samber/cc-skills-golang@golang-samber-slog`](#sambercc-skills-golanggolang-samber-slog)
- [Testing](#testing)
  - [`samber/cc-skills-golang@golang-stretchr-testify`](#sambercc-skills-golanggolang-stretchr-testify)
  - [`samber/cc-skills-golang@golang-testing` ⭐️ 🧠 ⚙️](#sambercc-skills-golanggolang-testing-%EF%B8%8F--%EF%B8%8F-1)

## Code Quality

### `samber/cc-skills-golang@golang-code-style` ⭐️ ⚙️

Golang code formatting, conventions, and project-level style consistency — gofmt, goimports, line length, var declarations, blank lines, comment heuristics.

Use when: the user asks about formatting rules, style review, or project coding standards. Not for naming conventions (→ `golang-naming`), linter configuration (→ `golang-lint`), or doc comments (→ `golang-documentation`).

---

### `samber/cc-skills-golang@golang-documentation` ⭐️ ⚙️

Golang documentation standards — package docs, godoc conventions, example functions, README structure, CHANGELOG, llms.txt, API reference generation.

Use when: writing or reviewing Go doc comments, README files, or API reference. Not for code comments that explain logic (→ `golang-code-style`).

---

### `samber/cc-skills-golang@golang-error-handling` ⭐️ ⚙️

Golang error handling best practices — error creation, wrapping with fmt.Errorf and errors.Is/As, sentinel errors, custom error types, panic recovery.

Use when: writing or reviewing error propagation, wrapping, logging, or recovery patterns. For samber/oops specifics → `golang-samber-oops`. For preventing panics → `golang-safety`.

---

### `samber/cc-skills-golang@golang-lint`

Golang linting — golangci-lint configuration, presets, custom rules, CI integration, nolint suppressions, linter selection and output interpretation.

Use when: setting up or tuning golangci-lint, interpreting lint failures, or deciding which linters to enable. For style conventions not enforced by linters → `golang-code-style`.

---

### `samber/cc-skills-golang@golang-naming` ⭐️ ⚙️

Golang naming conventions across all identifier types — packages, constructors, structs, interfaces, constants, errors, receivers, acronyms, test functions. Covers MixedCaps rules, Get-prefix, and utils/helpers anti-patterns.

Use when: naming a new type, function, package, or constant. Not for broader formatting (→ `golang-code-style`).

---

### `samber/cc-skills-golang@golang-safety` ⭐️

Defensive Golang coding — prevents panics, silent data corruption, and runtime bugs. Nil safety, append aliasing, map concurrent access, float comparison, zero-value design, numeric overflow.

Use when: writing or reviewing code that could silently produce wrong results or panic. Not for external threats (→ `golang-security`) or error handling idioms (→ `golang-error-handling`).

---

### `samber/cc-skills-golang@golang-security` ⭐️ 🧠

Golang security best practices — injection prevention (SQL, command, XSS), cryptography, filesystem/network safety, secrets management, cookie security, tool configuration. Audit and review modes.

Use when: auditing a codebase for vulnerabilities, writing security-sensitive code, or reviewing auth/crypto/secrets handling. Not for runtime correctness bugs (→ `golang-safety`).

---

### `samber/cc-skills-golang@golang-structs-interfaces` ⚙️

Golang struct and interface design — composition, embedding, type assertions, interface segregation, struct tags (JSON/YAML/DB), pointer vs value receivers.

Use when: designing types, choosing between value vs pointer receivers, writing struct tags, or working with interface hierarchies. For architectural patterns that use interfaces → `golang-design-patterns`.

---

## Architecture & Design

### `samber/cc-skills-golang@golang-concurrency` ⚙️

Golang concurrency patterns — goroutines, channels, sync primitives, context cancellation, worker pools, fan-out/fan-in, pipelines, errgroup.

Use when: writing concurrent code, coordinating goroutines, or reviewing for race conditions. For context propagation specifically → `golang-context`. When cancelling goroutines via context — load both.

---

### `samber/cc-skills-golang@golang-context` ⚙️

Idiomatic context.Context usage — creation, cancellation, timeouts, values, propagation patterns, WithoutCancel, common anti-patterns.

Use when: propagating deadlines and cancellation signals, or passing request-scoped values. Not for code that merely accepts ctx as first parameter.

---

### `samber/cc-skills-golang@golang-data-structures` ⭐️

Golang data structures internals and usage — slices (capacity growth, append aliasing), maps, channels, sync primitives, container/\*, generic collections, and when to use each.

Use when: choosing a data structure, understanding slice/map performance characteristics, or using container/list, container/heap, or ring.

---

### `samber/cc-skills-golang@golang-database` ⭐️ ⚙️

Golang database access patterns — parameter binding, connection pooling, transactions, migrations, sqlboiler/sqlc code generation, query builders.

Use when: writing SQL queries, designing repository patterns, or configuring database connections. For security aspects of queries (injection) → also consult `golang-security`.

---

### `samber/cc-skills-golang@golang-dependency-injection` ⚙️

Dependency injection patterns in Golang — constructor injection, interface-based DI, wire/dig/fx comparison, and when DI is worth the complexity.

Use when: deciding whether to use DI, designing constructor signatures, or comparing DI libraries. For a specific DI library → `golang-google-wire`, `golang-uber-dig`, `golang-uber-fx`, or `golang-samber-do`.

---

### `samber/cc-skills-golang@golang-design-patterns` ⭐️ ⚙️

Idiomatic Golang design patterns — functional options, constructors, builder pattern, middleware chains, circuit breaker, and architecture guides.

Use when: choosing architectural patterns, designing APIs, or implementing resilience patterns. For type-level design (embedding, receivers) → `golang-structs-interfaces`.

---

### `samber/cc-skills-golang@golang-modernize` ⭐️

Modernize Golang code using recent language features — range-over-int, min/max builtins, iterators, slices/maps/cmp/slog stdlib packages, testing patterns (t.Context, b.Loop, synctest), and tooling upgrades.

Use when: upgrading a codebase to a newer Go version or replacing pre-generics patterns. Not for lint rule enforcement (→ `golang-lint`).

---

## QA & Performance

### `samber/cc-skills-golang@golang-benchmark` 🧠

Golang benchmarking, profiling, and performance measurement — pprof, trace, CPU/memory/block profiles, flame graphs, benchstat, CI regression detection, continuous profiling.

Use when: measuring performance, capturing profiles, comparing benchmark runs, or setting up CI regression detection. For applying optimization patterns → `golang-performance`. For debugging a crash → `golang-troubleshooting`.

---

### `samber/cc-skills-golang@golang-observability` ⚙️

Golang production observability — structured logging (slog), Prometheus metrics, OpenTelemetry tracing, pprof profiling endpoints, alerting, Grafana dashboards.

Use when: instrumenting a service for production monitoring. Not for temporary deep-dive investigation (→ `golang-benchmark`, `golang-performance`).

---

### `samber/cc-skills-golang@golang-performance` 🧠

Golang performance optimization — allocation reduction, CPU efficiency, memory layout, GC tuning, pooling, caching, hot-path optimization.

Use when: applying optimization patterns after profiling. Not for measurement methodology (→ `golang-benchmark`) or debugging workflow (→ `golang-troubleshooting`).

---

### `samber/cc-skills-golang@golang-testing` ⭐️ 🧠 ⚙️

Production-ready Golang tests — table-driven tests, fuzzing, fixtures, goroutine leak detection (goleak), snapshot testing, code coverage, integration tests, parallel tests.

Use when: writing or reviewing tests. For testify-specific APIs → `golang-stretchr-testify`. For measurement methodology → `golang-benchmark`.

---

### `samber/cc-skills-golang@golang-troubleshooting` ⭐️ 🧠

Systematic Golang debugging — common pitfalls, test-driven debugging, pprof capture, Delve debugger, race detection, GODEBUG tracing, production debugging.

Use when: debugging a panic, unexpected output, or hard-to-reproduce bug. Not for interpreting profiles (→ `golang-benchmark`) or applying optimization patterns (→ `golang-performance`).

---

## Project Setup

### `samber/cc-skills-golang@golang-cli`

Golang CLI application development — project layout, exit codes, signal handling, I/O patterns, argument parsing, terminal UX.

Use when: building a CLI tool from scratch. For cobra-specific APIs → `golang-spf13-cobra`. For viper configuration → `golang-spf13-viper`.

---

### `samber/cc-skills-golang@golang-continuous-integration`

CI/CD pipeline configuration for Golang projects using GitHub Actions — build, test, lint, and release workflows.

Use when: setting up or improving a CI pipeline for a Go project.

---

### `samber/cc-skills-golang@golang-dependency-management`

Golang module dependency strategies — go.mod conventions, versioning, replace directives, tool dependencies, and multi-module workspaces.

Use when: managing go.mod, dealing with replace directives, or structuring a multi-module repo.

---

### `samber/cc-skills-golang@golang-pkg-go-dev`

Golang package and module exploration via `godig`, a pkg.go.dev API client (CLI + MCP server) — docs, symbols, versions, importers, licenses, and known vulnerabilities.

Use when: looking up a module's available versions, CVEs, docs/symbols, or who imports it, or searching pkg.go.dev. For upgrading deps → `golang-dependency-management`; for choosing a library → `golang-popular-libraries`.

---

### `samber/cc-skills-golang@golang-popular-libraries`

Curated recommendations for production-ready Golang libraries — when the stdlib is enough vs when to reach for a package.

Use when: choosing a library for a new concern (HTTP, logging, testing, etc.). For deep guidance on a specific library → use the library-specific skill.

---

### `samber/cc-skills-golang@golang-project-layout`

Golang project structure and workspace setup — cmd/internal/pkg conventions, monorepo layout, CLI project structure, and when to keep things flat.

Use when: starting a new project or restructuring an existing one. For architectural patterns within the project → `golang-design-patterns`.

---

### `samber/cc-skills-golang@golang-stay-updated`

Resources to stay current with Golang — official channels, community hubs, key people to follow, learning resources.

Use when: looking for ways to track Go releases, proposals, and community news.

---

## APIs

### `samber/cc-skills-golang@golang-graphql`

GraphQL API development in Golang using gqlgen/graphql-go — schema definition, resolvers, subscriptions, dataloader, federation.

Use when: building a GraphQL API in Go.

---

### `samber/cc-skills-golang@golang-grpc`

gRPC in Golang — protobuf organization, service definitions, streaming, interceptors, error codes, code generation workflow.

Use when: building or consuming a gRPC service. For OpenAPI/REST documentation → `golang-swagger`.

---

### `samber/cc-skills-golang@golang-swagger`

OpenAPI/Swagger docs with swaggo/swag — annotation comments, code generation, framework integrations (gin, echo, fiber, chi), security definitions.

Use when: generating OpenAPI documentation from Go code annotations.

---

## Dependency Injection

### `samber/cc-skills-golang@golang-dependency-injection` ⚙️

See "Architecture & Design" section above.

---

### `samber/cc-skills-golang@golang-google-wire`

Compile-time dependency injection with google/wire — provider sets, injector generation, wire.Build, and structured DI patterns.

Use when: the codebase imports `github.com/google/wire` or the team has chosen compile-time DI. For runtime DI with reflection → `golang-uber-dig`.

---

### `samber/cc-skills-golang@golang-uber-dig`

Reflection-based DI with uber-go/dig — Provide/Invoke, dig.In/dig.Out, named values, value groups, optional dependencies, Decorate.

Use when: the codebase imports `go.uber.org/dig`. For higher-level lifecycle and modules → `golang-uber-fx`.

---

### `samber/cc-skills-golang@golang-uber-fx`

Application framework with uber-go/fx — fx.New, fx.Provide/Invoke, fx.Module, lifecycle hooks, fx.Annotate, fx.Decorate, signal-aware Run.

Use when: the codebase imports `go.uber.org/fx`. For raw DI without lifecycle → `golang-uber-dig`.

---

### `samber/cc-skills-golang@golang-samber-do`

Dependency injection with samber/do — type-safe service containers, lifecycle management, scopes, health checks, graceful shutdown.

Use when: the codebase imports `github.com/samber/do`.

---

## Frameworks

### `samber/cc-skills-golang@golang-spf13-cobra`

CLI command trees with spf13/cobra — command hierarchy, RunE hooks, flag management, shell completion, usage templates, testing with SetArgs.

Use when: the codebase imports `github.com/spf13/cobra`. For configuration layering → `golang-spf13-viper`. For general CLI architecture → `golang-cli`.

---

### `samber/cc-skills-golang@golang-spf13-viper`

Layered configuration with spf13/viper — flag > env > file > KV > default precedence, BindPFlag, hot reload, test isolation, remote KV integration.

Use when: the codebase imports `github.com/spf13/viper`. For CLI command structure → `golang-spf13-cobra`. For general CLI architecture → `golang-cli`.

---

## samber/\*

### `samber/cc-skills-golang@golang-samber-do`

See "Dependency Injection" section above.

---

### `samber/cc-skills-golang@golang-samber-hot`

In-memory caching with samber/hot — 9 eviction algorithms (LRU, LFU, TinyLFU, W-TinyLFU, S3FIFO, ARC, SIEVE), TTL, loaders, sharding, stale-while-revalidate, Prometheus metrics.

Use when: the codebase imports `github.com/samber/hot`.

---

### `samber/cc-skills-golang@golang-samber-lo`

Functional programming helpers with samber/lo — 500+ type-safe generic functions for slices, maps, channels, strings. Immutable (lo), parallel (lop), mutable (lom), iterators (loi), SIMD.

Use when: the codebase imports `github.com/samber/lo`. Not for streaming pipelines (→ `golang-samber-ro`).

---

### `samber/cc-skills-golang@golang-samber-mo` 🧠

Monadic types with samber/mo — Option, Result, Either, Future, IO, Task, State for type-safe nullable values, error handling, and functional composition.

Use when: the codebase imports `github.com/samber/mo`.

---

### `samber/cc-skills-golang@golang-samber-oops`

Structured error handling with samber/oops — error builders, stack traces, error codes, context attributes, public vs developer messages, panic recovery, APM integration.

Use when: the codebase imports `github.com/samber/oops`.

---

### `samber/cc-skills-golang@golang-samber-ro` 🧠

Reactive streams with samber/ro — 150+ type-safe operators, cold/hot observables, 5 subject types, 40+ plugins, automatic backpressure, Go context integration.

Use when: the codebase imports `github.com/samber/ro`. Not for finite slice transforms (→ `golang-samber-lo`).

---

### `samber/cc-skills-golang@golang-samber-slog`

Structured logging pipeline with samber/slog-\* packages — multi-handler routing (slog-multi), sampling, formatting, HTTP middleware, 20+ backend sinks.

Use when: the codebase imports any `github.com/samber/slog-*` package.

---

## Testing

### `samber/cc-skills-golang@golang-stretchr-testify`

Testing with stretchr/testify — assert, require, mock, and suite packages. Assertions, mock expectations, argument matchers, suite lifecycle, custom matchers.

Use when: the codebase imports `github.com/stretchr/testify`. For test architecture and strategy → `golang-testing`.

---

### `samber/cc-skills-golang@golang-testing` ⭐️ 🧠 ⚙️

See "QA & Performance" section above.


## Source Reference: `golang-how-to/references/disambiguation.md`

# Competing clusters — deep disambiguation

Thirteen clusters where skills overlap. Each cluster includes a boundary table, concrete routing examples, and notes on gap cases not yet explicit in source skill descriptions.

---

## Table of Contents

- [1. Performance cluster](#1-performance-cluster)
- [2. Dependency injection cluster](#2-dependency-injection-cluster)
- [3. samber/\* functional cluster](#3-samber-functional-cluster)
- [4. Error handling cluster](#4-error-handling-cluster)
- [5. Style / naming / lint / docs cluster](#5-style--naming--lint--docs-cluster)
- [6. CLI cluster](#6-cli-cluster)
- [7. Testing cluster](#7-testing-cluster)
- [8. design-patterns vs structs-interfaces](#8-design-patterns-vs-structs-interfaces)
- [9. concurrency vs context](#9-concurrency-vs-context)
- [10. safety vs security](#10-safety-vs-security)
- [11. modernize vs lint](#11-modernize-vs-lint)
- [12. Package lookup / discovery cluster](#12-package-lookup--discovery-cluster)
- [13. golang-refactoring vs. the target-state rule skills](#13-golang-refactoring-vs-the-target-state-rule-skills)

## 1. Performance cluster

Four skills form a "deep analysis" cluster. `golang-observability` is the always-on counterpart; the other three are activated on demand.

| Skill | Unique territory | Does NOT own |
| --- | --- | --- |
| `samber/cc-skills-golang@golang-performance` | Optimization patterns — "if allocation bottleneck → use sync.Pool", "if hot-path → avoid reflection" | Measurement, profile capture, root cause analysis |
| `samber/cc-skills-golang@golang-benchmark` | pprof/trace capture, flame graph interpretation, benchstat comparison, CI regression detection | Deciding which optimization to apply |
| `samber/cc-skills-golang@golang-troubleshooting` | Debugging workflow: reproduce, bisect, Delve, race detector, GODEBUG, test-driven debugging | Profile interpretation, optimization patterns |
| `samber/cc-skills-golang@golang-observability` | Always-on production signals: structured logs, Prometheus counters, OTel traces, alerting | Temporary investigation, benchmark runs |

**Routing examples:**

- "My HTTP handler is slow in production" → start with `golang-observability` (check metrics/traces), then `golang-benchmark` (capture profiles), then `golang-performance` (apply fixes).
- "My benchmark regressed by 20%" → `golang-benchmark` (benchstat comparison, detect root cause via pprof).
- "I need to reduce allocations in the hot path" → `golang-performance` (pooling, struct layout, escape analysis).
- "The process crashes after 10 minutes under load" → `golang-troubleshooting` (race detector, memory leak, Delve attach).

---

## 2. Dependency injection cluster

Start with `golang-dependency-injection` for library selection. Then use the library-specific skill once the choice is made.

| Skill | Unique territory |
| --- | --- |
| `samber/cc-skills-golang@golang-dependency-injection` | Concepts (why DI, manual injection), constructor patterns, library comparison table |
| `samber/cc-skills-golang@golang-google-wire` | Compile-time codegen: `wire.Build`, `wire.NewSet`, `wire.Bind`, `ProviderSet` |
| `samber/cc-skills-golang@golang-uber-dig` | Runtime reflection: `dig.Provide`, `dig.In`/`dig.Out`, value groups, `Decorate` |
| `samber/cc-skills-golang@golang-uber-fx` | Full application framework on top of dig: `fx.New`, `fx.Module`, lifecycle hooks, `fx.Annotate` |
| `samber/cc-skills-golang@golang-samber-do` | Type-safe container, `do.Provide`, scopes, health checks, graceful shutdown |

**Routing examples:**

- "Should I use DI in my project?" → `golang-dependency-injection`.
- "My project uses google/wire, `wire.Build` is failing" → `golang-google-wire`.
- "I want lifecycle hooks with my DI container" → `golang-uber-fx` (not `golang-uber-dig` — dig is lower-level).
- "I want type-safe DI without code generation" → `golang-samber-do` or `golang-uber-dig`.

---

## 3. samber/\* functional cluster

The three core skills cover three distinct programming models. They rarely compete in the same task.

| Skill | Unique territory | Does NOT own |
| --- | --- | --- |
| `samber/cc-skills-golang@golang-samber-lo` | Finite collections: `lo.Map`, `lo.Filter`, `lo.Reduce`, `lo.Uniq`, `lo.GroupBy` — 500+ helpers | Infinite streams, event-driven pipelines |
| `samber/cc-skills-golang@golang-samber-ro` | Infinite/event-driven: observables, subjects, operators like `Map`/`Filter`/`Throttle`, backpressure | Finite slice transforms |
| `samber/cc-skills-golang@golang-samber-mo` | Monadic types: `mo.Option[T]`, `mo.Result[T]`, `mo.Either[L,R]`, `mo.Future[T]` | Slice helpers, reactive streams |

**Routing examples:**

- "Transform a slice of users into a map by ID" → `golang-samber-lo` (`lo.KeyBy`).
- "Stream events from a channel with backpressure and rate limiting" → `golang-samber-ro`.
- "Return an optional value without using nil" → `golang-samber-mo` (`mo.Some`/`mo.None`).
- "Compose error-returning functions without if-err chains" → `golang-samber-mo` (`mo.Result[T]`).

> Note: `golang-samber-mo` is currently absent from the mutual cross-reference between `lo` and `ro` in their descriptions. The boundary above reflects the intended design.

---

## 4. Error handling cluster

| Skill | Unique territory |
| --- | --- |
| `samber/cc-skills-golang@golang-error-handling` | Idiomatic error flow: `fmt.Errorf("%w")`, `errors.Is`/`errors.As`, sentinel errors, single-handling rule, `panic`/`recover` |
| `samber/cc-skills-golang@golang-samber-oops` | `oops.New().Code().User().Hint()` builder, stack traces, APM integration, `oops.Recover` |
| `samber/cc-skills-golang@golang-safety` | Preventing errors from occurring: nil checks, zero-value design, integer overflow guards, append aliasing |

**Routing examples:**

- "How should I wrap errors so callers can match them?" → `golang-error-handling`.
- "I want structured errors with HTTP codes and stack traces" → `golang-samber-oops`.
- "My service panics on nil pointer dereference" → `golang-safety` (defensive coding) AND `golang-troubleshooting` (debugging the existing crash).

---

## 5. Style / naming / lint / docs cluster

These four skills each own a distinct slice of "code quality". Source descriptions include explicit mutual disclaimers.

| Skill | Unique territory |
| --- | --- |
| `samber/cc-skills-golang@golang-code-style` | Line formatting, blank lines between declarations, short variable names in small scopes, comment placement |
| `samber/cc-skills-golang@golang-naming` | All identifier naming rules: `MixedCaps`, no `GetX`, no `IFoo` prefixes, package names, error variable names |
| `samber/cc-skills-golang@golang-lint` | golangci-lint YAML config, which linters to enable, `//nolint` usage, CI integration |
| `samber/cc-skills-golang@golang-documentation` | Exported symbol comments, package-level docs, README sections, `example_test.go`, `llms.txt` |

**Routing examples:**

- "How do I name my constructor?" → `golang-naming`.
- "My `golangci-lint` run reports `exhaustive` errors" → `golang-lint`.
- "How should I format my package-level godoc comment?" → `golang-documentation`.
- "When should I use a blank line between two function bodies?" → `golang-code-style`.

---

## 6. CLI cluster

| Skill | Unique territory |
| --- | --- |
| `samber/cc-skills-golang@golang-cli` | Exit codes, signal handling (SIGTERM), stdin/stdout/stderr patterns, progress bars, terminal detection |
| `samber/cc-skills-golang@golang-spf13-cobra` | `cobra.Command`, `PersistentPreRunE`, `Args` validators, `ValidArgsFunction`, `SetArgs` in tests |
| `samber/cc-skills-golang@golang-spf13-viper` | `viper.BindPFlag`, `AutomaticEnv`, `ReadInConfig`, `OnConfigChange`, test isolation with `viper.Reset()` |

**Routing examples:**

- "My CLI should exit with code 2 on bad args" → `golang-cli`.
- "How do I add shell completion to my cobra command?" → `golang-spf13-cobra`.
- "How do I override config values with env vars?" → `golang-spf13-viper`.
- "I'm building a new CLI from scratch" → `golang-cli` (architecture) + `golang-spf13-cobra` (command tree) + `golang-spf13-viper` (config).

---

## 7. Testing cluster

| Skill | Unique territory |
| --- | --- |
| `samber/cc-skills-golang@golang-testing` | Test strategy, table-driven patterns, `t.Parallel()`, `testcontainers`, goleak, coverage, fuzz |
| `samber/cc-skills-golang@golang-stretchr-testify` | `assert.Equal`, `require.NoError`, `mock.On`, `mock.AssertExpectations`, `testify/suite` lifecycle |

**Routing examples:**

- "How do I write a table-driven test in Go?" → `golang-testing`.
- "How do I assert a mock was called with specific args?" → `golang-stretchr-testify`.
- "How do I detect goroutine leaks in tests?" → `golang-testing` (goleak).

---

## 8. design-patterns vs structs-interfaces

These two skills overlap on "how to design Go types". The split is: type-level design vs. architectural use of types.

| Skill | Unique territory | Does NOT own |
| --- | --- | --- |
| `samber/cc-skills-golang@golang-structs-interfaces` | Composition over inheritance, embedding, type assertions, struct tag conventions, pointer vs value receivers, interface segregation | How types combine into architectural patterns |
| `samber/cc-skills-golang@golang-design-patterns` | Functional options, middleware chains, circuit breaker, graceful shutdown, retry patterns | Low-level type mechanics |

**Overlap zone:** "DI via interfaces" — defining small interfaces is `golang-structs-interfaces`; wiring multiple components together via those interfaces is `golang-design-patterns`.

**Routing examples:**

- "Should my method take a value or pointer receiver?" → `golang-structs-interfaces`.
- "How do I implement a middleware chain for my HTTP handlers?" → `golang-design-patterns`.
- "How do I embed a struct without exposing its methods?" → `golang-structs-interfaces`.
- "How do I implement the functional options pattern?" → `golang-design-patterns`.

> Note: neither skill currently carries a description-level `→ See` disclaimer for this overlap. The boundary above is the intended design, not yet explicit in the source skills.

---

## 9. concurrency vs context

These skills overlap when goroutines are cancelled via context.

| Skill | Unique territory | Does NOT own |
| --- | --- | --- |
| `samber/cc-skills-golang@golang-concurrency` | Goroutine lifecycle, channel patterns, `sync.WaitGroup`, `errgroup`, worker pools, fan-out/fan-in, detecting races | Context propagation rules |
| `samber/cc-skills-golang@golang-context` | `context.WithCancel`, `context.WithTimeout`, `context.WithValue`, propagation through call chains, `WithoutCancel` | Goroutine coordination patterns |

**Overlap zone:** "cancelling goroutines via context" — load both skills. `golang-context` owns the context API; `golang-concurrency` owns the goroutine coordination.

**Routing examples:**

- "How do I cancel a goroutine from outside?" → both (`golang-context` for `cancel()`, `golang-concurrency` for `select { case <-ctx.Done() }`).
- "How do I fan out N workers and collect results?" → `golang-concurrency`.
- "How do I pass a deadline through multiple layers of function calls?" → `golang-context`.

> Note: no description-level disclaimer currently exists between these two skills. Load both when the task involves both concerns.

---

## 10. safety vs security

Both skills prevent bugs, but with different threat models.

| Skill | Unique territory | Does NOT own |
| --- | --- | --- |
| `samber/cc-skills-golang@golang-safety` | Nil panics, integer overflow, slice aliasing via append, concurrent map write, float equality, zero-value design | External attackers, cryptography, secrets |
| `samber/cc-skills-golang@golang-security` | SQL/command/LDAP injection, weak crypto (`math/rand`), hardcoded secrets, TLS misconfiguration, SSRF, path traversal | Internal runtime correctness |

**Routing examples:**

- "My service panics with nil pointer dereference" → `golang-safety`.
- "Is this SQL query safe from injection?" → `golang-security`.
- "I'm using `math/rand` to generate a token" → `golang-security` (predictable output; use `crypto/rand`).
- "My slice grows unexpectedly after append" → `golang-safety` (append aliasing).

> Note: no description-level disclaimer currently exists between these two skills. The source descriptions cross-reference in their bodies but not in the YAML frontmatter.

---

## 11. modernize vs lint

Both skills suggest code changes, but for different reasons.

| Skill | Unique territory | Does NOT own |
| --- | --- | --- |
| `samber/cc-skills-golang@golang-modernize` | Adopting language features: range-over-int, `min`/`max` builtins, `iter.Seq`, `slices.SortFunc`, `log/slog`, `testing.T.Context` | Static analysis configuration |
| `samber/cc-skills-golang@golang-lint` | golangci-lint YAML config, enabling/disabling linters, interpreting linter output, `//nolint` policy | Language feature adoption |

**Overlap zone:** Some linters (`govet`, `deadcode`, `perfsprint`) produce warnings that overlap with modernize suggestions (e.g., "use `slog` instead of `log`"). The boundary: lint owns the tool configuration and suppression policy; modernize owns the rewrite patterns to apply once you've decided to adopt the feature.

**Routing examples:**

- "How do I replace a `for i := 0; i < n; i++` loop with the new range syntax?" → `golang-modernize`.
- "My CI fails on `perfsprint` lint rule" → `golang-lint` (interpret the rule and decide whether to fix or suppress).
- "Should I migrate from `log` to `slog`?" → `golang-modernize`.
- "How do I configure golangci-lint to run only security-relevant linters?" → `golang-lint`.

---

## 12. Package lookup / discovery cluster

These four skills all touch "third-party packages", but each owns a different stage. `golang-pkg-go-dev` is the read-only lookup layer (query facts about an _existing_ import path on pkg.go.dev); the others decide, manage, or remediate.

| Skill | Unique territory | Does NOT own |
| --- | --- | --- |
| `samber/cc-skills-golang@golang-pkg-go-dev` | Querying pkg.go.dev for a known path: available versions, docs/symbols/examples, importers (`imported-by`), licenses, known CVEs — via the `godig` CLI/MCP | Deciding which library to pick, editing go.mod, scanning your own tree, navigating local/resolved code (→ `samber/cc-skills-golang@golang-gopls`) |
| `samber/cc-skills-golang@golang-popular-libraries` | Recommending a library for a use case; stdlib-vs-third-party judgment | Looking up facts about a specific published package |
| `samber/cc-skills-golang@golang-dependency-management` | Editing go.mod: `go get`, upgrading, pinning, `replace`/`exclude`, workspaces | Browsing a package's docs or version history |
| `samber/cc-skills-golang@golang-security` | Whole-tree vulnerability scanning with `govulncheck`, remediation across the module | Checking one module's CVEs without scanning the tree |

**Overlap zone:** "is dependency X safe / current?" — `golang-pkg-go-dev` answers facts (which versions exist, does this version have CVEs, who imports it); `golang-dependency-management` performs the upgrade/pin; `golang-security` scans your own code path for reachable vulnerabilities.

**Routing examples:**

- "What versions of github.com/samber/lo exist?" → `golang-pkg-go-dev` (`versions`).
- "Does golang.org/x/text v0.3.0 have known vulnerabilities?" → `golang-pkg-go-dev` (`vulns`).
- "Which packages import my library?" → `golang-pkg-go-dev` (`imported-by`).
- "Which logging library should I adopt?" → `golang-popular-libraries`.
- "Upgrade github.com/foo/bar to the latest version" → `golang-dependency-management`.
- "Scan my whole module for reachable CVEs" → `golang-security` (`govulncheck`).

> Note: this skill cross-references the other three in its body (and they reference it back). Prefer `golang-pkg-go-dev` over Context7 for any Go package fact-lookup.

**Sub-boundary — `godig` vs `gopls`:** both touch third-party code, but `godig` queries the remote pkg.go.dev index (works for packages not yet added to the project, no local build needed) while `gopls` (→ `samber/cc-skills-golang@golang-gopls`, via its MCP server, the native `LSP` tool, or its CLI) reasons about your actual resolved build in `go.sum` (including `replace`d forks).

- "Where is `Foo` defined in my repo?" or "find every call site of this dependency's function in my code" → `golang-gopls` (`go_search`/`go_symbol_references`), not `golang-pkg-go-dev` — godig has no visibility into local, unpublished code or call sites inside your own repo.
- "Does this package I haven't added yet have known CVEs?" → `golang-pkg-go-dev` (`vulns`).
- "Can my current build actually reach a vulnerability in a dependency I already use?" → `golang-gopls` (`go_vulncheck`) or `golang-security` (`govulncheck` whole-tree).

See the `samber/cc-skills-golang@golang-gopls` skill for the full gopls reference, and the `samber/cc-skills-golang@golang-how-to` skill's "`godig` vs gopls vs Context7 vs govulncheck" section for the full breakdown.

---

## 13. golang-refactoring vs. the target-state rule skills

`golang-refactoring` owns the _process_ of changing existing Go code safely at scale — planning, blast-radius mapping, ordering staged PRs, tool-driven mechanics (gopls Rename/Inline, `gofmt -r`, `eg`, `gopatch`), and the human-in-the-loop git model. It does not own what the resulting code should look like — that is split across five existing skills, each answering "refactor toward what?"

| Skill | Unique territory | Does NOT own |
| --- | --- | --- |
| `samber/cc-skills-golang@golang-refactoring` | The safe, staged, at-scale process: blast-radius mapping, PR ordering (structural-before-behavioral, conflict-avoidance, dependency), the refactoring-branch git model, tool-driven mechanics, coverage-adaptive safety net | Naming choices, target package layout, target design patterns, idiom adoption — the _shape_ the code should end up in |
| `samber/cc-skills-golang@golang-naming` | What to rename an identifier _to_ | How to apply a rename safely across a large codebase |
| `samber/cc-skills-golang@golang-project-layout` | Target package/directory layout, module splits | How to move code there without breaking every caller at once (type aliases, staged migration) |
| `samber/cc-skills-golang@golang-code-style` | Target control-flow shape (guard clauses, function size) | The mechanical transform that gets existing code to that shape |
| `samber/cc-skills-golang@golang-design-patterns` | Target patterns: options structs, consumer-side interfaces, DI | Sequencing a multi-step migration toward one of these patterns as reviewable PRs |
| `samber/cc-skills-golang@golang-modernize` | Version-driven idiom adoption (`interface{}`→`any`, `slices`/`maps`) — typically a single mechanical sweep | Multi-step structural refactors that need staged, human-reviewed PRs |

**Overlap zone:** almost every real refactor touches both — "rename this type and move it to a new package" needs `golang-naming` (the new name) and `golang-project-layout` (the new location) for the _target_, plus `golang-refactoring` for the _how_: blast-radius mapping, the type-alias gradual-repair recipe, and whether this lands as one PR or a staged sequence. Load `golang-refactoring` together with whichever target-rule skill defines the destination shape.

**Routing examples:**

- "This function is too long, break it up" → `golang-code-style` (what "too long" means, target shape) + `golang-refactoring` (Extract Function mechanics, verify behavior preserved).
- "Rename `Client.Send` to `Client.Publish` across the whole repo" → `golang-naming` (is this the right name) + `golang-refactoring` (workspace-wide gopls Rename, risk tier, PR staging).
- "Move this type to a new package without breaking every caller" → `golang-project-layout` (target location) + `golang-refactoring` (type-alias gradual-repair recipe, ordering).
- "Convert all `interface{}` to `any` across the module" → `golang-modernize` alone is usually sufficient (single mechanical sweep); reach for `golang-refactoring`'s staged-PR flow only if the sweep is large enough to need progressive human review.
- "Plan a multi-week refactor to break up this god package" → `golang-refactoring` as the primary skill (planning gate, ordering, staged PRs), pulling in `golang-project-layout` and `golang-design-patterns` for the target shape at each step.


## Source Reference: `golang-how-to/references/project-config.md`

# Configure mode — force-trigger Go skills in a project

This workflow writes two independent things to the project's agent-config file(s) (CLAUDE.md, AGENTS.md, or equivalent):

1. An **always-load directive** for `golang-how-to` itself — a single sentence, unconditional, no user confirmation needed.
2. An optional `## Required Go skills` block that force-triggers a specific, user-confirmed set of secondary skills.

## Table of Contents

- [When to use](#when-to-use)
- [Always-load directive](#always-load-directive)
  - [Template](#template)
  - [When it gets written](#when-it-gets-written)
  - [Insertion point](#insertion-point)
  - [Idempotency](#idempotency)
- [Step 1 — Detect the project config file(s)](#step-1--detect-the-project-config-files)
- [Step 2 — Idempotency check](#step-2--idempotency-check)
- [Step 3 — Confirm the skill set with the user](#step-3--confirm-the-skill-set-with-the-user)
- [Step 4 — Write the block](#step-4--write-the-block)
  - [Markdown targets (CLAUDE.md, AGENTS.md, GEMINI.md, copilot-instructions.md)](#markdown-targets-claudemd-agentsmd-geminimd-copilot-instructionsmd)
  - [Cursor target (`.cursor/rules/*.mdc`)](#cursor-target-cursorrulesmdc)
- [Step 5 — Confirm to the user](#step-5--confirm-to-the-user)
- [Notes on company overrides (⚙️ skills)](#notes-on-company-overrides-%EF%B8%8F-skills)

## When to use

- Any new Go project should get the always-load directive (see below) — this is the common case.
- The project additionally has a hard requirement on specific skills (e.g., `golang-security` must always apply, not just when the user mentions "security").
- The team has agreed on a fixed set of Go standards to enforce on every AI interaction.
- A company skill overrides a community default (⚙️ skills) and must always win.

## Always-load directive

Every Go project should carry a one-line directive telling the coding agent to load the `samber/cc-skills-golang@golang-how-to` orchestrator skill before starting Go work, so it in turn routes to whichever other Go skills the task actually needs. Unlike the `## Required Go skills` block below, this directive needs no user confirmation: it costs one skill description (~100 tokens) and is never wrong, since `golang-how-to` only routes to other skills — it does not impose project-specific choices.

### Template

```markdown
Before any Go coding, review, debugging, troubleshooting, or setup task, load the `samber/cc-skills-golang@golang-how-to` skill first — it routes to whichever other Go skills the task needs.
```

### When it gets written

- **At project creation** — the `samber/cc-skills-golang@golang-project-layout` skill writes this directive automatically as part of its Initialization Checklist, without asking the user.
- **On demand** — running `/golang-how-to configure` writes it too (if missing), in addition to any `## Required Go skills` block confirmed in Step 3 below.

### Insertion point

- If a `## Required Go skills` block already exists or is being created in the same pass, insert the directive as its own line directly above that heading, separated by a blank line.
- Otherwise, append it under a `## Go development` heading (create the heading if the file has no such section).

### Idempotency

Grep for the exact sentence before writing:

```bash
grep -n 'load the `samber/cc-skills-golang@golang-how-to` skill first' CLAUDE.md
```

Skip writing if already present.

## Step 1 — Detect the project config file(s)

Every harness reads its own agent-config file or directory. None is more "primary" than another — detect and write to whichever exist, and write to all of them if more than one does:

| File / directory | Harness(es) | Format |
| --- | --- | --- |
| `CLAUDE.md` | Claude Code | Markdown, single file, appended to |
| `AGENTS.md` | Codex, OpenCode, and other multi-agent harnesses | Markdown, single file, appended to |
| `GEMINI.md` | Gemini CLI, Antigravity | Markdown, single file, appended to |
| `.cursor/rules/*.mdc` | Cursor | **Directory** of `.mdc` files, each with its own YAML frontmatter — not a single markdown file to append to |
| `.github/copilot-instructions.md` | GitHub Copilot | Markdown, single file, appended to |

Check which of these exist at the project root. If multiple exist, write to all of them — different harnesses read different files, and a project may support several. If none exist, ask the user which one(s) to create.

## Step 2 — Idempotency check

For the markdown files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.github/copilot-instructions.md`), grep each one for the always-load directive and an existing `## Required Go skills` block before writing:

```bash
grep -n 'load the `samber/cc-skills-golang@golang-how-to` skill first' CLAUDE.md
grep -n "## Required Go skills" CLAUDE.md
```

For Cursor, check whether `.cursor/rules/golang-skills.mdc` already exists instead — its presence itself is the idempotency signal, since it's a dedicated file rather than a shared section inside a larger document.

Write the always-load directive if it's missing, regardless of what Step 3 decides. If a `## Required Go skills` block (or, for Cursor, the rule file) already exists, read it and confirm with the user whether to update it in place (replace the existing list) or skip.

## Step 3 — Confirm the skill set with the user

Confirm which skills to always load — one question, one round of confirmation, not a running back-and-forth. Present the ⭐️ recommended skills as the default selection. Remind the user of the token budget (each always-loaded skill adds its description tokens to every session — the 11 recommended skills add ~1,100 tokens at startup).

Recommended ⭐️ set for most projects:

```
golang-code-style
golang-data-structures
golang-design-patterns
golang-documentation
golang-error-handling
golang-modernize
golang-naming
golang-safety
golang-security
golang-testing
golang-troubleshooting
```

Additional skills to suggest based on codebase context:

- Database layer detected (`sql`, `gorm`, `sqlc`) → suggest `golang-database`
- CI config detected (`.github/workflows/`) → suggest `golang-continuous-integration`
- Cobra imports detected → suggest `golang-spf13-cobra`
- Viper imports detected → suggest `golang-spf13-viper`
- samber/lo imports detected → suggest `golang-samber-lo`
- Any other library-specific import → suggest the matching library skill

## Step 4 — Write the block

### Markdown targets (CLAUDE.md, AGENTS.md, GEMINI.md, copilot-instructions.md)

Template:

```markdown
Before any Go coding, review, debugging, troubleshooting, or setup task, load the `samber/cc-skills-golang@golang-how-to` skill first — it routes to whichever other Go skills the task needs.

## Required Go skills

The following Go skills from `samber/cc-skills-golang` MUST always be applied when working on this project. Load them at the start of every Go-related task, regardless of whether the user explicitly mentions them.

- `samber/cc-skills-golang@golang-error-handling`
- `samber/cc-skills-golang@golang-security`
- `samber/cc-skills-golang@golang-testing`
```

Replace the skill list with the confirmed set from Step 3. Use the fully-qualified `samber/cc-skills-golang@<name>` identifier for each skill. If Step 2 found the always-load directive already present elsewhere in the file, don't duplicate it — write only the `## Required Go skills` block.

Insertion point:

- If the file is empty: write the block at the top.
- If the file has existing content: append after the last section, separated by a blank line.
- If a `## Required Go skills` block already exists: replace only the bullet list inside it, preserving surrounding content.

Edit the file directly, rather than shelling out to a script — that keeps the change reviewable as a normal diff. Perform an idempotency check after writing: re-read the file and verify the block appears exactly once.

### Cursor target (`.cursor/rules/*.mdc`)

`.cursor/rules` is a directory, not a file — each rule lives in its own `.mdc` file with YAML frontmatter (`description`, `globs`, `alwaysApply`). Do not try to append to it as if it were a single markdown document; the append-and-replace logic above does not apply here.

Create `.cursor/rules/golang-skills.mdc` (create the `.cursor/rules/` directory first if it doesn't exist) using [cursor-go-skills.mdc](../assets/cursor-go-skills.mdc) as the starting template, with `alwaysApply: true` so it always loads — matching the unconditional behavior of the markdown targets' always-load directive. Replace the placeholder `## Required Go skills` list with the confirmed set from Step 3, same as the markdown targets. If the file already exists, replace only the bullet list, preserving its frontmatter and surrounding content.

## Step 5 — Confirm to the user

After writing, summarize:

- Which file(s) or rule(s) were updated
- Whether the always-load directive for `golang-how-to` was added or was already present
- Which skills were added to the always-load list
- Approximate startup token cost (number of skills × ~100 tokens per description)
- Note: skills marked ⚙️ (overridable) will be superseded if a company skill explicitly declares the override in its body

## Notes on company overrides (⚙️ skills)

Skills marked ⚙️ in the README support company overrides. If the project has a company skill that supersedes a community default (e.g., `acme/cc-skills@golang-error-handling-acme` supersedes `samber/cc-skills-golang@golang-error-handling`), use the company skill FQN in the block instead — do NOT list both.

To declare an override in a company skill body, add near the top:

```
> This skill supersedes `samber/cc-skills-golang@golang-error-handling` for [Company] projects.
```

Overridable skills: `golang-code-style`, `golang-concurrency`, `golang-context`, `golang-database`, `golang-dependency-injection`, `golang-design-patterns`, `golang-documentation`, `golang-error-handling`, `golang-naming`, `golang-observability`, `golang-structs-interfaces`, `golang-testing`.


## Source Asset: `golang-how-to/assets/cursor-go-skills.mdc`

---
description: Load the Go skills orchestrator before any Go task
alwaysApply: true
---

Before any Go coding, review, debugging, troubleshooting, or setup task, load the `samber/cc-skills-golang@golang-how-to` skill first — it routes to whichever other Go skills the task needs.

## Required Go skills

The following Go skills from `samber/cc-skills-golang` MUST always be applied when working on this project. Load them at the start of every Go-related task, regardless of whether the user explicitly mentions them.

- `samber/cc-skills-golang@golang-error-handling`
- `samber/cc-skills-golang@golang-security`
- `samber/cc-skills-golang@golang-testing`

