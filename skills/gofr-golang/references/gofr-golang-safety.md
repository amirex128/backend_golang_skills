# GoFr-Golang: Safety

## GoFr adaptation rules

This is the GoFr-specific form of the general Golang guidance below. Use GoFr as the mandatory framework for service delivery: begin services with `gofr.New()`, keep GoFr lifecycle, configuration, health, structured logging, Prometheus metrics, OpenTelemetry tracing, datasource management, and graceful shutdown intact, and never silently replace GoFr with another web framework. Use the exact GoFr version installed by the project and verify version-sensitive APIs against the project module and official GoFr documentation.

Keep GoFr types at the adapter boundary. GoFr HTTP, gRPC, GraphQL, WebSocket, cron, and CLI handlers use the documented `func(c *gofr.Context) (any, error)` shape where applicable. Bind with `c.Bind(&value)` and check the error; read route parameters with `c.PathParam`, query values with `c.Param`, and return values/errors to GoFr instead of recreating response envelopes. Pass `*gofr.Context` through GoFr datasource/downstream calls for cancellation and trace propagation, but translate to application contracts before entering domain code.

The complete GoFr page set remains in the repository's `skills/gofr` Skill. Read the listed official pages there before implementing the relevant feature; these links are the authoritative framework-specific follow-up for this adapted reference.

## GoFr adaptation rules

Apply GoFr lifecycle, context, configuration, datasource, error, health, and observability conventions to this topic while preserving the Clean Architecture dependency rule.

## Required GoFr references

- `references-context.md` — https://gofr.dev/docs/references/context
- `advanced-guide-monitoring-service-health.md` — https://gofr.dev/docs/advanced-guide/monitoring-service-health
- `guides-graceful-shutdown.md` — https://gofr.dev/docs/guides/graceful-shutdown
- `advanced-guide-debugging.md` — https://gofr.dev/docs/advanced-guide/debugging

## Unified Golang guidance

# Safety

This reference consolidates all retained guidance from `golang-safety`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Persona:** You are a defensive Go engineer. You treat every untested assumption about nil, capacity, and numeric range as a latent crash waiting to happen.

# Go Safety: Correctness & Defensive Coding

Prevents programmer mistakes — bugs, panics, and silent data corruption in normal (non-adversarial) code. Security handles attackers; safety handles ourselves.

## Best Practices Summary

1. **Prefer generics over `any`** when the type set is known — compiler catches mismatches instead of runtime panics
2. **Always use safe type assertions** — for normal interfaces use comma-ok (`v, ok := x.(T)`); for reflection in Go 1.25+ prefer `reflect.TypeAssert[T](value)` over `value.Interface().(T)`.
3. **Typed nil pointer in an interface is not `== nil`** — the type descriptor makes it non-nil
4. **Writing to a nil map panics** — always initialize before use
5. **`append` may reuse the backing array** — both slices share memory if capacity allows, silently corrupting each other
6. **Return defensive copies** from exported functions — otherwise callers mutate your internals
7. **`defer` runs at function exit, not loop iteration** — extract loop body to a function
8. **Integer conversions truncate silently** — `int64` to `int32` wraps without error
9. **Float arithmetic is not exact** — use epsilon comparison or `math/big`
10. **Design useful zero values** — nil map fields panic on first write; use lazy init
11. **Use `sync.Once` for lazy init** — guarantees exactly-once even under concurrency

## Nil Safety

Nil-related panics are the most common crash in Go.

### The nil interface trap

Interfaces store (type, value). An interface is `nil` only when both are nil. Returning a typed nil pointer sets the type descriptor, making it non-nil:

```go
// ✗ Dangerous — interface{type: *MyHandler, value: nil} is not == nil
func getHandler() http.Handler {
    var h *MyHandler // nil pointer
    if !enabled {
        return h // interface{type: *MyHandler, value: nil} != nil
    }
    return h
}

// ✓ Good — return nil explicitly
func getHandler() http.Handler {
    if !enabled {
        return nil // interface{type: nil, value: nil} == nil
    }
    return &MyHandler{}
}
```

