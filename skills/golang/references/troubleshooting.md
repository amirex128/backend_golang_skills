# Troubleshooting and Root-Cause Debugging

Start with reproduction, evidence, and scope. Capture the exact command, Go version, module/toolchain, OS, commit, logs, stack trace, input, and whether the failure is deterministic. Reduce to the smallest failing test or package. Do not guess, add sleeps, or increase retries before understanding the cause.

## Fast triage

Compilation: run `go test`, `go build`, `go list -deps`, inspect imports, module graph, build tags, generated files, and `go env`. Runtime panics: read the full stack, identify the first frame in application code, check nil/typed-nil, ownership, bounds, and cleanup. Deadlocks/hangs: inspect goroutine dumps, channel ownership, lock ordering, blocked I/O, missing cancellation, and WaitGroup balance. Races: reproduce with `go test -race`, identify conflicting accesses, then fix ownership/synchronization rather than adding delays. Flaky tests: isolate shared state, time, randomness, order, ports, files, and goroutine leaks.

## Tools

Use `gopls` diagnostics/references, Delve for interactive breakpoints, `go test -run`, `-v`, `-count=1`, `-timeout`, `GODEBUG` tracing where relevant, goroutine dumps, and `pprof` for CPU/heap/goroutine/block/mutex profiles. Profile before optimizing. Compare benchmark outputs with `benchstat`. For production debugging, prefer low-risk read-only evidence, bounded diagnostics, redaction, and rollback/feature flags.

## Fix workflow

Write a regression test that fails for the root cause, make the smallest fix, run focused and full validation, run race/fuzz/security checks when relevant, inspect the diff, and document the cause and prevention. If evidence is insufficient, state what is known and what measurement is needed.
