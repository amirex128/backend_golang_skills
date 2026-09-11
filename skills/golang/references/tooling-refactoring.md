# Tooling, Modernization, and Safe Refactoring

Inspect the module's `go` directive and toolchain before adopting language/library features. Run `go version`, `go env`, `go list -m all`, and `go doc` as needed. Use `gopls` for definitions, references, diagnostics, rename, extract, and code actions; use `go vet`, configured `golangci-lint`, `govulncheck`, and formatters as project gates.

## Modernize deliberately

Use recent standard-library features only when the module version supports them. Check deprecations and release notes; update `go.mod` and CI together. In Go 1.27, `go test` runs the `stdversion` vet check by default, so a newer-API failure means either bump the module directive intentionally or replace the API. Do not silence the check.

## Refactoring safety net

Before changing structure, establish a clean baseline: compile, tests, race checks where relevant, and behavior fixtures. Make small stacked changes. Rename symbols semantically with `gopls`; use `gofmt -r`, `gofumpt`, `goimports`, or `gopatch` only with review. Preserve compatibility with type aliases, adapters, or staged deprecation when public APIs are involved. Break import cycles by moving abstractions to the consumer boundary or extracting a small package, not by adding global state.

Refactoring triggers include oversized functions/types, duplicated behavior, unclear ownership, package cycles, hidden globals, and repeated conditionals. Choose transformations such as extract function/type, guard clauses, introduce parameter object, replace primitive with value type, and split package only when tests and dependency direction support it.

## Verification

After each logical step run formatting, compilation, focused tests, full tests, and inspect `git diff`. Never combine a behavior change, dependency upgrade, and broad structural move without a reason and separate validation.
