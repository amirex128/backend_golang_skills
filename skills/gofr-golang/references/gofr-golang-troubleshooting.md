# GoFr-Golang: Troubleshooting

## GoFr adaptation rules

This is the GoFr-specific form of the general Golang guidance below. Use GoFr as the mandatory framework for service delivery: begin services with `gofr.New()`, keep GoFr lifecycle, configuration, health, structured logging, Prometheus metrics, OpenTelemetry tracing, datasource management, and graceful shutdown intact, and never silently replace GoFr with another web framework. Use the exact GoFr version installed by the project and verify version-sensitive APIs against the project module and official GoFr documentation.

Keep GoFr types at the adapter boundary. GoFr HTTP, gRPC, GraphQL, WebSocket, cron, and CLI handlers use the documented `func(c *gofr.Context) (any, error)` shape where applicable. Bind with `c.Bind(&value)` and check the error; read route parameters with `c.PathParam`, query values with `c.Param`, and return values/errors to GoFr instead of recreating response envelopes. Pass `*gofr.Context` through GoFr datasource/downstream calls for cancellation and trace propagation, but translate to application contracts before entering domain code.

The complete GoFr page set remains in the repository's `skills/gofr` Skill. Read the listed official pages there before implementing the relevant feature; these links are the authoritative framework-specific follow-up for this adapted reference.

## GoFr adaptation rules

Apply GoFr lifecycle, context, configuration, datasource, error, health, and observability conventions to this topic while preserving the Clean Architecture dependency rule.

## Required GoFr references

- `advanced-guide-debugging.md` — https://gofr.dev/docs/advanced-guide/debugging
- `references-context.md` — https://gofr.dev/docs/references/context
- `quick-start-observability.md` — https://gofr.dev/docs/quick-start/observability
- `advanced-guide-monitoring-service-health.md` — https://gofr.dev/docs/advanced-guide/monitoring-service-health
- `guides-graceful-shutdown.md` — https://gofr.dev/docs/guides/graceful-shutdown

## Unified Golang guidance

# Troubleshooting

This reference consolidates all retained guidance from `golang-troubleshooting`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Persona:** You are a Go systems debugger. You follow evidence, not intuition — instrument, reproduce, and trace root causes systematically.

**Thinking mode:** Reason as thoroughly as possible for debugging and root cause analysis — rushed reasoning leads to symptom fixes, deep thinking finds the actual root cause. On Claude Code, use `ultrathink` to trigger extended thinking explicitly.

**Orchestration mode:** Fan out the five bug-category sub-agents described in Codebase bug hunt mode for a codebase-wide bug hunt. A single-issue debug session should stay sequential; orchestration only pays off when scanning broadly for unknown bugs. On Claude Code, use `ultracode` to opt into multi-agent orchestration explicitly.

**Modes:**

- **Single-issue debug** (default): Follow the sequential Golden Rules — read the error, reproduce, one hypothesis at a time. Do not launch sub-agents; focused sequential investigation is faster for a single known symptom.
- **Codebase bug hunt** (explicit audit of a large codebase): Launch up to 5 parallel sub-agents, one per bug category (nil/interface, resources, error handling, races, context/slice/map). Use this mode when the user asks for a broad sweep, not when debugging a specific reported issue.

**Dependencies:**

- dlv: `go install github.com/go-delve/delve/cmd/dlv@latest`

# Go Troubleshooting Guide

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.** Symptom fixes create new bugs and waste time. This process applies ESPECIALLY under time pressure — rushing leads to cascading failures that take longer to resolve.

When the user reports a bug, crash, performance problem, or unexpected behavior in Go code:

1. **Start with the Decision Tree** below to identify the symptom category and jump to the relevant section.
2. **Follow the Golden Rules** — especially: reproduce before you fix, one hypothesis at a time, find the root cause.
3. **Work through the General Debugging Methodology** step by step. Do not skip steps.
4. **Watch for Red Flags** in your own reasoning. If you catch yourself guessing at fixes without understanding the cause, stop and gather more evidence.
5. **Escalate tools incrementally.** Start with the simplest diagnostic (`fmt.Println`, test isolation) and only reach for pprof, Delve, or GODEBUG when simpler tools are insufficient.
6. **Never propose a fix you cannot explain.** If you do not understand why the bug happens, say so and investigate further.

## Quick Decision Tree

```
WHAT ARE YOU SEEING?

"Build won't compile"
  → go build ./... 2>&1, go vet ./...
  → See [compilation.md](./references/compilation.md)

"Wrong output / logic bug"
  → Write a failing test → Check error handling, nil, off-by-one
  → See [common-go-bugs.md](./references/common-go-bugs.md), [testing-debug.md](./references/testing-debug.md)

"Random crashes / panics"
  → GOTRACEBACK=all ./app → go test -race ./...
  → See [common-go-bugs.md](./references/common-go-bugs.md), [diagnostic-tools.md](./references/diagnostic-tools.md)

"Sometimes works, sometimes fails"
  → go test -race ./...
  → See [concurrency-debug.md](./references/concurrency-debug.md), [testing-debug.md](./references/testing-debug.md)

"Program hangs / frozen"
  → curl localhost:6060/debug/pprof/goroutine?debug=2
  → See [concurrency-debug.md](./references/concurrency-debug.md), [pprof.md](./references/pprof.md)

"High CPU usage"
  → pprof CPU profiling
  → See [performance-debug.md](./references/performance-debug.md), [pprof.md](./references/pprof.md)

"Memory growing over time"
  → pprof heap profiling
  → See [performance-debug.md](./references/performance-debug.md), [concurrency-debug.md](./references/concurrency-debug.md)

"Slow / high latency / p99 spikes"
  → CPU + mutex + block profiles
  → See [performance-debug.md](./references/performance-debug.md), [diagnostic-tools.md](./references/diagnostic-tools.md)

"Simple bug, easy to reproduce"
  → Write a test, add fmt.Println / log.Debug
  → See [testing-debug.md](./references/testing-debug.md)
```

**Remember:** Read the Error → Reproduce → Measure One Thing → Fix → Verify

Most Go bugs are: missing error checks, nil pointers, forgotten context cancel, unclosed resources, race conditions, or silent error swallowing.

## The Golden Rules

### 1. Read the Error Message First

Go error messages are precise. Read them fully before doing anything else:

- **File and line number** → go directly there
- **Type mismatch** → check function signatures, interface satisfaction
- **"undefined"** → check imports, exported names, build tags
- **"cannot use X as Y"** → check concrete types vs interfaces

### 2. Reproduce Before You Fix

NEVER debug by guessing — reproduce first. Always:

- Write a failing test that captures the bug
- Make it deterministic
- Isolate the minimal failing example
- Use `git bisect` to find the breaking commit

### 3. If You Don't Measure It, You're Guessing

Never rely on intuition for performance or concurrency bugs:

- **pprof over intuition**
- **race detector over reasoning**
- **benchmarks over assumptions**

### 4. One Hypothesis at a Time

Change one thing, measure, confirm. If you change three things at once, you learn nothing.

### 5. Find the Root Cause — No Workarounds

You MUST understand **why** the bug happens before writing a fix. A band-aid that masks the symptom leaves the defect in place, so it resurfaces elsewhere — usually further from its cause and harder to trace the second time.

When you don't understand the issue:

- **Trace the data flow backwards** from the symptom to its origin.
- **Question your assumptions.** The code you trust might be wrong.
- **Ask "why" five times.** Keep going until you reach the actual root cause.
- **Perform more troubleshooting checks.** More fmt.Println, more output inspection...

### 6. Research the Codebase, Not Just the Diff

Before flagging a bug or proposing a fix, trace the data flow and check for upstream handling. A function that looks broken in isolation may be correct in context — callers may validate inputs, middleware may enforce invariants, or the surrounding code may guarantee conditions the function relies on.

1. **Trace callers** — who calls this function and with what values? Call sites can be found with code search tools. → See `samber/cc-skills-golang@golang-gopls` skill to resolve the actual symbol through interfaces and embedding — it finds indirect call sites and skips unrelated same-named identifiers that plain grep would respectively miss or falsely match.
2. **Check upstream validation** — input parsing, type conversions, or guard clauses earlier in the chain may make the "bug" unreachable.
3. **Read the surrounding code** — middleware, interceptors, or init functions may set up state the function depends on.

**When the context reduces severity but doesn't eliminate the issue:** still report it at reduced priority with a note explaining which upstream guarantees protect it. Add a brief inline comment (e.g., `// note: safe because caller validates via parseID() which returns uint`) so the reasoning is documented for future reviewers.

### 7. Start Simple

Sometimes `fmt.Println` IS the right tool for local debugging. Escalate tools only when simpler approaches fail. NEVER use `fmt.Println` for production debugging — use `slog`.

## Red Flags: You're Debugging Wrong

If any of these are happening, stop and return to Step 1:

