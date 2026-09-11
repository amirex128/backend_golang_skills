# Go Documentation and Project Communication

Documentation is part of the API. Exported packages, types, functions, methods, constants, and variables need accurate godoc comments beginning with the declared name. Explain purpose, invariants, ownership, errors, concurrency, security, and examples; do not restate syntax.

Libraries should have package docs, runnable `Example...` tests, API behavior and compatibility notes, README quickstart/install/usage, CONTRIBUTING, LICENSE, and CHANGELOG. Applications and CLIs should document purpose, architecture, local setup, configuration/env vars, commands, dependencies, health/operational behavior, testing, deployment, and troubleshooting. Keep docs synchronized with code and include commands users can run.

Use examples as executable documentation with correct naming and output directives. Prefer diagrams or tables only when they clarify. Avoid stale generated docs; document generation commands and verify generated artifacts.

When publishing machine-oriented context, keep a concise index of capabilities, configuration, interfaces, operational commands, and links to authoritative references. Never document secrets or imply unsupported compatibility.
