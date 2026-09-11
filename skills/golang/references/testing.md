# Testing and Quality

Tests should make behavior, failure modes, and contracts executable. Prefer table-driven tests with descriptive subtests, arrange/act/assert structure, and `t.Helper()` for helpers. Test the public behavior and edge cases rather than implementation trivia.

## Unit, HTTP, and examples

Use `httptest.NewRequest`/`NewRecorder` for handlers without a server. Set content types and assert status, headers, body, and error behavior. Use external `package foo_test` examples for public API documentation; `ExampleType_Method_variant` names must attach correctly, and `// Output:` or `// Unordered output:` makes examples executable.

Use `t.Parallel()` only when tests are isolated; avoid shared mutable fixtures and parallel tests that contend for ports/files/global state. Use `t.Cleanup` for deterministic teardown. For hanging operations, enforce a bounded test timeout without masking goroutine leaks.

## Mocks and Testify

Mock interfaces where consumed, not concrete implementations. Use `assert` for multiple checks and `require` for prerequisites. With testify/mock, set precise expectations, use typed argument matchers sparingly, verify calls, and avoid brittle over-specification. Suites are useful for shared lifecycle but should not obscure test independence.

## Integration, race, fuzz, coverage

Gate real-service tests with `//go:build integration`; use isolated databases or testcontainers and never production. Run `go test -race ./...` for concurrent code. Fuzz parsers and boundary functions with invariants such as round-trip properties, no panics, and bounded resource use. Coverage identifies untested paths; it is not a quality target. Use `-coverpkg` deliberately and `-covermode=atomic` with race/parallel execution.

## Benchmarks

Use sub-benchmarks for variants and input sizes. For Go 1.24+ use `b.Loop()`; use `ReportAllocs` when allocations matter. Keep setup outside timed work, prevent dead-code elimination, run stable repeated comparisons, and use `benchstat` before claiming improvement. Newer Go versions provide test artifact directories; use them rather than repository-local scratch output.

## Minimum commands

`go test ./...`; targeted `go test -run`; `go test -race ./...` when relevant; `go test -coverprofile=coverage.out ./...`; `go test -tags=integration`; `go test -fuzz=...`; and `go test -bench=. -benchmem ./...` as applicable.