- **"Quick fix for now, investigate later"** — There is no "later". Find the root cause.
- **Multiple simultaneous changes** — One hypothesis at a time.
- **Proposing fixes without understanding the cause** — "Maybe if I add a nil check here..." is guessing, not debugging.
- **Each fix reveals a new problem** — You're treating symptoms. The real bug is elsewhere.
- **3+ fix attempts on the same issue** — You have the wrong mental model. Re-read the code, trace the data flow from scratch.
- **"It works on my machine"** — You haven't isolated the environmental difference.
- **Blaming the framework/stdlib/compiler** — It's almost never a Go bug. Verify your code first.

## Reference Files

- **[General Debugging Methodology](./references/methodology.md)** — The systematic 10-step process: define symptoms, isolate reproduction, form one hypothesis, test it, verify the root cause, and defend against regressions. Escalation guide: when to escalate from `fmt.Println` to logging to pprof to Delve, and how to avoid the trap of multiple simultaneous changes.

- **[Common Go Bugs](./references/common-go-bugs.md)** — The bugs that crash Go code: nil pointer dereferences, interface nil gotcha (typed nil ≠ nil), variable shadowing, slice/map/defer/error/context pitfalls, race conditions, JSON unmarshaling surprises, unclosed resources. Each with reproduction patterns and fixes.

- **[Test-Driven Debugging](./references/testing-debug.md)** — Why writing a failing test is the first step of debugging. Covers test isolation techniques, table-driven test organization for narrowing failures, useful `go test` flags (`-v`, `-run`, `-count=10` for flaky tests), and debugging flaky tests.

- **[Concurrency Debugging](./references/concurrency-debug.md)** — Race conditions, deadlocks, goroutine leaks. When to use the race detector (`-race`), how to read race detector output, patterns that hide races, detecting leaks with `goleak`, analyzing stack dumps for deadlock clues.

- **[Performance Troubleshooting](./references/performance-debug.md)** — When your code is slow: CPU profiling workflow, memory analysis (heap vs alloc_objects profiles, finding leaks), lock contention (mutex profile), and I/O blocking (goroutine profile). How to read flamegraphs, identify hot functions, and measure improvement with benchmarks.

- **[pprof Reference](./references/pprof.md)** — Complete pprof manual. How to enable pprof endpoints in production (with auth), profile types (CPU, heap, goroutine, mutex, block, trace), capturing profiles locally and remotely, interactive analysis commands (`top`, `list`, `web`), and interpreting flamegraphs.

- **[Diagnostic Tools](./references/diagnostic-tools.md)** — Auxiliary tools for specific symptoms. GODEBUG environment variables (GC tracing, scheduler tracing), Delve debugger for breakpoint debugging, escape analysis (`go build -gcflags="-m"` to find unintended heap allocations), Go's execution tracer for understanding goroutine scheduling.

- **[Production Debugging](./references/production-debug.md)** — Debugging live production systems without stopping them. Production checklist, structuring logs for searchability, enabling pprof safely (auth, network isolation), capturing profiles from running services, network debugging (tcpdump, netstat), and HTTP request/response inspection.

- **[Compilation Issues](./references/compilation.md)** — Build failures: module version conflicts, CGO linking problems, version mismatch between `go.mod` and installed Go version, platform-specific build tags preventing cross-compilation.

- **[Code Review Red Flags](./references/code-review-flags.md)** — Patterns to watch during code review that signal potential bugs: unchecked errors, missing nil checks, concurrent map access, goroutines without clear exit, resource leaks from defer in loops.

## Cross-References

- → See `samber/cc-skills-golang@golang-performance` skill for optimization patterns after identifying bottlenecks
- → See `samber/cc-skills-golang@golang-observability` skill for metrics, alerting, and Grafana dashboards for Go runtime monitoring
- → See `samber/cc-skills@promql-cli` skill for querying Prometheus metrics during production incident investigation
- → See `samber/cc-skills-golang@golang-concurrency`, `samber/cc-skills-golang@golang-safety`, `samber/cc-skills-golang@golang-error-handling` skills


## Source Reference: `golang-troubleshooting/references/code-review-flags.md`

# Code Review Red Flags

If you see these in code review, flag them:

| Pattern | Why It's Bad |
| --- | --- |
| `result, _ := doSomething()` | Silent error — mystery bugs later |
| `go func() { }()` without context | Can't cancel, leaks goroutine |
| Channel without close | Goroutine leak when sender exits |
| `time.After` in hot loop | Repeated timer allocation/churn; use a reusable timer when reset semantics matter |
| Global map without mutex | Data race |
| `defer` inside hot loop | Deferred calls pile up until return |
| `json.Marshal` in hot path | Expensive, causes GC pressure |
| `for range` without `ok` check | Misses channel close |
| `var err *MyError; return err` | Interface nil gotcha |
| `http.Get` without timeout | Default client has no timeout |
| `fmt.Errorf("...: %v", err)` | Use `%w` to preserve error chain |
| `:=` shadowing outer `err` | Inner err is a new variable, outer stays nil |
| `func (c Counter) Lock()` | Value receiver copies sync types |
| `wg.Add(1)` inside goroutine | Race: Wait() may return before Add() |
| `http.Error(...)` without return | Handler keeps executing after error |
| `iota` starting at 0 for enums | Zero value ambiguous with first constant |
| `strings.Trim(s, "prefix")` | Strips char set, not substring |
| `log.Fatal(err)` in func w/ defer | `os.Exit` skips all deferred cleanup |
| `t1 == t2` for `time.Time` | Use `.Equal()` — monotonic clock differs |
| `rows, _ := db.Query(...)` no Close | Leaks database connections |
| `ch <- val` after `close(ch)` | Panics — only sender should close |
| `select { default: }` in loop | Busy loop — burns CPU without blocking |
| `int32(bigInt64)` | Silent truncation — no overflow check |
| `filepath.Join(base, userInput)` | Doesn't prevent `../` path traversal |
| `regexp.MustCompile` in handler | Recompiles every call — move to package var |
| `fallthrough` in switch | Executes next case unconditionally |


## Source Reference: `golang-troubleshooting/references/common-go-bugs.md`

# Common Go Bugs

→ See `samber/cc-skills-golang@golang-safety` skill for in-depth nil, slice, and map safety patterns.

## Table of Contents