### Nil map, slice, and channel behavior

| Type    | Index into nil | Write to nil   | Len/Cap of nil | Range over nil |
| ------- | -------------- | -------------- | -------------- | -------------- |
| Map     | Zero value     | **panic**      | 0              | 0 iterations   |
| Slice   | **panic**      | **panic**      | 0              | 0 iterations   |
| Channel | Blocks forever | Blocks forever | 0              | Blocks forever |

```go
// ✗ Bad — nil map panics on write
var m map[string]int
m["key"] = 1

// ✓ Good — initialize or lazy-init in methods
m := make(map[string]int)

func (r *Registry) Add(name string, val int) {
    if r.items == nil { r.items = make(map[string]int) }
    r.items[name] = val
}
```

See **[Nil Safety Deep Dive](./references/nil-safety.md)** for nil receivers, nil in generics, and nil interface performance.

## Slice & Map Safety

### Slice aliasing — the append trap

`append` reuses the backing array if capacity allows. Both slices then share memory:

```go
// ✗ Dangerous — a and b share backing array
a := make([]int, 3, 5)
b := append(a, 4)
b[0] = 99 // also modifies a[0]

// ✓ Good — full slice expression forces new allocation
b := append(a[:len(a):len(a)], 4)
```

### Map concurrent access

Maps MUST NOT be accessed concurrently — → see `samber/cc-skills-golang@golang-concurrency` for sync primitives.

See **[Slice and Map Deep Dive](./references/slice-map-safety.md)** for range pitfalls, subslice memory retention, and `slices.Clone`/`maps.Clone`.

## Numeric Safety

### Implicit type conversions truncate silently

```go
// ✗ Bad — silently wraps around if val > math.MaxInt32 (3B becomes -1.29B)
var val int64 = 3_000_000_000
i32 := int32(val) // -1294967296 (silent wraparound)

// ✓ Good — check before converting
if val > math.MaxInt32 || val < math.MinInt32 {
    return fmt.Errorf("value %d overflows int32", val)
}
i32 := int32(val)
```

### Float comparison

```go
// ✗ Bad — floating point arithmetic is not exact
var a, b, c float64 = 0.1, 0.2, 0.3
a+b == c // false

// ✓ Good — use epsilon comparison
const epsilon = 1e-9
math.Abs((a+b)-c) < epsilon // true
```

### Division by zero

Integer division by zero panics. Float division by zero produces `+Inf`, `-Inf`, or `NaN`.

```go
func avg(total, count int) (int, error) {
    if count == 0 {
        return 0, errors.New("division by zero")
    }
    return total / count, nil
}
```

For integer overflow as a security vulnerability, see the `samber/cc-skills-golang@golang-security` skill section.

## Resource Safety

### defer in loops — resource accumulation

`defer` runs at _function_ exit, not loop iteration. Resources accumulate until the function returns:

```go
// ✗ Bad — all files stay open until function returns
for _, path := range paths {
    f, _ := os.Open(path)
    defer f.Close() // deferred until function exits
    process(f)
}

// ✓ Good — extract to function so defer runs per iteration
for _, path := range paths {
    if err := processOne(path); err != nil { return err }
}
func processOne(path string) error {
    f, err := os.Open(path)
    if err != nil { return err }
    defer f.Close()
    return process(f)
}
```

### Goroutine leaks

→ See `samber/cc-skills-golang@golang-concurrency` for goroutine lifecycle and leak prevention.

## Immutability & Defensive Copying

Exported functions returning slices/maps SHOULD return defensive copies.

### Protecting struct internals

```go
// ✗ Bad — exported slice field, anyone can mutate
type Config struct {
    Hosts []string
}

// ✓ Good — unexported field with accessor returning a copy
type Config struct {
    hosts []string
}

func (c *Config) Hosts() []string {
    return slices.Clone(c.hosts)
}
```

## Initialization Safety

