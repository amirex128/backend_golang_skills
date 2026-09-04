# Agent Skills Compliance

This repository follows the open Agent Skills format documented at [agentskills.io/specification](https://agentskills.io/specification).

## Required layout

Every installable skill is a directory containing a required `SKILL.md`. Optional material belongs in `references/`, `scripts/`, and `assets/`. The current GoFr package is at `skills/gofr/`.

## `SKILL.md` metadata

The GoFr skill has YAML frontmatter with:

- `name: gofr`: lowercase, one word, valid under the 1–64 character rule, and matching the directory name.
- A non-empty `description` under 1024 characters that states both capability and activation conditions.
- `license`, `compatibility`, and string-valued `metadata` fields for distribution and environment context.

The body is intentionally short and procedural. It contains the mandatory GoFr workflow and a capability router; detailed material is progressively disclosed in one focused file per official GoFr page.

## Progressive disclosure

Agents first discover the metadata, then load the 68-line `SKILL.md`, and only then read the selected reference files. The skill does not embed the 105-page documentation dump in its main instructions. References are one level below the skill root and are mapped by `skills/manifest.json`.

## Validation

Validate with the Manus skill validator:

```bash
python3 /home/ubuntu/skills/skill-creator/scripts/quick_validate.py skills/gofr
```

If `skills-ref` is installed, the equivalent official validator is:

```bash
skills-ref validate skills/gofr
```

The installer test must also verify that `SKILL.md` and at least one routed reference are copied into `.agents/skills/gofr/`.

## Distribution

The package is distributed as a version-controlled multi-skill repository and through the GitHub-compatible npx command documented in the root README. Future skills must be added as `skills/<lowercase-name>/SKILL.md` and must not require changes to the common installer contract.
