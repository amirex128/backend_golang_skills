# Installation Troubleshooting

This repository is installed by the official Vercel Labs `skills` CLI. It does not use a custom installer or an npm runtime package from this repository.

## Verify the repository first

List the skills without installing them:

```bash
npx --yes skills add amirex128/backend_golang_skills --list
```

You should see:

```text
gofr
golang
```

Install the unified Go skill:

```bash
npx --yes skills add amirex128/backend_golang_skills --skill golang
```

## Fix `npm ERR! ENOTEMPTY` in the npx cache

An error such as:

```text
npm ERR! code ENOTEMPTY
npm ERR! syscall rename
npm ERR! path ~/.npm/_npx/<cache-id>/node_modules/skills
npm ERR! dest ~/.npm/_npx/<cache-id>/node_modules/.skills-<temporary-name>
```

means that npm found a stale or partially written temporary installation directory in the local npx cache. It is not a repository-content or Skill-format error.

### Recommended targeted cleanup

Remove only the cache directory shown in the error, then retry:

```bash
rm -rf ~/.npm/_npx/<cache-id>
npx --yes skills add amirex128/backend_golang_skills --skill golang
```

Replace `<cache-id>` with the directory from the error message, for example:

```bash
rm -rf ~/.npm/_npx/ac0ed6aa23b37c1e
```

### General npx cache cleanup

If the targeted directory no longer exists or the error repeats, remove stale npx temporary installations and verify the npm cache:

```bash
rm -rf ~/.npm/_npx/*
npm cache verify
npx --yes skills add amirex128/backend_golang_skills --skill golang
```

### Last-resort npm cache reset

Use this only when the previous cleanup does not resolve the issue:

```bash
npm cache clean --force
npx --yes skills add amirex128/backend_golang_skills --skill golang
```

Do not delete the repository's `skills/` directory. The installed source is downloaded from GitHub by the official CLI.

## Use a clean temporary npm cache

To prove that the repository and Skill are healthy without touching your normal npm cache:

```bash
mkdir -p /tmp/backend-golang-skills-home /tmp/backend-golang-skills-cache
HOME=/tmp/backend-golang-skills-home \
NPM_CONFIG_CACHE=/tmp/backend-golang-skills-cache \
npx --yes skills add amirex128/backend_golang_skills \
  --skill golang \
  --copy \
  --agent claude-code \
  --yes
```

## Other useful diagnostics

```bash
node --version
npm --version
npx --yes skills --version
npm cache verify
```

If a clean cache succeeds while the normal cache fails, the problem is confirmed to be local npm cache state. If a clean cache also fails, capture the complete command output and check network access to GitHub and npm.

## Installation scope

By default, the CLI detects supported coding agents and installs project-local links or copies. To install for one agent explicitly:

```bash
npx --yes skills add amirex128/backend_golang_skills \
  --skill golang \
  --copy \
  --agent claude-code \
  --yes
```

To install globally:

```bash
npx --yes skills add amirex128/backend_golang_skills \
  --skill golang \
  --global
```