### Zero-value design

Design types so `var x MyType` is safe — prevents "forgot to initialize" bugs:

```go
var mu sync.Mutex   // ✓ usable at zero value
var buf bytes.Buffer // ✓ usable at zero value

// ✗ Bad — nil map panics on write
type Cache struct { data map[string]any }
```

### sync.Once for lazy initialization

```go
type DB struct {
    once sync.Once
    conn *sql.DB
}

func (db *DB) connection() *sql.DB {
    db.once.Do(func() {
        db.conn, _ = sql.Open("postgres", connStr)
    })
    return db.conn
}
```

### init() function pitfalls

→ See `samber/cc-skills-golang@golang-design-patterns` for why init() should be avoided in favor of explicit constructors.

## Enforce with Linters

Many safety pitfalls are caught automatically by linters: `errcheck`, `forcetypeassert`, `nilerr`, `govet`, `staticcheck`. See the `samber/cc-skills-golang@golang-lint` skill for configuration and usage.

### Go 1.25+ reflection type assertions

For reflection code, prefer `reflect.TypeAssert[T]` over `value.Interface().(T)`.

```go
v := reflect.ValueOf(x)
if s, ok := reflect.TypeAssert[string](v); ok {
    use(s)
}
```

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Bare type assertion `v := x.(T)` | Panics on type mismatch, crashing the program. Use `v, ok := x.(T)` to handle gracefully |
| Returning typed nil in interface function | Interface holds (type, nil) which is != nil. Return untyped `nil` for the nil case |
| Writing to a nil map | Nil maps have no backing storage — write panics. Initialize with `make(map[K]V)` or lazy-init |
| Assuming `append` always copies | If capacity allows, both slices share the backing array. Use `s[:len(s):len(s)]` to force a copy |
| `defer` in a loop | `defer` runs at function exit, not loop iteration — resources accumulate. Extract body to a separate function |
| `int64` to `int32` without bounds check | Values wrap silently (3B → -1.29B). Check against `math.MaxInt32`/`math.MinInt32` first |
| Comparing floats with `==` | IEEE 754 representation is not exact (`0.1+0.2 != 0.3`). Use `math.Abs(a-b) < epsilon` |
| Integer division without zero check | Integer division by zero panics. Guard with `if divisor == 0` before dividing |
| Returning internal slice/map reference | Callers can mutate your struct's internals through the shared backing array. Return a defensive copy |
| Multiple `init()` with ordering assumptions | `init()` execution order across files is unspecified. → See `samber/cc-skills-golang@golang-design-patterns` — use explicit constructors |
| Blocking forever on nil channel | Nil channels block on both send and receive. Always initialize before use |

## Cross-References

- → See `samber/cc-skills-golang@golang-concurrency` skill for concurrent access patterns and sync primitives
- → See `samber/cc-skills-golang@golang-data-structures` skill for slice/map internals, capacity growth, and container/ packages
- → See `samber/cc-skills-golang@golang-error-handling` skill for nil error interface trap
- → See `samber/cc-skills-golang@golang-security` skill for security-relevant safety issues (memory safety, integer overflow)
- → See `samber/cc-skills-golang@golang-troubleshooting` skill for debugging panics and race conditions
- → See `samber/cc-skills-golang@golang-continuous-integration` skill for automated AI-driven code review in CI using these guidelines


## Source Reference: `golang-safety/references/nil-safety.md`

# Nil Safety Deep Dive

## Table of Contents

