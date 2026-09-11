# Backend Golang Skills

[![Install with npx skills](https://img.shields.io/badge/install-npx%20skills-111827?logo=npm&logoColor=white)](https://github.com/vercel-labs/skills)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-compatible-2563eb)](https://agentskills.io)
[![Go 1.27](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go&logoColor=white)](https://go.dev/)
[![License](https://img.shields.io/badge/license-Apache--2.0-green)](LICENSE)
[![Discover on skills.sh](https://skills.sh/b/amirex128/backend_golang_skills)](https://skills.sh/amirex128/backend_golang_skills)

**Backend Golang Skills** is an open, reusable collection of [Agent Skills](https://agentskills.io) for building production-ready Go 1.27 backends with AI coding agents. Install the skills directly from GitHub with the official Vercel Labs `npx skills` CLI and use them with Claude Code, Cursor, Codex, OpenCode, GitHub Copilot, and other supported coding agents.

The repository combines general-purpose **Golang engineering standards** with a dedicated **GoFr backend framework skill**. It is designed for API development, microservices, Clean Architecture, CQRS, concurrency, databases, testing, security, observability, performance, and production operations.

## Why use Backend Golang Skills?

- **Production-oriented Go guidance** for maintainable, secure, testable backend systems.
- **Clean Architecture and CQRS by default** for new backend projects and architecture changes.
- **Progressive disclosure** through focused references instead of one oversized prompt.
- **Framework-aware development** with a separate GoFr skill for GoFr-specific APIs and conventions.
- **Native Agent Skills distribution** with no custom installer or proprietary runtime.
- **Multi-agent support** through the official `skills` CLI.
- **Go 1.27 targeting** with practical guidance for APIs, services, CLIs, libraries, and infrastructure.

## Quick install

Install all skills from this repository into the coding agents detected in the current project:

```bash
npx skills add amirex128/backend_golang_skills
```

Install the general Golang engineering skill:

```bash
npx skills add amirex128/backend_golang_skills --skill golang
```

Install the GoFr framework skill:

```bash
npx skills add amirex128/backend_golang_skills --skill gofr
```

For a GoFr project, install both skills:

```bash
npx skills add amirex128/backend_golang_skills \
  --skill golang \
  --skill gofr
```

## Install for specific AI coding agents

Install the Golang skill for selected agents:

```bash
npx skills add amirex128/backend_golang_skills \
  --skill golang \
  --agent claude-code \
  --agent cursor \
  --agent codex \
  --agent opencode
```

Install all repository skills for all supported agents without prompts:

```bash
npx skills add amirex128/backend_golang_skills --all
```

Install globally for the current user:

```bash
npx skills add amirex128/backend_golang_skills \
  --global \
  --skill golang
```

Use a skill without permanently installing it:

```bash
npx skills use amirex128/backend_golang_skills@golang
```

List available skills before installing:

```bash
npx skills add amirex128/backend_golang_skills --list
```

The official `skills` CLI manages agent-specific directories, symlinks, copies, updates, and installation scope. Run `npx skills add --help` for the current list of supported agents and options.

If npm reports `ENOTEMPTY` while preparing the `skills` package, follow the [installation troubleshooting guide](docs/installation-troubleshooting.md). That error normally indicates a stale local npx cache directory; it is not caused by this repository.

## Available skills

### `golang`

A unified Go 1.27 engineering skill for designing, implementing, reviewing, refactoring, testing, debugging, securing, and documenting production-quality Go code.

Topics include:

- Clean Architecture and CQRS
- Domain-driven application boundaries and project layout
- REST APIs, backend services, microservices, and CLIs
- Go style, naming, interfaces, generics, and API design
- Concurrency, goroutines, channels, synchronization, and context cancellation
- SQL, database access, transactions, locking, and persistence patterns
- Error handling, resource safety, nil safety, and defensive programming
- Unit, integration, HTTP, race, fuzz, benchmark, and architecture testing
- Security, authentication boundaries, secrets, cryptography, and input validation
- Performance profiling, benchmarking, observability, and troubleshooting
- Refactoring, modernization, documentation, Testify, and Swagger/OpenAPI

Install it with:

```bash
npx skills add amirex128/backend_golang_skills --skill golang
```

### `gofr`

A framework-specific GoFr skill for building Go 1.27 backend services with GoFr. It covers GoFr routing, handlers, configuration, Context, SQL and NoSQL datasources, migrations, authentication, RBAC, observability, tracing, metrics, resilience, gRPC, GraphQL, WebSockets, streaming, Pub/Sub, cron, file handling, CLI applications, Docker, Kubernetes, CI/CD, and production operations.

Install it with:

```bash
npx skills add amirex128/backend_golang_skills --skill gofr
```

## How the skills work together

Use `golang` for general Go engineering decisions and implementation quality. Add `gofr` when the project uses GoFr or the requested feature depends on GoFr APIs and conventions. The general skill provides the architectural and quality baseline; the GoFr skill provides framework-specific implementation rules.

For new backend services, the default architecture is **Clean Architecture with CQRS**:

- Domain rules remain independent of transport and infrastructure.
- Application use cases own ports and coordinate commands and queries.
- Commands handle state changes and explicit transaction boundaries.
- Queries handle reads without hidden mutation.
- HTTP, gRPC, messaging, databases, and external clients remain at the system edge.
- `cmd/<service>/main.go` remains a thin composition root.

## Repository structure

```text
backend_golang_skills/
├── skills/
│   ├── golang/
│   │   ├── SKILL.md
│   │   └── references/
│   └── gofr/
│       ├── SKILL.md
│       └── references/
├── docs/
├── .gitignore
├── LICENSE
└── README.md
```

Every installable skill is self-contained. The directory name matches the lowercase kebab-case `name` in its `SKILL.md`. Detailed guidance lives in `references/` and is loaded progressively by the coding agent when relevant.

## Development and validation

Validate both skills with the repository's Agent Skills validator:

```bash
python3 /home/ubuntu/skills/skill-creator/scripts/quick_validate.py skills/golang
python3 /home/ubuntu/skills/skill-creator/scripts/quick_validate.py skills/gofr
```

Test native discovery from the repository:

```bash
npx skills add . --list
```

Test installation for Claude Code:

```bash
npx skills add . \
  --skill golang \
  --copy \
  --agent claude-code \
  --yes
```

Do not add a custom npm installer, runtime dependency, or agent-specific installation script. The official `skills` CLI is the distribution layer.

## Contributing

Contributions are welcome. When adding or updating a skill:

1. Keep the skill in `skills/<skill-name>/`.
2. Include a valid `SKILL.md` with a concise, discovery-friendly description.
3. Keep `name` and the directory name identical.
4. Put detailed topic material in `references/` for progressive disclosure.
5. Preserve English documentation and consistent terminology.
6. Run the validator and native `npx skills` discovery tests.
7. Explain behavioral, architectural, or compatibility changes in the pull request.

## License

This repository is licensed under the [Apache License 2.0](LICENSE). Bundled references may retain upstream attribution and licensing notices where applicable.

## Links

- [GitHub repository](https://github.com/amirex128/backend_golang_skills)
- [Agent Skills specification](https://agentskills.io)
- [Official `skills` CLI](https://github.com/vercel-labs/skills)
- [Skills marketplace](https://skills.sh)
- [Go documentation](https://go.dev/doc/)
- [GoFr documentation](https://gofr.dev/)
