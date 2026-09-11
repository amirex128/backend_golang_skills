# Backend Golang Skills

A multi-skill, installable knowledge base for building Go backends. It includes a comprehensive **Golang** skill synthesized from the supplied 19 Go skills and a separate **GoFr** framework skill.

## Install with npx

```bash
npx backend-golang-skills --list
npx backend-golang-skills golang --target .agents
npx backend-golang-skills gofr --target .agents
# or install every available skill
npx backend-golang-skills --all --target .agents
```

The default target is `./.agents/skills`, matching the Agent Skills quickstart convention. The installer is intentionally skill-agnostic so future skills can be added under `skills/<skill-name>/` without changing the command.

## GoFr skill

The GoFr skill is mandatory for Go 1.27 backend work in a project that uses this repository. It covers the official Quick Start, Advanced Guide, production guides, datasources, references, project-context pages, and AI-assistant conventions. Framework/language migration and comparison pages are intentionally excluded. Start at [`skills/gofr/SKILL.md`](skills/gofr/SKILL.md); use [`skills/manifest.json`](skills/manifest.json) to locate the exact page reference for a feature.

The reference snapshot is sourced from the official [GoFr repository](https://github.com/gofr-dev/gofr), [curated AI index](https://gofr.dev/llms.txt), [full documentation dump](https://gofr.dev/llms-full.txt), and [AGENTS.md](https://gofr.dev/AGENTS.md). See [`docs/source-urls.txt`](docs/source-urls.txt) for the user-provided URL inventory.

## Unified Golang skill

The `golang` skill is the default engineering skill for Go 1.27 work. It routes each task to only the references it needs: style and naming, design and layout, data structures, concurrency and context, errors and safety, databases, testing, security, refactoring/tooling, documentation, troubleshooting, performance, and Testify/Swagger. It consolidates all 19 supplied source skills into 13 compact topic references without bundling their eval fixtures or duplicating their separate orchestration layers. The provenance map is [`docs/unified-golang-source-map.json`](docs/unified-golang-source-map.json).

When implementing or reviewing Go code, install `golang`; when using GoFr, install both `golang` and `gofr` so general Go engineering rules and GoFr-specific APIs are available.

## Development

```bash
node installer/index.js --list
node installer/index.js gofr --target /tmp/test-agent
test -f /tmp/test-agent/skills/gofr/SKILL.md
```

When refreshing GoFr, update the official source snapshot, regenerate references and `skills/manifest.json`, validate the installer, and record the snapshot date.