- [Nil Pointer Dereference](#nil-pointer-dereference)
- [Interface Nil Gotcha](#interface-nil-gotcha)
- [Variable Shadowing with `:=`](#variable-shadowing-with-)
- [Slice and Map Gotchas](#slice-and-map-gotchas)
- [Defer Gotchas](#defer-gotchas)
- [Error Handling Pitfalls](#error-handling-pitfalls)
- [Context Misuse](#context-misuse)
- [Concurrent Map Read/Write (Fatal)](#concurrent-map-readwrite-fatal)
- [Copying sync Types](#copying-sync-types)
- [WaitGroup.Add Inside Goroutine](#waitgroupadd-inside-goroutine)
- [Missing Return After HTTP Error Response](#missing-return-after-http-error-response)
- [JSON Pitfalls](#json-pitfalls)
  - [Numbers into `interface{}` become `float64`](#numbers-into-interface-become-float64)
  - [Unexported fields silently ignored](#unexported-fields-silently-ignored)
- [`strings.Trim` vs `strings.TrimPrefix`](#stringstrim-vs-stringstrimprefix)
- [String Length and Indexing](#string-length-and-indexing)
- [`break` in `select`/`switch` Inside `for` Loop](#break-in-selectswitch-inside-for-loop)
- [Enum Zero Value with `iota`](#enum-zero-value-with-iota)
- [`recover()` Only Works in the Same Goroutine](#recover-only-works-in-the-same-goroutine)
- [`os.Exit` Skips Deferred Functions](#osexit-skips-deferred-functions)
- [`time.Time` Comparison: `==` vs `.Equal()`](#timetime-comparison--vs-equal)
- [`sql.Rows` Must Be Closed](#sqlrows-must-be-closed)
- [Writing to a Closed Channel Panics](#writing-to-a-closed-channel-panics)
- [Closed Channel in `select` Causes Busy Loop](#closed-channel-in-select-causes-busy-loop)
- [`select` with `default` Can Spin CPU](#select-with-default-can-spin-cpu)
- [Integer Conversion Silently Truncates](#integer-conversion-silently-truncates)
- [`filepath.Join` Does Not Prevent Path Traversal](#filepathjoin-does-not-prevent-path-traversal)
- [Pointer Receiver Interface Satisfaction](#pointer-receiver-interface-satisfaction)
- [`regexp.MustCompile` in Hot Path](#regexpmustcompile-in-hot-path)
- [`init()` Ordering Is Fragile](#init-ordering-is-fragile)
- [Map Iteration Order Is Random](#map-iteration-order-is-random)
- [`fallthrough` in `switch` Executes Unconditionally](#fallthrough-in-switch-executes-unconditionally)

## Nil Pointer Dereference

Pointers from external sources MUST be checked before dereferencing.

The most common Go panic. The stack trace tells you the exact line.

```go
// 1. Uninitialized struct field
type Server struct {
    logger *log.Logger  // nil if not set in constructor
}

// 2. Unchecked error return — if err != nil, val may be nil/zero
val, err := doSomething()
val.Method()  // panic if doSomething returned nil val with an error

// 3. Map lookup returns zero value
m := map[string]*Config{}
cfg := m["missing"]  // cfg is nil
cfg.Timeout  // panic

// 4. Type assertion without comma-ok
var i interface{} = "hello"
n := i.(int)        // panic
n, ok := i.(int)    // ok == false, no panic
```

## Interface Nil Gotcha

NEVER compare an interface to nil when it may contain a typed nil pointer.

A typed nil pointer inside an interface is **not** a nil interface:

```go
type MyError struct{ msg string }
func (e *MyError) Error() string { return e.msg }

func doWork() error {
    var err *MyError  // typed nil pointer
    return err        // returns non-nil interface containing nil pointer!
}

func main() {
    if err := doWork(); err != nil {
        // This EXECUTES — the interface is non-nil
        fmt.Println(err)  // panic: nil pointer in Error()
    }
}

// FIX: return nil explicitly, not a typed nil variable
func doWork() error {
    return nil
}
```

## Variable Shadowing with `:=`

The `:=` short declaration creates a new variable in the inner scope instead of assigning to the outer one. Especially dangerous when shadowing `err`, because error handling silently breaks.

```go
// BAD
func doWork() error {
    var err error
    if condition {
        result, err := someFunc() // BUG: new err variable, doesn't set outer one
        if err != nil {
            return err
        }
        process(result)
    }
    return err // always nil — inner err was a different variable
}

// GOOD
func doWork() error {
    var err error
    if condition {
        var result ResultType
        result, err = someFunc() // assigns to outer err
        if err != nil {
            return err
        }
        process(result)
    }
    return err
}
```

**Detect:** run the `golang.org/x/tools/go/analysis/passes/shadow` analyzer through your lint setup. The old shadow flag is not part of standard `go vet`.

## Slice and Map Gotchas

```go
// 1. Nil map write panics
var m map[string]int
m["key"] = 1  // panic: assignment to entry in nil map
// FIX: m := make(map[string]int)
// Note: nil map reads are fine — they return zero value

// 2. Append may share underlying array
a := []int{1, 2, 3}
b := a[:2]
b = append(b, 99)  // overwrites a[2]!
// FIX: full slice expression — b := a[:2:2] to limit capacity

// 3. Range variable capture in goroutine (Go < 1.22)
for _, v := range items {
    go func() {
        process(v)  // v is shared, will likely be last element
    }()
}
// FIX: pass as argument
for _, v := range items {
    go func(v Item) { process(v) }(v)
}
// In Go 1.22+, loop variables are per-iteration (no fix needed)
```

## Defer Gotchas

```go
// 1. Arguments evaluated immediately
x := 1
defer fmt.Println(x)  // prints 1, not 2
x = 2

// 2. Defer in loop — doesn't run until function returns
for _, f := range files {
    file, _ := os.Open(f)
    defer file.Close()  // all Close() calls pile up until return
}
// FIX: wrap in closure
for _, f := range files {
    func() {
        file, _ := os.Open(f)
        defer file.Close()
        // use file
    }()
}

// 3. Named return + defer interaction
func readFile() (err error) {
    f, err := os.Open("file.txt")
    if err != nil { return }
    defer func() {
        if closeErr := f.Close(); err == nil {
            err = closeErr  // modifies named return
        }
    }()
    // ...
    return nil
}
```

## Error Handling Pitfalls

**Silent error swallowing** is the single most common source of "mysterious" bugs:

```go
// BAD — silent failure
result, _ := doSomething()
json.Unmarshal(data, &config)
http.ListenAndServe(":8080", nil)

// GOOD — handle or propagate
result, err := doSomething()
if err != nil {
    return fmt.Errorf("doSomething: %w", err)
}
```

**Find ignored errors:**

```bash
go vet ./...

# More thorough
go get -tool github.com/kisielk/errcheck@latest
go tool errcheck ./...
```

**Error wrapping — use `%w`, not `%v`:**

```go
return fmt.Errorf("reading config from %s: %v", path, err)  // BAD — loses error chain
return fmt.Errorf("reading config from %s: %w", path, err)  // GOOD — preserves Is/As

// Check for specific errors — use errors.Is, not ==
if err == sql.ErrNoRows { ... }            // BAD — breaks if wrapped
if errors.Is(err, sql.ErrNoRows) { ... }   // GOOD — traverses chain

// Extract typed errors
var pathErr *os.PathError
if errors.As(err, &pathErr) { ... }
```

## Context Misuse

```go
// 1. Forgetting to cancel — leaks goroutines
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
// Missing: defer cancel()

// 2. Using background context when you should propagate
go doWork(context.Background())  // BAD — can't cancel from parent
go doWork(ctx)                   // GOOD — respects parent cancellation

// 3. Not checking context error
err := doWork(ctx)
if err != nil {
    // Distinguish timeout from other errors
    if ctx.Err() == context.DeadlineExceeded {
        log.Printf("operation timed out")
    } else if ctx.Err() == context.Canceled {
        log.Printf("operation cancelled")
    } else {
        log.Printf("operation failed: %v", err)
    }
}

// 4. Background work outliving request context
func handler(w http.ResponseWriter, r *http.Request) {
    // BAD — background work uses request context that cancels when client disconnects
    go processAsync(r.Context(), data)

    // GOOD — derive a new context for background work (Go 1.21+)
    bgCtx := context.WithoutCancel(r.Context())
    go processAsync(bgCtx, data)
}
```

## Concurrent Map Read/Write (Fatal)

Maps MUST NOT be accessed concurrently without synchronization.

Unlike most Go runtime errors, a concurrent map read/write is a **fatal error** — it **cannot be caught with `recover()`** and crashes the entire process. Hard to catch in tests because it depends on timing.

```go
// BAD — fatal: concurrent map read and map write
m := make(map[string]int)
go func() { m["key"] = 1 }()  // concurrent write
go func() { _ = m["key"] }()  // concurrent read — fatal!

// GOOD — protect with mutex
var mu sync.RWMutex
m := make(map[string]int)
go func() { mu.Lock(); m["key"] = 1; mu.Unlock() }()
go func() { mu.RLock(); _ = m["key"]; mu.RUnlock() }()

// Or use sync.Map for read-heavy workloads with stable key sets
```

**Detect:** `go test -race ./...` — always run in CI.

## Copying sync Types

Sync types MUST NEVER be copied — use pointer receivers and pass by pointer.

All `sync` types (`Mutex`, `RWMutex`, `WaitGroup`, `Once`, `Cond`, `Map`, `Pool`) must not be copied. Copying them via value receivers, function arguments, or struct assignment silently breaks synchronization.

```go
// BAD — value receiver copies the Mutex
type Counter struct {
    mu    sync.Mutex
    count int
}

func (c Counter) Increment() { // BUG: copies mutex on every call
    c.mu.Lock()
    c.count++
    c.mu.Unlock()
}

// GOOD — pointer receiver
func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}
```

**Detect:** `go vet` detects mutex copies. Apply to all sync types.

## WaitGroup.Add Inside Goroutine

If `wg.Add(1)` is called inside the goroutine instead of before it, `wg.Wait()` may return before all goroutines start — a race condition that passes tests most of the time but fails intermittently.

```go
// BAD
var wg sync.WaitGroup
for i := 0; i < n; i++ {
    go func() {
        wg.Add(1) // BUG: may run after wg.Wait() returns
        defer wg.Done()
        doWork()
    }()
}
wg.Wait()

// GOOD
var wg sync.WaitGroup
for i := 0; i < n; i++ {
    wg.Add(1) // called BEFORE launching the goroutine
    go func() {
        defer wg.Done()
        doWork()
    }()
}
wg.Wait()
```

## Missing Return After HTTP Error Response

After writing an error with `http.Error()`, execution continues. This can cause double writes, corrupted responses, or executing logic that should have been skipped.

```go
// BAD
func handler(w http.ResponseWriter, r *http.Request) {
    if !authorized(r) {
        http.Error(w, "Forbidden", http.StatusForbidden)
        // BUG: missing return — handler keeps executing
    }
    doSensitiveAction(r)
}

// GOOD
func handler(w http.ResponseWriter, r *http.Request) {
    if !authorized(r) {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }
    doSensitiveAction(r)
}
```

## JSON Pitfalls

### Numbers into `interface{}` become `float64`

When unmarshaling into `map[string]interface{}` or `interface{}`, all JSON numbers become `float64`. Type-asserting to `int` panics. Large integers (> 2^53) silently lose precision.

```go
// BAD
var result map[string]interface{}
json.Unmarshal([]byte(`{"id": 1234567890123456789}`), &result)
id := result["id"].(int) // PANIC: it's float64, not int

// GOOD — use typed struct (preferred)
type Response struct {
    ID int64 `json:"id"`
}

// GOOD — use json.Number when you must use interface{}
dec := json.NewDecoder(bytes.NewReader(data))
dec.UseNumber()
var result map[string]interface{}
dec.Decode(&result)
id, _ := result["id"].(json.Number).Int64()
```

### Unexported fields silently ignored

Fields starting with lowercase are invisible to `encoding/json`. Marshal produces empty output, unmarshal skips them — no error in either case.

```go
// BAD
type User struct {
    name  string `json:"name"`  // unexported — silently ignored!
    email string `json:"email"` // unexported — silently ignored!
}
u := User{name: "Alice", email: "alice@example.com"}
data, _ := json.Marshal(u) // data is "{}" — no error

// GOOD
type User struct {
    Name  string `json:"name"`
    Email string `json:"email"`
}
```

**Detect:** `go vet` warns when unexported fields have JSON struct tags.

## `strings.Trim` vs `strings.TrimPrefix`

`strings.Trim` treats its second argument as a **set of characters** to strip from both ends, not as a substring. This over-trims unexpectedly.

```go
// BAD
s := strings.Trim("application/json", "application/")
// Result: "js" — stripped all chars in set {a,p,l,i,c,t,o,n,/} from both ends!

// GOOD
s := strings.TrimPrefix("application/json", "application/")
// Result: "json"
```

Use `strings.TrimPrefix`/`strings.TrimSuffix` to remove substrings. Only use `strings.Trim` when you intend to strip a set of characters.

## String Length and Indexing

`len()` on strings returns bytes, not characters. Indexing returns a byte. For multi-byte UTF-8 characters, this gives wrong counts and corrupts data when slicing.

```go
s := "Hello, 世界"
fmt.Println(len(s))    // 13 (bytes), not 9 (characters)
fmt.Println(s[:8])     // "Hello, \xe4" — corrupted! cuts a multi-byte rune

// FIX: use utf8.RuneCountInString for character count
fmt.Println(utf8.RuneCountInString(s)) // 9

// FIX: convert to []rune for character-based slicing
runes := []rune(s)
fmt.Println(string(runes[:8])) // "Hello, 世"

// FIX: use for-range to iterate over characters (runes), not bytes
for _, r := range s { ... } // iterates runes
```

## `break` in `select`/`switch` Inside `for` Loop

A bare `break` inside a `select` or `switch` that is inside a `for` loop only exits the `select`/`switch`, not the loop.

```go
// BAD
for {
    select {
    case msg := <-ch:
        if msg == "quit" {
            break // BUG: only breaks the select, loop continues forever
        }
        process(msg)
    }
}

// GOOD — use labeled break
loop:
for {
    select {
    case msg := <-ch:
        if msg == "quit" {
            break loop // breaks the for loop
        }
        process(msg)
    }
}
```

## Enum Zero Value with `iota`

When `iota` starts at 0, the zero value of the type (from uninitialized variables, zero-value struct fields, or missing JSON fields) is indistinguishable from the first constant.

```go
// BAD
type Status int
const (
    Active   Status = iota // 0 — same as zero value!
    Inactive               // 1
)
type User struct {
    Status Status // zero value is Active — but was it intentional?
}

// GOOD — reserve 0 for "unknown"
type Status int
const (
    StatusUnknown  Status = iota // 0 — explicit unset sentinel
    StatusActive                 // 1
    StatusInactive               // 2
)
```

## `recover()` Only Works in the Same Goroutine

`recover()` can only catch panics in the goroutine where it's deferred. A panic in a child goroutine will crash the entire program — no parent goroutine can catch it.

```go
// BAD — recover() in main cannot catch panic in child goroutine
func main() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("recovered:", r) // NEVER REACHED
        }
    }()
    go func() {
        panic("crash!") // crashes the whole program
    }()
    time.Sleep(time.Second)
}

// GOOD — each goroutine must recover its own panics
func main() {
    go func() {
        defer func() {
            if r := recover(); r != nil {
                log.Printf("goroutine recovered: %v", r)
            }
        }()
        panic("crash!") // recovered within this goroutine
    }()
    time.Sleep(time.Second)
}
```

## `os.Exit` Skips Deferred Functions

`os.Exit` terminates the process immediately. No deferred functions run — cleanup, flush, and close operations are skipped. `log.Fatal` calls `os.Exit(1)` internally and has the same problem.

```go
// BAD — deferred cleanup never runs
func main() {
    f, _ := os.Create("data.tmp")
    defer f.Close()       // NEVER RUNS
    defer os.Remove(f.Name()) // NEVER RUNS

    if err := process(); err != nil {
        log.Fatal(err) // calls os.Exit(1) — skips all defers!
    }
}

// GOOD — return from main instead, or restructure so defers run
func main() {
    if err := run(); err != nil {
        fmt.Fprintf(os.Stderr, "error: %v\n", err)
        os.Exit(1) // defers in run() already ran when it returned
    }
}

func run() error {
    f, _ := os.Create("data.tmp")
    defer f.Close()
    return process()
}
```

## `time.Time` Comparison: `==` vs `.Equal()`

`time.Time` includes a monotonic clock reading. Two `time.Time` values representing the same instant may not be `==` if one has a monotonic component and the other doesn't (e.g., one from `time.Now()`, the other deserialized from JSON/database).

```go
// BAD — may fail even for the same instant
t1 := time.Now()
data, _ := t1.MarshalJSON()
var t2 time.Time
t2.UnmarshalJSON(data)
fmt.Println(t1 == t2) // false! t1 has monotonic, t2 doesn't

// GOOD — .Equal() ignores monotonic clock
fmt.Println(t1.Equal(t2)) // true

// Also: strip monotonic explicitly when storing/comparing
t1 = t1.Round(0) // strips monotonic reading
```

## `sql.Rows` Must Be Closed

`sql.Rows` MUST call `rows.Close()` — always defer it immediately after the query.

Forgetting to close `sql.Rows` leaks database connections. The connection is held until `Rows` is garbage collected, but under load the connection pool exhausts first.

```go
// BAD — connection leak if rows aren't closed
rows, err := db.Query("SELECT id FROM users")
if err != nil { return err }
for rows.Next() {
    // ...
}
// rows never closed — connection leak!

// GOOD — always defer Close
rows, err := db.Query("SELECT id FROM users")
if err != nil { return err }
defer rows.Close()
for rows.Next() {
    // ...
}
if err := rows.Err(); err != nil { // don't forget to check rows.Err()
    return err
}
```

Also: use `db.QueryRow()` for single-row queries and `db.Exec()` for non-SELECT statements (INSERT, UPDATE, DELETE). Using `db.Query()` for non-SELECT leaks connections because the returned `Rows` is never iterated/closed.

## Writing to a Closed Channel Panics

Sending to a closed channel panics. Reading from a closed channel returns the zero value immediately (with `ok == false`).

```go
// BAD — panic: send on closed channel
ch := make(chan int, 1)
close(ch)
ch <- 1 // panic!

// GOOD — only the sender should close, never the receiver
// Use a done channel or context to signal completion
func producer(ch chan<- int, done <-chan struct{}) {
    defer close(ch)
    for i := 0; ; i++ {
        select {
        case ch <- i:
        case <-done:
            return
        }
    }
}
```

**Rule of thumb:** Only the sender closes the channel. If multiple senders, use a `sync.Once` or coordinate with a `sync.WaitGroup`.

## Closed Channel in `select` Causes Busy Loop

A closed channel is always ready to receive (returns zero value). In a `select`, this causes the case to fire continuously — a CPU-burning busy loop.

```go
// BAD — after ch is closed, this loops at 100% CPU
for {
    select {
    case v := <-ch: // fires continuously after ch closes
        process(v)   // processes zero values forever
    case <-done:
        return
    }
}

// GOOD — nil the channel after it closes
for {
    select {
    case v, ok := <-ch:
        if !ok {
            ch = nil // nil channel blocks forever in select — disables this case
            continue
        }
        process(v)
    case <-done:
        return
    }
}
```

## `select` with `default` Can Spin CPU

A `select` with a `default` case never blocks. Inside a `for` loop, this creates a busy-wait spin loop that burns CPU.

```go
// BAD — spins at 100% CPU waiting for a message
for {
    select {
    case msg := <-ch:
        process(msg)
    default:
        // runs immediately when ch has nothing — tight loop!
    }
}

// GOOD — remove default to block until a message arrives
for {
    select {
    case msg := <-ch:
        process(msg)
    case <-ctx.Done():
        return
    }
}

// GOOD — if you need non-blocking check, add a small sleep or ticker
for {
    select {
    case msg := <-ch:
        process(msg)
    default:
        time.Sleep(10 * time.Millisecond) // yield CPU
    }
}
```

## Integer Conversion Silently Truncates

Go integer conversions don't check for overflow — they silently truncate. This is especially dangerous when converting from user input or external data.

```go
// BAD — silent truncation
var big int64 = 256
small := int8(big)
fmt.Println(small) // 0 — silently overflowed!

var n int64 = math.MaxInt64
n32 := int32(n)
fmt.Println(n32) // -1 — silently wrapped!

// GOOD — check bounds before converting
func safeIntToInt32(n int64) (int32, error) {
    if n < math.MinInt32 || n > math.MaxInt32 {
        return 0, fmt.Errorf("value %d overflows int32", n)
    }
    return int32(n), nil
}
```

## `filepath.Join` Does Not Prevent Path Traversal

`filepath.Join` cleans the path (resolves `..`) but doesn't prevent escaping the base directory. User-supplied paths can traverse outside the intended root.

```go
// BAD — user can escape the base directory
base := "/srv/files"
userInput := "../../etc/passwd"
path := filepath.Join(base, userInput)
// path = "/etc/passwd" — escaped!

// GOOD (Go 1.24+) — confine access to the base directory
root, err := os.OpenRoot("/srv/files")
if err != nil {
    return err
}
defer root.Close()
file, err := root.Open(userInput)
if err != nil {
    return err
}
defer file.Close()
```

For Go <1.24, use a lexical fallback only when `os.Root` is unavailable:

```go
func safePath(base, userInput string) (string, error) {
    if userInput == "" || filepath.IsAbs(userInput) || !filepath.IsLocal(userInput) {
        return "", fmt.Errorf("invalid relative path: %q", userInput)
    }

    path := filepath.Join(base, userInput)
    rel, err := filepath.Rel(base, path)
    if err != nil {
        return "", fmt.Errorf("checking path: %w", err)
    }
    if rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
        return "", fmt.Errorf("path traversal attempt: %s", userInput)
    }

    return path, nil
}
```

## Pointer Receiver Interface Satisfaction

A value of type `T` cannot satisfy an interface that requires methods with `*T` receivers. But `*T` satisfies interfaces requiring either `T` or `*T` methods.

```go
type Sizer interface {
    Size() int
}

type File struct{ size int }
func (f *File) Size() int { return f.size } // pointer receiver

var s Sizer
s = File{}   // COMPILE ERROR: File does not implement Sizer (*File does)
s = &File{}  // OK — *File has the Size method

// This is because the compiler can't always take the address of a value
// (e.g., map values, return values). Pointer receiver = pointer required.
```

## `regexp.MustCompile` in Hot Path

Long-lived regexp MUST be compiled once at package level — not inside functions called repeatedly. Short-lived regexp used once (e.g., in a CLI or test) are acceptable inline.

`regexp.MustCompile` compiles a regex every call. In a hot path (loop, HTTP handler), this is expensive and wasteful.

```go
// BAD — recompiles regex on every call
func isEmail(s string) bool {
    re := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
    return re.MatchString(s)
}

// GOOD — compile once at package level
var emailRe = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

func isEmail(s string) bool {
    return emailRe.MatchString(s)
}
```

## `init()` Ordering Is Fragile

`init()` functions run in source file order within a package, and in dependency order across packages. But relying on this order creates brittle, hard-to-debug initialization sequences. Multiple `init()` in the same file run top-to-bottom, but across files it's alphabetical by filename — adding a file can change the order.

```go
// BAD — init() depends on another init() having run first
var db *sql.DB

func init() {
    // Assumes config init() already ran — fragile!
    db, _ = sql.Open("postgres", config.DatabaseURL)
}

// GOOD — use explicit initialization
func main() {
    cfg := loadConfig()
    db := setupDatabase(cfg)
    startServer(db)
}
```

Prefer explicit initialization in `main()` over `init()`. Use `init()` only for truly self-contained setup (registering drivers, codecs).

## Map Iteration Order Is Random

Go deliberately randomizes map iteration order. Code that assumes a specific order will produce inconsistent results.

```go
// BAD — output order is random every run
m := map[string]int{"a": 1, "b": 2, "c": 3}
for k, v := range m {
    fmt.Printf("%s=%d ", k, v) // different order each time!
}

// GOOD — sort keys when order matters
keys := make([]string, 0, len(m))
for k := range m {
    keys = append(keys, k)
}
sort.Strings(keys)
for _, k := range keys {
    fmt.Printf("%s=%d ", k, m[k])
}
```

This is especially dangerous in tests (non-deterministic output comparison), serialization (non-deterministic JSON/output), and logging (confusing diffs).

## `fallthrough` in `switch` Executes Unconditionally

Unlike C, Go's `switch` cases don't fall through by default. But when you explicitly use `fallthrough`, it executes the **next case body unconditionally** — it does not check the next case's condition.

```go
// Surprising: fallthrough doesn't check the next condition
switch x := 5; {
case x > 10:
    fmt.Println(">10")
    fallthrough
case x > 0:
    fmt.Println(">0")
    fallthrough
case x < 0:
    fmt.Println("<0") // EXECUTES even though 5 is not < 0!
}
// Output: >0, <0

// fallthrough is rarely needed. Prefer listing multiple values:
switch status {
case "active", "enabled":
    enable()
}
```


## Source Reference: `golang-troubleshooting/references/compilation.md`

# Compilation Issues

## Module Problems

```bash
go clean -modcache      # clean module cache
go mod download         # re-download dependencies
go mod verify           # verify dependencies
go mod tidy             # tidy dependencies
go mod why <package>    # why is this dependency here?
```

## CGO Issues

```bash
go env CGO_ENABLED                         # check CGO is enabled
export CGO_CFLAGS="-I/usr/local/include"   # set CGO CFLAGS
# macOS: brew install pkg-config
# Ubuntu: apt install pkg-config
```

## Version Mismatch

```bash
go version              # check Go version
go mod edit -go=1.21    # set minimum required version
```


## Source Reference: `golang-troubleshooting/references/concurrency-debug.md`

# Concurrency Debugging

## Table of Contents

- [Goroutine Leaks](#goroutine-leaks)
- [Race Conditions](#race-conditions)
- [Deadlocks](#deadlocks)

## Goroutine Leaks

**Symptoms:** Memory slowly increasing, goroutine count growing, no obvious CPU spike.

**Diagnosis:**

Use pprof goroutine profile (see [pprof.md](./pprof.md)) with `?debug=2` for human-readable output, then look for goroutines stuck in `chan receive`.

The goroutine leak profile (experimental behind `GOEXPERIMENT=goroutineleakprofile` in Go 1.26) is generally available since Go 1.27 — no build flag needed, and it is served at `/debug/pprof/goroutineleak` like any other standard profile.

```bash
curl http://localhost:6060/debug/pprof/goroutineleak?debug=2
go tool pprof http://localhost:6060/debug/pprof/goroutineleak
```

Keep existing tools: `go.uber.org/goleak` in tests, `runtime.NumGoroutine()` for coarse monitoring, `/debug/pprof/goroutine?debug=2` for stack dumps, and `go test -race ./...` for race checks.

```go
// Programmatic monitoring — log goroutine count to detect leaks
go func() {
    for {
        log.Printf("goroutines: %d", runtime.NumGoroutine())
        time.Sleep(3 * time.Second)
    }
}()

// In tests, use goleak to detect goroutine leaks
// import "go.uber.org/goleak"
// func TestMain(m *testing.M) { goleak.VerifyTestMain(m) }
```

**Common causes:**

```go
// 1. Unclosed channel — goroutine blocks forever
// BAD
for {
    job := <-jobs
    process(job)
}
// GOOD
for {
    select {
    case job, ok := <-jobs:
        if !ok { return }
        process(job)
    case <-ctx.Done():
        return
    }
}

// 2. Forgotten response body close — leaks HTTP connection
// Always defer resp.Body.Close() after HTTP calls.
// See production-debug.md for the correct pattern.

// 3. time.After in hot loop — allocates a new timer each iteration
// BAD
for {
    select {
    case <-time.After(time.Second):
        do()
    }
}
// GOOD — reuse a ticker for repeated intervals
ticker := time.NewTicker(time.Second)
defer ticker.Stop()
for {
    select {
    case <-ticker.C:
        do()
    case <-ctx.Done():
        return
    }
}
```

## Race Conditions

**Symptoms:** Intermittent failures, "sometimes works sometimes doesn't", different results on different machines.

**Diagnosis:** Race conditions MUST be tested with the `-race` flag:

```bash
go test -race ./...
go run -race main.go
# Race detector slows code ~10x but finds data races reliably
```

**Common patterns:**

- Shared map without mutex
- Shared variable without atomic
- Publishing reference before initialization
- go func() accessing outer variables without synchronization

## Deadlocks

**Symptoms:** Program hangs, goroutines stuck in "chan receive" or "mutex lock".

**Diagnosis:**

```bash
curl http://localhost:6060/debug/pprof/goroutine?debug=2

# Or programmatic
runtime.Stack(buf, true)
```

**Common patterns:**

1. **Circular wait** — A waits for B, B waits for A
2. **Forgotten channel send** — sender goroutine exited
3. **Wrong lock order** — always acquire locks in the same order


## Source Reference: `golang-troubleshooting/references/diagnostic-tools.md`

# Diagnostic Tools

## Table of Contents

- [Runtime Diagnostics (GODEBUG)](#runtime-diagnostics-godebug)
  - [Go documentation command](#go-documentation-command)
  - [GC Tracing](#gc-tracing)
  - [Scheduler Tracing](#scheduler-tracing)
  - [GOTRACEBACK](#gotraceback)
- [Delve Debugger](#delve-debugger)
  - [Installation](#installation)
  - [Basic Usage](#basic-usage)
  - [Common Commands](#common-commands)
  - [IDE Integration](#ide-integration)
- [Advanced Analysis](#advanced-analysis)

## Runtime Diagnostics (GODEBUG)

### Go documentation command

Use `go doc`, not `go tool doc`. Go 1.26 removed the old `cmd/doc` / `go tool doc` path. Go 1.27 added `package@version` lookups (`go doc golang.org/x/tools/cmd/stringer@v0.30.0`) and an `-ex` flag that lists executable examples.

### GC Tracing

```bash
GODEBUG=gctrace=1 ./app
```

**Output:**

```
gc 123 @45.67s 4%: 0.8+10+0.3 ms clock, 6+5/10/0 ms cpu, 512->300->150 MB
```

| Field            | Meaning                                         |
| ---------------- | ----------------------------------------------- |
| 4%               | GC CPU overhead (if >10%, over-allocating)      |
| 512->300->150 MB | Heap at GC start -> heap at GC end -> live heap |
| Large pause      | Allocation storm                                |

### Scheduler Tracing

```bash
GODEBUG=schedtrace=1000,scheddetail=1 ./app
```

| Signal               | Meaning                            |
| -------------------- | ---------------------------------- |
| runqueue high        | CPU saturation, goroutines waiting |
| idleprocs=0          | Fully busy, at capacity            |
| spinningthreads      | Lock contention                    |
| threads > gomaxprocs | Blocking syscalls                  |

### GOTRACEBACK

Get full stack traces on panic:

```bash
GOTRACEBACK=all ./app
```

| Level    | Shows                                 |
| -------- | ------------------------------------- |
| `none`   | No stack traces                       |
| `single` | Current goroutine only (default)      |
| `all`    | All goroutines (useful for deadlocks) |
| `system` | All goroutines + runtime frames       |

---

## Delve Debugger

### Installation

```bash
go install github.com/go-delve/delve/cmd/dlv@latest
```

### Basic Usage

```bash
dlv debug ./cmd/myapp          # debug a program
dlv test ./mypackage           # debug a test
dlv attach 12345               # attach to running process
dlv exec ./myapp -- --flag=v   # execute binary with args
```

### Common Commands

```
break main.main      # set breakpoint
break file.go:42     # break at line
continue             # continue execution
next                 # step over (n)
step                 # step into (s)
stepout              # step out
print variable       # print variable
locals               # print all locals
args                 # print function arguments
goroutines           # list all goroutines
goroutine 5          # switch to goroutine 5
stack                # show stack trace
```

### IDE Integration

**VS Code:**

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Package",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}",
      "env": { "GOTRACEBACK": "all" }
    }
  ]
}
```

**GoLand:** Run -> Edit Configurations -> Go Build. Click gutter to set breakpoints. Use Debugger tab.

---

## Advanced Analysis

→ See `samber/cc-skills-golang@golang-benchmark` skill (compiler-analysis.md) for detailed guides on escape analysis interpretation, assembly inspection, and compiler diagnostics (SSA dump, inlining decisions). See also trace.md for execution tracer analysis.


## Source Reference: `golang-troubleshooting/references/methodology.md`

# General Debugging Methodology

For any bug, follow this systematic process:

## Table of Contents

- [Step 1: Understand Expected vs Actual](#step-1-understand-expected-vs-actual)
- [Step 2: Get the Full Error](#step-2-get-the-full-error)
- [Step 3: Isolate the Problem](#step-3-isolate-the-problem)
- [Step 4: Check External Dependencies](#step-4-check-external-dependencies)
- [Step 5: Check Observability Tools](#step-5-check-observability-tools)
- [Step 6: Compare with Working Code](#step-6-compare-with-working-code)
- [Step 7: Form a Hypothesis and Test It](#step-7-form-a-hypothesis-and-test-it)
- [Step 8: Trace to Root Cause](#step-8-trace-to-root-cause)
- [Step 9: Fix and Verify](#step-9-fix-and-verify)
- [Step 10: Defense-in-Depth](#step-10-defense-in-depth)
- [When You're Stuck: Escalation Protocol](#when-youre-stuck-escalation-protocol)

## Step 1: Understand Expected vs Actual

Before touching code, articulate clearly:

- What **should** happen?
- What **actually** happens?
- What **changed** recently?

```bash
# What changed recently?
git log --oneline -20
git diff HEAD~5

# Binary search for the breaking commit
git bisect start
git bisect bad          # current commit is broken
git bisect good abc123  # this commit was working
# git bisect will walk you to the breaking commit
```

## Step 2: Get the Full Error

```bash
# Full build errors
go build ./... 2>&1

# Verbose test output
go test ./... -v 2>&1

# Static analysis
go vet ./...

# Run linters — see the golang-lint skill for configuration
golangci-lint run ./...
```

Run `golangci-lint` early in your debugging workflow. It catches unchecked errors, suspicious constructs, and many other issues that are easy to miss by reading code. See the `samber/cc-skills-golang@golang-lint` skill for configuration and usage.

## Step 3: Isolate the Problem

Narrow the scope before investigating deeper:

```bash
# Does a single test fail?
go test -run TestSpecificName -v ./pkg/...

# Does it fail without cache?
go test -count=1 -run TestSpecificName ./pkg/...

# Is it a specific package?
go build ./pkg/suspect/...

# Is it flaky? Run multiple times
go test -count=10 -run TestSuspect ./pkg/...
```

Write more tests if you suspect missing test cases or need to test something in different conditions.

## Step 4: Check External Dependencies

Sometimes the bug is not in your code. Before diving deeper, verify that external components behave as expected:

```bash
# Reproduce an API call outside your app
curl -v -X POST https://api.example.com/endpoint \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# Check database content directly
psql -h localhost -U myuser -d mydb -c "SELECT * FROM orders WHERE id = 123"
# Or: mysql, mongosh, redis-cli, etc.
# Or use a database MCP server to query interactively

# Test connectivity and DNS resolution
dig api.example.com
nc -zv api.example.com 443

# Check if an external service is responding at all
curl -o /dev/null -s -w "HTTP %{http_code} in %{time_total}s\n" https://api.example.com/health

# Inspect message queue state
rabbitmqctl list_queues
# Or: kafka-console-consumer, redis-cli LLEN, etc.

# Check certificate validity
openssl s_client -connect api.example.com:443 -brief

# Verify environment variables and config
env | grep DATABASE
env | grep API_KEY
```

**Common external causes:**

- API contract changed (new required field, different response shape, deprecated endpoint)
- Database schema drift (missing column, changed type, new constraint, migration not applied)
- Expired or rotated credentials, tokens, or certificates
- DNS resolution failure or stale DNS cache
- Rate limiting or quota exhaustion
- External service degraded (slow responses, partial failures, 5xx errors)
- Message queue full, consumer lag, or rebalancing
- Different behavior between environments (staging vs production config, feature flags)
- Clock skew affecting JWT validation, cache TTLs, or scheduled jobs
- TLS/mTLS misconfiguration or CA bundle mismatch
- Network policy or firewall rule change blocking traffic
- Proxy or load balancer misconfiguration (wrong backend, sticky sessions, health check)
- Disk full or read-only filesystem
- File permissions changed
- OOM killer terminated a dependency (database, cache, sidecar)
- Docker/K8s: wrong image tag, missing env var, resource limits, liveness probe misconfigured
- Third-party SDK or library upgrade with breaking behavioral change
- Locale, timezone, or encoding mismatch between systems
- Connection pool exhaustion (database, HTTP, gRPC)
- Upstream returning cached/stale data
- Network issue. Webhook or callback URL changed or unreachable

## Step 5: Check Observability Tools

Production debugging MUST start with observability data. The project may already use observability tools that have the answer — look for imports or dependencies like `prometheus`, `opentelemetry`, `datadog`, `sentry`, `elastic/apm` in the codebase. Even if you don't see them in code, the developer may have them deployed separately.

If the information is missing, **ask the user** what monitoring and observability tools they use. Common stacks:

- **Prometheus + Grafana** — Dashboards may show error rate spikes, latency changes, resource saturation. Query examples:

  ```promql
  rate(http_requests_total{status=~"5.."}[5m])           # error rate
  histogram_quantile(0.99, rate(http_duration_seconds_bucket[5m]))  # p99 latency
  go_goroutines                                           # goroutine count over time
  go_memstats_alloc_bytes                                 # heap allocations
  rate(go_gc_duration_seconds_sum[5m])                    # GC pressure
  ```

- **Datadog** — APM traces, error tracking, and infrastructure metrics are available. Query examples:

  ```
  avg:trace.http.request.duration{service:myapp} by {resource_name}
  sum:trace.http.request.errors{service:myapp}.as_count()
  avg:runtime.go.num_goroutine{service:myapp}
  ```

- **Sentry** — Captured exceptions, breadcrumbs, and error grouping are available. Sentry often captures the full stack trace and context of the first occurrence.
- **ELK (Elasticsearch + Logstash + Kibana)** — Structured logs can be searched for error patterns:

  ```
  level:error AND service:myapp AND @timestamp:[now-1h TO now]
  ```

- **OpenTelemetry / Jaeger / Zipkin** — Distributed traces show latency breakdowns across services, failed spans, and propagation issues.

If the user has an MCP server for any of these tools (Datadog MCP, Grafana MCP, etc.), interactive queries may be available through it.

## Step 6: Compare with Working Code

Before forming a hypothesis, find similar code that **works**:

- Search the codebase for analogous functionality that doesn't have the bug
- Read the working reference implementation **completely** — don't skim
- List **every difference** between the working code and the broken code
- Check: are the dependencies the same? The config? The initialization order? The error handling?

Often the bug becomes obvious when you see what the working version does differently.

## Step 7: Form a Hypothesis and Test It

- Form a **single, specific** hypothesis with clear reasoning
- Add targeted logging or a focused test
- Change **one thing**, observe, confirm or reject
- If the hypothesis was wrong, **revert the change** — don't stack fixes on top of failed attempts

## Step 8: Trace to Root Cause

When the symptom appears deep in the call stack, don't fix where the error surfaces. Trace backward:

1. **Find the immediate cause** — what line panics or returns the wrong value?
2. **Ask "what called this?"** — trace one level up the call chain
3. **Keep tracing** — repeat until you find where the invalid data **originated**, not where it was **consumed**
4. **Fix at the source** — the fix belongs where the bad value was created, not where it caused a crash

```go
// Example: panic in handler — but the bug is in the constructor
// ✗ Bad — fixing at the symptom
func (s *Server) Handle(w http.ResponseWriter, r *http.Request) {
    if s.db == nil {  // nil check masks the real bug
        http.Error(w, "db unavailable", 500)
        return
    }
    // ...
}

// ✓ Good — fixing at the source
func NewServer(db *sql.DB) *Server {
    if db == nil {
        panic("NewServer: db must not be nil")  // fail fast at construction
    }
    return &Server{db: db}
}
```

When you can't trace manually, add temporary instrumentation:

```go
// Log the full call chain before the dangerous operation
func suspectFunction(val string) {
    fmt.Fprintf(os.Stderr, "DEBUG suspectFunction: val=%q\n%s\n", val, debug.Stack())
    // ...
}
```

## Step 9: Fix and Verify

- Fix the root cause, not the symptom
- The failing test from step 1 should now pass
- Run the full test suite to check for regressions

## Step 10: Defense-in-Depth

After fixing a bug, ask: "How do I make this bug structurally impossible?" A single fix at one layer can be bypassed by different code paths or future refactoring. Add validation at multiple layers:

1. **Entry point** — reject invalid input at public API boundaries (`New*` constructors, exported functions)
2. **Business logic** — assert preconditions inside internal functions that receive the data
3. **Runtime guards** — use build tags or env checks to catch dangerous operations in tests (e.g., refuse writes outside temp dirs)
4. **Observability** — add structured logging or metrics so the same class of bug is instantly visible if it recurs

Not every fix needs all four layers — use judgment. But when a bug could cause data loss, corruption, or security issues, multi-layer defense is worth the cost.

## When You're Stuck: Escalation Protocol

If your fix doesn't work:

- **< 3 failed attempts:** Return to Step 1. You misidentified the root cause. Gather more evidence.
- **>= 3 failed attempts:** Stop fixing. The problem is likely architectural, not a simple bug. Step back and question your assumptions about how the system works. Ask: "Is the design fundamentally sound, or am I patching a broken abstraction?"
- **Each fix reveals a new problem:** You're chasing symptoms, not the root cause. See the Red Flags section in [SKILL.md](./SKILL.md).


## Source Reference: `golang-troubleshooting/references/performance-debug.md`

# Performance Troubleshooting

## CPU Profiling

Use pprof CPU profile to capture a 30s sample (see [pprof.md](./pprof.md) for commands), then inspect with `top`, `web`, or `list funcName`.

**Common CPU hogs:**

1. JSON marshal/unmarshal in hot path — preallocate buffers, use faster libraries
2. Reflection in critical path
3. Unnecessary allocations — use sync.Pool
4. O(n^2) hidden in nested loops
5. Too many syscalls — batch operations

## Memory Profiling

Use pprof heap profile (see [pprof.md](./pprof.md)). Compare heap snapshots over time with `go tool pprof -base heap1.prof heap2.prof` to find growth. Use escape analysis (see [diagnostic-tools.md](./diagnostic-tools.md)) to find unexpected heap allocations in hot paths.

**Common memory leaks:**

1. Unbounded cache without eviction
2. Growing slices in loops (forgetting to reset)
3. Global maps never cleared
4. String concatenation in loops (use `strings.Builder`)
5. Large structs passed by value

## Lock Contention

**Symptoms:** CPU high but throughput low, latency increases with load, multiple cores don't help.

**Enable profiling in code:**

```go
runtime.SetMutexProfileFraction(1)
runtime.SetBlockProfileRate(1)
```

Then use pprof mutex and block profiles (see [pprof.md](./pprof.md)).

**Solutions:**

1. Reduce critical section — hold lock for minimal time
2. Sharding — multiple locks for different data
3. `sync.Map` — for read-heavy workloads
4. `atomic` — for simple counters
5. `RWMutex` — when reads >> writes


## Source Reference: `golang-troubleshooting/references/pprof.md`

# pprof Reference

## Table of Contents

- [Enable pprof HTTP Server](#enable-pprof-http-server)
  - [Quick Setup (Development)](#quick-setup-development)
  - [Secure Setup (Production)](#secure-setup-production)
- [Profile Types](#profile-types)
- [Capturing Profiles](#capturing-profiles)
- [Analyzing and Interpreting Profiles](#analyzing-and-interpreting-profiles)
- [Remote Profiling (Production)](#remote-profiling-production)

## Enable pprof HTTP Server

Pprof endpoints MUST be protected with basic auth — NEVER expose them publicly. They leak sensitive runtime information (goroutine stacks, memory contents) and can be abused to DoS your service (CPU profiling is expensive). Pprof SHOULD be toggled via a `PPROF_ENABLED` environment variable.

### Quick Setup (Development)

```go
import _ "net/http/pprof"

func main() {
    go func() {
        log.Println(http.ListenAndServe("localhost:6060", nil))
    }()
    // ... rest of app
}
```

### Secure Setup (Production)

For production, protect endpoints with basic auth:

```go
import "net/http/pprof"

func setupPprof(mux *http.ServeMux) {
    if os.Getenv("PPROF_ENABLED") != "true" {
        return
    }

    // Protect pprof endpoints with basic auth — never expose unauthenticated
    username := os.Getenv("PPROF_USERNAME")
    password := os.Getenv("PPROF_PASSWORD")
    if username == "" || password == "" {
        panic("PPROF_USERNAME and PPROF_PASSWORD must be set when pprof is enabled")
    }
    auth := basicAuth(username, password)

    mux.Handle("/debug/pprof/", auth(http.HandlerFunc(pprof.Index)))
    mux.Handle("/debug/pprof/cmdline", auth(http.HandlerFunc(pprof.Cmdline)))
    mux.Handle("/debug/pprof/profile", auth(http.HandlerFunc(pprof.Profile)))
    mux.Handle("/debug/pprof/symbol", auth(http.HandlerFunc(pprof.Symbol)))
    mux.Handle("/debug/pprof/trace", auth(http.HandlerFunc(pprof.Trace)))

    slog.Info("pprof endpoints enabled (basic auth required)")
}

// basicAuth wraps an http.Handler with HTTP Basic Authentication.
func basicAuth(username, password string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            u, p, ok := r.BasicAuth()
            if !ok || u != username || subtle.ConstantTimeCompare([]byte(p), []byte(password)) != 1 {
                w.Header().Set("WWW-Authenticate", `Basic realm="pprof"`)
                http.Error(w, "unauthorized", http.StatusUnauthorized)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

## Profile Types

| Profile | Command | What It Shows |
| --- | --- | --- |
| **CPU** | `go tool pprof profile` | Where CPU time is spent |
| **Heap** | `go tool pprof heap` | Memory allocations, live objects |
| **Goroutine** | `go tool pprof goroutine` | Stack traces of all goroutines |
| **Block** | `go tool pprof block` | Blocking operations (needs SetBlockProfileRate) |
| **Mutex** | `go tool pprof mutex` | Lock contention (needs SetMutexProfileFraction) |
| **Alloc** | `go tool pprof -alloc_space heap` | Cumulative allocations (not current heap) |

## Capturing Profiles

```bash
# CPU profiles SHOULD capture at least 30 seconds for meaningful data (30s default).
# Ensure your HTTP server's request timeout exceeds the capture duration.
curl http://localhost:6060/debug/pprof/profile?seconds=30 > cpu.prof

# Heap snapshot
curl http://localhost:6060/debug/pprof/heap > heap.prof

# Goroutine dump (human-readable)
curl http://localhost:6060/debug/pprof/goroutine?debug=2 > goroutines.txt

# Goroutine profile (for pprof analysis)
curl http://localhost:6060/debug/pprof/goroutine > goroutine.prof

# Goroutine leak profile — generally available since Go 1.27 (no GOEXPERIMENT needed)
curl http://localhost:6060/debug/pprof/goroutineleak?debug=2
go tool pprof http://localhost:6060/debug/pprof/goroutineleak

# Mutex contention
curl http://localhost:6060/debug/pprof/mutex > mutex.prof

# Block profile
curl http://localhost:6060/debug/pprof/block > block.prof
```

## Analyzing and Interpreting Profiles

→ See `samber/cc-skills-golang@golang-benchmark` skill (pprof.md) for interpreting profiles: `top`, `list`, `peek`, common profile patterns (flat vs cum, GC churn, memory leaks), and compiler diagnostics. See also compiler-analysis.md for escape analysis and inlining decisions.

**Quick start:**

```bash
go tool pprof cpu.prof          # interactive analysis
go tool pprof -http=:8080 cpu.prof  # graphical flamegraph
go tool pprof -base heap1.prof heap2.prof  # compare heap snapshots
```

## Remote Profiling (Production)

For production servers, replace `localhost:6060` with your server address and use basic auth credentials.

**Safety:** idle pprof endpoints have low overhead, but profile captures are not free. CPU profiling samples for the requested duration, heap profiles may trigger extra work, and block/mutex profiles add runtime overhead when enabled.

---

→ See `samber/cc-skills-golang@golang-observability` skill for continuous profiling with Pyroscope. → See `samber/cc-skills-golang@golang-benchmark` skill for investigation session setup and Prometheus-based performance tracking.


## Source Reference: `golang-troubleshooting/references/production-debug.md`

# Production Debugging

## Table of Contents

- [Production Debugging Checklist](#production-debugging-checklist)
  - [Step 1: Capture Immediately (don't restart!)](#step-1-capture-immediately-dont-restart)
  - [Step 2: System Metrics](#step-2-system-metrics)
  - [Step 3: Analyze Locally](#step-3-analyze-locally)
- [Logging & Observability](#logging--observability)
  - [Strategic Log Placement](#strategic-log-placement)
  - [Structured Logging (Go 1.21+)](#structured-logging-go-121)
  - [Request ID Tracing](#request-id-tracing)
- [Network & HTTP Debugging](#network--http-debugging)
  - [HTTP Client Issues](#http-client-issues)

## Production Debugging Checklist

When paged for a production issue:

### Step 1: Capture Immediately (don't restart!)

Capture all profiles before restarting the process. The curl commands in [pprof.md](./pprof.md) can be used targeting your production server address. At minimum, capture: goroutine dump (`?debug=2`), heap, CPU (30s), and mutex profiles.

### Step 2: System Metrics

```bash
ps aux | grep myapp
lsof -p PID | wc -l       # file descriptors
ss -s                       # socket summary
netstat -an | grep ESTABLISHED | wc -l
```

### Step 3: Analyze Locally

Download the captured `.prof` files and analyze with `go tool pprof` (see [pprof.md](./pprof.md)).

---

## Logging & Observability

### Strategic Log Placement

Place logs at **component boundaries**, not sprinkled randomly. The goal is to see data entering and exiting each layer, so you can identify exactly which component corrupts or drops it:

```go
// 1. Function entry/exit with key parameters
func ProcessOrder(ctx context.Context, orderID string) error {
    log.Printf("ProcessOrder: start orderID=%s", orderID)
    defer log.Printf("ProcessOrder: done orderID=%s", orderID)
    // ...
}

// 2. Before and after external calls
log.Printf("calling payment API for order %s", orderID)
resp, err := paymentClient.Charge(ctx, req)
if err != nil {
    log.Printf("payment API: err=%v", err)
} else {
    log.Printf("payment API: status=%d", resp.StatusCode)
}

// 3. At decision points
if user.IsAdmin {
    log.Printf("admin path for user %s", user.ID)
}
```

### Structured Logging (Go 1.21+)

```go
import "log/slog"

slog.Info("processing request",
    "method", r.Method,
    "path", r.URL.Path,
    "user_id", userID,
)

slog.Error("database query failed",
    "err", err,
    "query", query,
    "duration_ms", elapsed.Milliseconds(),
)
```

### Request ID Tracing

```go
type ctxKey string

func WithRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, ctxKey("request_id"), id)
}

func RequestID(ctx context.Context) string {
    id, _ := ctx.Value(ctxKey("request_id")).(string)
    return id
}
```

---

## Network & HTTP Debugging

### HTTP Client Issues

```go
// 1. HTTP clients MUST set timeouts — default http.Client has NO timeout
client := &http.Client{
    Timeout: 30 * time.Second,
    Transport: &http.Transport{
        DialContext:          (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
        TLSHandshakeTimeout: 5 * time.Second,
        IdleConnTimeout:     90 * time.Second,
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
    },
}

// 2. Response body MUST be closed
resp, err := client.Do(req)
if err != nil {
    return err
}
defer resp.Body.Close()

// 3. Read body on error status (for error messages from server)
if resp.StatusCode >= 400 {
    body, _ := io.ReadAll(resp.Body)
    return fmt.Errorf("API error %d: %s", resp.StatusCode, body)
}

// 4. Dump full request/response for debugging
import "net/http/httputil"
dump, _ := httputil.DumpRequestOut(req, true)
log.Printf("request:\n%s", dump)
dump, _ = httputil.DumpResponse(resp, true)
log.Printf("response:\n%s", dump)
```


## Source Reference: `golang-troubleshooting/references/testing-debug.md`

# Test-Driven Debugging

A failing test MUST be written before fixing a bug. Writing a failing test is often the fastest debugging path. It gives you a reproducible, isolated environment.

## Reproduce the Bug in a Test

```go
func TestBugDescription(t *testing.T) {
    // Setup: exact conditions that trigger the bug
    svc := NewService(testConfig)

    // Act: the operation that fails
    result, err := svc.Process(badInput)

    // Assert: what should happen
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if result.Status != "ok" {
        t.Errorf("got status %q, want %q", result.Status, "ok")
    }
}
```

## Expand Edge Cases with Table Tests

When debugging, add edge cases to find the boundary of the bug:

```go
tests := []struct {
    name    string
    input   string
    want    time.Duration
    wantErr bool
}{
    {"valid", "5s", 5 * time.Second, false},
    {"empty", "", 0, true},
    {"negative", "-1s", -time.Second, false},
    {"zero", "0s", 0, false},
    {"overflow", "99999999h", 0, true},
    {"whitespace", " 5s ", 0, true},
}
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        got, err := ParseDuration(tt.input)
        if (err != nil) != tt.wantErr {
            t.Errorf("error = %v, wantErr %v", err, tt.wantErr)
        }
        if got != tt.want {
            t.Errorf("got %v, want %v", got, tt.want)
        }
    })
}
```

## Useful Test Flags

```bash
go test -v ./...                          # verbose output
go test -run TestName -v ./pkg/...        # single test
go test -count=1 ./...                    # disable cache
go test -timeout 10s ./...                # short timeout (find hangs)
go test -parallel 1 ./...                 # sequential execution
go test -race ./...                       # race detector
go test -cover ./...                      # coverage summary
go test -coverprofile=c.out ./... && go tool cover -html=c.out  # coverage report
go test -failfast ./...                   # stop on first failure
go test -shuffle=on ./...                # randomize test order (Go 1.17+)
```

## Debugging Flaky Tests

Flaky tests (pass sometimes, fail sometimes) are usually caused by one of:

1. **Shared mutable state between tests** — global variables, package-level maps, singletons
   - Fix: reset state in `TestMain` or use `t.Cleanup`
2. **Test order dependence** — one test sets up state another test relies on
   - Diagnose: `go test -run TestSuspect -count=1` (run in isolation)
   - Diagnose: `go test -shuffle=on` (randomize order)
   - Fix: each test must set up its own preconditions
3. **Timing sensitivity** — `time.Sleep` in tests, race between goroutines
   - Fix: use channels/waitgroups to synchronize, not sleeps
4. **Port conflicts** — tests binding to fixed ports
   - Fix: use port `0` and read the assigned port
5. **File system pollution** — tests writing to shared temp directories
   - Fix: use `t.TempDir()` for per-test directories

```bash
# Confirm flakiness by running many times
go test -count=100 -run TestSuspect ./pkg/... -failfast

# Check for parallelism issues
go test -parallel 1 -count=10 ./pkg/...

# Check for order dependence
go test -shuffle=on ./pkg/...
```

