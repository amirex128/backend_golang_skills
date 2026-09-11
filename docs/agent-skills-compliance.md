# Agent Skills Compliance

This repository follows the open Agent Skills format documented at [agentskills.io/specification](https://agentskills.io/specification).

## Required layout

Every installable skill is a directory containing a required `SKILL.md`. Optional material belongs in `references/`, `scripts/`, and `assets/`. This repository exposes `skills/golang/` and `skills/gofr/` directly to the official `npx skills` CLI.

## `SKILL.md` metadata

The GoFr skill has YAML frontmatter with:

- `name: gofr`: lowercase, one word, valid under the 1–64 character rule, and matching the directory name.
- A non-empty `description` under 1024 characters that states both capability and activation conditions.
- `license` and string-valued `metadata` fields for distribution and environment context. Compatibility is recorded inside metadata for compatibility with the repository validator.

The body is intentionally short and procedural. It contains the mandatory GoFr workflow and a capability router; detailed material is progressively disclosed in one focused file per official GoFr page.

## Progressive disclosure

Agents first discover the metadata, then load the 122-line `SKILL.md`, and only then read the selected reference files. The skill does not embed the full documentation dump in its main instructions. The manifest contains 86 active implementation references: all current GoFr Quick Start, Advanced Guide, Datasource, Production Guide, and Reference pages. GoFr migration and comparison pages are intentionally excluded by project scope. References are one level below the skill root and are mapped by `skills/manifest.json`.

## Validation

Validate with the Manus skill validator:

```bash
python3 /home/ubuntu/skills/skill-creator/scripts/quick_validate.py skills/gofr
```

If `skills-ref` is installed, the equivalent official validator is:

```bash
skills-ref validate skills/gofr
```

The native installation test must verify discovery with `npx skills add . --list` and installation of a selected skill with `npx skills add . --skill golang --copy --agent claude-code --yes`. The CLI owns agent-specific target paths and symlink/copy behavior.

## Distribution

The repository is distributed directly through the GitHub-compatible `npx skills add amirex128/backend_golang_skills` command. Future skills must be added as `skills/<lowercase-name>/SKILL.md`; no custom npm package, installer, or agent-specific installation script is required.
