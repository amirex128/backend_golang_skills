# Backend Golang Skills

[![Install with skills](https://img.shields.io/badge/install-npx%20skills-blue)](https://skills.sh)
[![Skills standard](https://img.shields.io/badge/standard-Agent%20Skills-111827)](https://agentskills.io)

A professional collection of reusable [Agent Skills](https://agentskills.io) for Go 1.27 backend engineering. The repository is intentionally compatible with the official `skills` CLI from Vercel Labs and requires no custom installer.

## Install with `npx skills`

Install all skills from this repository into the coding agents detected on the current machine:

```bash
npx skills add amirex128/backend_golang_skills
```

Install only the unified Go engineering skill:

```bash
npx skills add amirex128/backend_golang_skills --skill golang
```

Install only the GoFr framework skill:

```bash
npx skills add amirex128/backend_golang_skills --skill gofr
```

List the skills available in this repository without installing them:

```bash
npx skills add amirex128/backend_golang_skills --list
```

Install for specific coding agents:

```bash
npx skills add amirex128/backend_golang_skills \
  --skill golang \
  --agent claude-code \
  --agent cursor \
  --agent codex \
  --agent opencode
```

Install globally for the user instead of the current project:

```bash
npx skills add amirex128/backend_golang_skills --global --skill golang
```

Install all skills to all supported agents non-interactively, for CI or automation:

```bash
npx skills add amirex128/backend_golang_skills --all
```

Use a skill without permanently installing it:

```bash
npx skills use amirex128/backend_golang_skills@golang
npx skills use amirex128/backend_golang_skills --skill golang --agent claude-code
```

The `skills` CLI automatically discovers the repository's `skills/<skill-name>/SKILL.md` directories and installs them into the correct agent-specific locations. It supports Claude Code, Cursor, Codex, OpenCode, GitHub Copilot, and many other coding agents. Use `npx skills add --help` for the current complete agent list and CLI options.

## Available skills

| Skill | Purpose | Install command |
|---|---|---|
| `golang` | Unified Go 1.27 engineering guidance: Clean Architecture, CQRS, design, concurrency, context, errors, databases, testing, security, performance, refactoring, documentation, troubleshooting, Testify, and Swagger. | `npx skills add amirex128/backend_golang_skills --skill golang` |
| `gofr` | GoFr-only backend development covering routing, configuration, datasources, migrations, observability, authentication, gRPC, GraphQL, messaging, CLI, deployment, and production operations. | `npx skills add amirex128/backend_golang_skills --skill gofr` |

For GoFr projects, install both skills so the general Go engineering rules and the framework-specific rules are available together:

```bash
npx skills add amirex128/backend_golang_skills --skill golang --skill gofr
```

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

Every installable skill is self-contained. Its directory name matches the kebab-case `name` in `SKILL.md`. References are loaded progressively by the coding agent only when the task requires them.

## Skill behavior

The `golang` skill is the default engineering guide for Go 1.27 work. New backend architecture follows Clean Architecture with CQRS: domain and application dependencies point inward, commands handle state changes, queries handle reads, and adapters/infrastructure remain at the edge.

The `gofr` skill is intentionally framework-specific. Use it when the project uses GoFr or when the task explicitly requires GoFr APIs and conventions.

## Development and validation

Validate a skill with the Agent Skills validator:

```bash
python3 /home/ubuntu/skills/skill-creator/scripts/quick_validate.py skills/golang
python3 /home/ubuntu/skills/skill-creator/scripts/quick_validate.py skills/gofr
```

Test discovery and installation from the repository itself:

```bash
npx skills add . --list
rm -rf /tmp/backend-golang-skills-agent-test
npx skills add . --skill golang --copy --agent '*' --yes
```

When testing in a real project, run the command from that project's root and use `--copy` if symlinks are not desired.

## Contributing

Keep each skill self-contained and standards-compliant. Update `SKILL.md` when its trigger conditions or workflow changes, move detailed material into `references/` for progressive disclosure, keep descriptions concise and discovery-friendly, and run the validator before opening a pull request. Do not add custom installers or agent-specific installation scripts; the official `npx skills` CLI owns discovery and installation.

## License

This repository is licensed under Apache-2.0. Individual bundled references may retain upstream attribution and licensing notices where applicable.

## Links

- [Agent Skills specification](https://agentskills.io)
- [Official skills CLI](https://github.com/vercel-labs/skills)
- [Skills marketplace](https://skills.sh)
- [Repository](https://github.com/amirex128/backend_golang_skills)