- [Nil Pointer Receivers](#nil-pointer-receivers)
  - [Designing nil-safe receivers](#designing-nil-safe-receivers)
- [Nil Function Values](#nil-function-values)
  - [Default function pattern](#default-function-pattern)
- [Nil and Error Comparisons](#nil-and-error-comparisons)
  - [Returning nil error correctly](#returning-nil-error-correctly)
  - [Checking error chains with nil](#checking-error-chains-with-nil)
- [Nil in Generic Code](#nil-in-generic-code)
  - [The `comparable` constraint and nil](#the-comparable-constraint-and-nil)
  - [Nil checks with unconstrained type parameters](#nil-checks-with-unconstrained-type-parameters)
- [Patterns for Nil-Safe APIs](#patterns-for-nil-safe-apis)
  - [Constructor with defaults](#constructor-with-defaults)
  - [Lazy initialization for zero-value usability](#lazy-initialization-for-zero-value-usability)

## Nil Pointer Receivers

MUST check for nil before calling methods on pointer receivers from external sources. A method call on a nil pointer does not always panic — it depends on whether the method dereferences the receiver:

```go
type Logger struct {
    prefix string
}

// ✓ Safe on nil but NEVER do that — does not dereference l
func (l *Logger) IsEnabled() bool {
    return l != nil
}

// ✗ Panics on nil — dereferences l to access prefix
func (l *Logger) Log(msg string) {
    fmt.Printf("[%s] %s\n", l.prefix, msg)
}

var l *Logger
l.IsEnabled() // false — works fine
l.Log("test") // panic: nil pointer dereference
```

Anyway, NEVER call a method on a nil pointer.

### Designing nil-safe receivers

When a nil receiver is a valid state (e.g., optional components), guard against it explicitly:

```go
func (l *Logger) Log(msg string) {
    if l == nil {
        return // silently skip if no logger configured
    }
    fmt.Printf("[%s] %s\n", l.prefix, msg)
}
```

This pattern is useful for optional dependencies, but use it sparingly — a nil receiver usually signals a bug, not an intentional state. Document when nil is an expected value.

## Nil Function Values

NEVER rely on nil function values — always validate before calling. Calling a nil `func` variable panics:

```go
// ✗ Bad — panics if callback was never set
type Worker struct {
    onComplete func(result string)
}

func (w *Worker) Finish(result string) {
    w.onComplete(result) // panic if onComplete is nil
}

// ✓ Good — check before calling
func (w *Worker) Finish(result string) {
    if w.onComplete != nil {
        w.onComplete(result)
    }
}
```

### Default function pattern

Provide a no-op default to avoid nil checks at every call site:

```go
func NewWorker(opts ...Option) *Worker {
    w := &Worker{
        onComplete: func(string) {}, // no-op default
    }
    for _, opt := range opts {
        opt(w)
    }
    return w
}
```

## Nil and Error Comparisons

### Returning nil error correctly

Interface comparisons with nil MUST account for the nil interface trap. A function returning `error` must return the untyped `nil`, not a typed nil pointer:

```go
// ✗ Bad — returns non-nil error interface
func validate(s string) error {
    var err *ValidationError // typed nil
    if s == "" {
        err = &ValidationError{Field: "name"}
    }
    return err // even when err is nil, interface is non-nil
}

// ✓ Good — return nil explicitly
func validate(s string) error {
    if s == "" {
        return &ValidationError{Field: "name"}
    }
    return nil
}
```

### Checking error chains with nil

`errors.Is(err, nil)` returns `true` only if `err` is truly nil. It does not help with the nil interface trap — the trap occurs before the error reaches `errors.Is`.

## Nil in Generic Code

### The `comparable` constraint and nil

Generic code MUST handle the zero value of type parameters correctly. Type parameters constrained by `comparable` can be compared with `==`, but nil is not always a valid value:

```go
// ✗ Confusing — T may or may not be nillable
func IsZero[T comparable](v T) bool {
    var zero T
    return v == zero // works, but "zero" for *Foo is nil, for int is 0
}

// ✓ Better — be explicit about what "empty" means
func IsNil[T interface{ ~*U }, U any](v T) bool {
    return v == nil
}
```

### Nil checks with unconstrained type parameters

You cannot compare an unconstrained type parameter to nil:

```go
// ✗ Does not compile
func Check[T any](v T) bool {
    return v == nil // compile error: cannot compare T with nil
}

// ✓ Good — use reflect or constrain to pointer types
func IsNilPtr[T any](v *T) bool {
    return v == nil
}
```

## Patterns for Nil-Safe APIs

### Constructor with defaults

Require initialization through a constructor, making the zero value impossible for external callers:

```go
type Client struct {
    httpClient *http.Client
    baseURL    string
}

// Constructor guarantees non-nil fields
func NewClient(baseURL string) *Client {
    return &Client{
        httpClient: http.DefaultClient,
        baseURL:    baseURL,
    }
}
```

### Lazy initialization for zero-value usability

When you want the zero value to be usable but need internal resources:

```go
type Cache struct {
    mu   sync.Mutex
    data map[string]any
}

func (c *Cache) Get(key string) (any, bool) {
    c.mu.Lock()
    defer c.mu.Unlock()
    if c.data == nil {
        return nil, false
    }
    v, ok := c.data[key]
    return v, ok
}

func (c *Cache) Set(key string, val any) {
    c.mu.Lock()
    defer c.mu.Unlock()
    if c.data == nil {
        c.data = make(map[string]any)
    }
    c.data[key] = val
}
```

→ See `samber/cc-skills-golang@golang-error-handling` skill for nil error comparison pitfalls.


## Source Reference: `golang-safety/references/slice-map-safety.md`

# Slice and Map Safety Deep Dive

## Table of Contents

- [Range Loop Variable Capture](#range-loop-variable-capture)
  - [Pre-Go 1.22: shared loop variable](#pre-go-122-shared-loop-variable)
  - [Go 1.22+: per-iteration scoping](#go-122-per-iteration-scoping)
- [Storing Pointer to Loop Variable](#storing-pointer-to-loop-variable)
- [Slice Header vs Backing Array](#slice-header-vs-backing-array)
- [Subslice Retains Full Backing Array](#subslice-retains-full-backing-array)
- [Standard Library Clone Helpers (Go 1.21+)](#standard-library-clone-helpers-go-121)
- [Map Iteration Order](#map-iteration-order)
- [Deleting During Iteration](#deleting-during-iteration)
  - [Maps — safe](#maps--safe)
  - [Slices — needs care](#slices--needs-care)
- [Comparing Slices and Maps](#comparing-slices-and-maps)

## Range Loop Variable Capture

### Pre-Go 1.22: shared loop variable

NEVER store pointers to loop variables in Go < 1.22 — capture by value. Before Go 1.22, the range loop variable was reused across iterations. Capturing it in a closure or storing its address caused all references to point to the final value:

```go
// ✗ Bad (pre-1.22) — all goroutines see the last value of v
var funcs []func()
for _, v := range []string{"a", "b", "c"} {
    funcs = append(funcs, func() { fmt.Println(v) })
}
for _, f := range funcs {
    f() // prints "c", "c", "c"
}

// ✓ Fix (pre-1.22) — shadow the variable
for _, v := range []string{"a", "b", "c"} {
    v := v // re-declare v in inner scope
    funcs = append(funcs, func() { fmt.Println(v) })
}
```

### Go 1.22+: per-iteration scoping

Go 1.22 changed loop variable semantics — each iteration creates a new variable, so the closure bug no longer occurs. However, the old behavior applies if your module targets `go 1.21` or earlier in `go.mod` — check your `go.mod` version.

## Storing Pointer to Loop Variable

The same pre-1.22 issue applies to storing `&v`:

```go
// ✗ Bad (pre-1.22) — all pointers point to the same address
type Item struct{ Name string }
items := []Item{{Name: "a"}, {Name: "b"}}
var ptrs []*Item
for _, item := range items {
    ptrs = append(ptrs, &item) // all point to same loop variable
}
// ptrs[0].Name == "b", ptrs[1].Name == "b"

// ✓ Good — take address of the slice element directly
for i := range items {
    ptrs = append(ptrs, &items[i])
}
```

In Go 1.22+, `&item` is safe because each iteration has its own `item`. But taking `&items[i]` is still clearer and avoids a copy.

## Slice Header vs Backing Array

A slice is a 3-word struct: `{pointer, length, capacity}`. Multiple slices can share the same backing array:

```
a := make([]int, 3, 5)
┌─────┬─────┬─────┐
│ ptr │ len=3│cap=5│  ← slice header for a
└──┬──┴─────┴─────┘
   │
   ▼
┌───┬───┬───┬───┬───┐
│ 0 │ 0 │ 0 │   │   │  ← backing array (5 elements)
└───┴───┴───┴───┴───┘

b := a[1:2]
┌─────┬─────┬─────┐
│ ptr │ len=1│cap=4│  ← slice header for b (shares backing array)
└──┬──┴─────┴─────┘
   │ (points to a[1])
```

This is why `append(a, x)` can affect `b` if `a` has spare capacity. Use the full slice expression `a[:len(a):len(a)]` to set cap == len and force a new allocation on append.

## Subslice Retains Full Backing Array

Subslice retention: MUST use `slices.Clone` or `copy` when keeping a small slice from a large backing array. Slicing a large slice for a small piece prevents GC of the entire backing array:

```go
// ✗ Bad — small keeps the entire 1MB array alive
func getHeader(data []byte) []byte {
    return data[:64] // shares backing array with data
}

// ✓ Good — copy to release the large array
func getHeader(data []byte) []byte {
    header := make([]byte, 64)
    copy(header, data[:64])
    return header
}

// ✓ Good (Go 1.21+) — use slices.Clone
import "slices"

func getHeader(data []byte) []byte {
    return slices.Clone(data[:64])
}
```

## Standard Library Clone Helpers (Go 1.21+)

```go
import (
    "maps"
    "slices"
)

// Shallow copy a slice
clone := slices.Clone(original)

// Shallow copy a map
clone := maps.Clone(original)
```

These are the preferred way to make defensive copies. They are clearer than manual `make` + `copy` and handle nil inputs correctly (returning nil, not an empty collection).

## Map Iteration Order

Map iteration order MUST NOT be depended upon — it is randomized by the runtime:

```go
// ✗ Bad — output order changes between runs
m := map[string]int{"a": 1, "b": 2, "c": 3}
for k, v := range m {
    fmt.Printf("%s=%d ", k, v) // could be "b=2 a=1 c=3" or any permutation
}

// ✓ Good (Go 1.23+) — sort keys when order matters
keys := slices.Sorted(maps.Keys(m))
for _, k := range keys {
    fmt.Printf("%s=%d ", k, m[k])
}
```

## Deleting During Iteration

### Maps — safe

Deleting map entries during `range` is explicitly safe in Go:

```go
// ✓ Safe — defined behavior
for k, v := range m {
    if shouldDelete(v) {
        delete(m, k) // safe during range
    }
}
```

### Slices — needs care

Deleting from a slice during iteration requires index management:

```go
// ✗ Bad — skips elements after deletion
for i, v := range items {
    if shouldDelete(v) {
        items = append(items[:i], items[i+1:]...) // shifts elements, next iteration skips one
    }
}

// ✓ Good — iterate backwards
for i := len(items) - 1; i >= 0; i-- {
    if shouldDelete(items[i]) {
        items = append(items[:i], items[i+1:]...)
    }
}

// ✓ Good (Go 1.21+) — use slices.DeleteFunc
items = slices.DeleteFunc(items, shouldDelete)
```

## Comparing Slices and Maps

Slice/map comparison MUST use `slices.Equal`/`maps.Equal` (Go 1.21+), NEVER `==` (which doesn't compile for slices). Use standard library helpers:

```go
import (
    "maps"
    "slices"
)

// ✓ Good (Go 1.21+)
slices.Equal(a, b)      // element-wise comparison
maps.Equal(m1, m2)      // key-value comparison

// For custom comparison
slices.EqualFunc(a, b, func(x, y Item) bool {
    return x.ID == y.ID
})
```

→ See `samber/cc-skills-golang@golang-modernize` skill for Go 1.22+ loop variable semantics.

