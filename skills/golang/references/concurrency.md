# Concurrency

This reference consolidates all retained guidance from `golang-concurrency`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Persona:** You are a Go concurrency engineer. You assume every goroutine is a liability until proven necessary — correctness and leak-freedom come before performance.

**Orchestration mode:** Fan out the five sub-agents described in the "Parallelizing Concurrency Audits" section for auditing concurrent code across a large codebase, and consolidate their findings into one report. On Claude Code, use `ultracode` to opt into multi-agent orchestration explicitly.

**Modes:**

- **Write mode** — implement concurrent code (goroutines, channels, sync primitives, worker pools, pipelines). Follow the sequential instructions below.
- **Review mode** — reviewing a PR's concurrent code changes. Focus on the diff: check for goroutine leaks, missing context propagation, ownership violations, and unprotected shared state. Sequential.
- **Audit mode** — auditing existing concurrent code across a codebase. Use up to 5 parallel sub-agents as described in the "Parallelizing Concurrency Audits" section.

> **Community default.** A company skill that explicitly supersedes `samber/cc-skills-golang@golang-concurrency` skill takes precedence.

# Go Concurrency Best Practices

Go's concurrency model is built on goroutines and channels. Goroutines are cheap but not free — every goroutine you spawn is a resource you must manage. The goal is structured concurrency: every goroutine has a clear owner, a predictable exit, and proper error propagation.

## Core Principles

1. **Every goroutine must have a clear exit** — without a shutdown mechanism (context, done channel, WaitGroup), they leak and accumulate until the process crashes
2. **Share memory by communicating** — channels transfer ownership explicitly; mutexes protect shared state but make ownership implicit
3. **Send copies, not pointers** on channels — sending pointers creates invisible shared memory, defeating the purpose of channels
4. **Only the sender closes a channel** — closing from the receiver side panics if the sender writes after close
5. **Specify channel direction** (`chan<-`, `<-chan`) — the compiler prevents misuse at build time
6. **Default to unbuffered channels** — larger buffers mask backpressure; use them only with measured justification
7. **Always include `ctx.Done()` in select** — without it, goroutines leak after caller cancellation
8. **Avoid repeated `time.After` in hot loops** — each call allocates a timer and creates unnecessary churn; use `time.NewTimer` + `Reset` for long-running loops
9. **Track goroutine leaks in tests** with `go.uber.org/goleak`

For detailed channel/select code examples, see [Channels and Select Patterns](references/channels-and-select.md).

## Channel vs Mutex vs Atomic

| Scenario | Use | Why |
| --- | --- | --- |
| Passing data between goroutines | Channel | Communicates ownership transfer |
| Coordinating goroutine lifecycle | Channel + context | Clean shutdown with select |
| Protecting shared struct fields | `sync.Mutex` / `sync.RWMutex` | Simple critical sections |
| Simple counters, flags | `sync/atomic` | Lock-free, lower overhead |
| Many readers, few writers on a map | `sync.Map` | Optimized for read-heavy workloads. **Concurrent map read/write causes a hard crash** |
| Caching expensive computations | `sync.Once` / `singleflight` | Execute once or deduplicate |

## WaitGroup vs errgroup

| Need | Use | Why |
| --- | --- | --- |
| Wait for goroutines, errors not needed | `sync.WaitGroup` | Fire-and-forget |
| Wait + collect first error | `errgroup.Group` | Error propagation |
| Wait + cancel siblings on first error | `errgroup.WithContext` | Context cancellation on error |
| Wait + limit concurrency | `errgroup.SetLimit(n)` | Built-in worker pool |

## Sync Primitives Quick Reference

| Primitive | Use case | Key notes |
| --- | --- | --- |
| `sync.Mutex` | Protect shared state | Keep critical sections short; never hold across I/O |
| `sync.RWMutex` | Many readers, few writers | Never upgrade RLock to Lock (deadlock) |
| `sync/atomic` | Simple counters, flags | Prefer typed atomics (Go 1.19+): `atomic.Int64`, `atomic.Bool` |
| `sync.Map` | Concurrent map, read-heavy | No explicit locking; use `RWMutex`+map when writes dominate |
| `sync.Pool` | Reuse temporary objects | Always `Reset()` before `Put()`; reduces GC pressure |
| `sync.Once` | One-time initialization | Go 1.21+: `OnceFunc`, `OnceValue`, `OnceValues` |
| `sync.WaitGroup` | Waiting for simple goroutines | Go 1.25+: prefer `wg.Go(func(){ ... })` for fire-and-wait tasks that do not panic and do not need error propagation. For Go <1.25 use `Add`/`Done`. For errors/cancellation/limits, use `errgroup` with context. |
| `x/sync/singleflight` | Deduplicate concurrent calls | Cache stampede prevention |
| `x/sync/errgroup` | Goroutine group + errors | `SetLimit(n)` replaces hand-rolled worker pools |

For detailed examples and anti-patterns, see [Sync Primitives Deep Dive](references/sync-primitives.md).

## Concurrency Checklist

Before spawning a goroutine, answer:

- [ ] **How will it exit?** — context cancellation, channel close, or explicit signal
- [ ] **Can I signal it to stop?** — pass `context.Context` or done channel
- [ ] **Can I wait for it?** — `sync.WaitGroup` or `errgroup`
- [ ] **Who owns the channels?** — creator/sender owns and closes
- [ ] **Should this be synchronous instead?** — don't add concurrency without measured need

## Pipelines and Worker Pools

For pipeline patterns (fan-out/fan-in, bounded workers, generator chains, Go 1.23+ iterators, `samber/ro`), see [Pipelines and Worker Pools](references/pipelines.md).

## Parallelizing Concurrency Audits

When auditing concurrency across a large codebase, use up to 5 parallel sub-agents:

1. Find all goroutine spawns (`go func`, `go method`) and verify shutdown mechanisms
2. Search for mutable globals and shared state without synchronization
3. Audit channel usage — ownership, direction, closure, buffer sizes
4. Find `time.After` in loops, missing `ctx.Done()` in select, unbounded spawning
5. Check mutex usage, `sync.Map`, atomics, and thread-safety documentation

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Fire-and-forget goroutine | Provide stop mechanism (context, done channel) |
| Closing channel from receiver | Only the sender closes |
| `time.After` in hot loop | Reuse `time.NewTimer` + `Reset` |
| Missing `ctx.Done()` in select | Always select on context to allow cancellation |
| Unbounded goroutine spawning | Use `errgroup.SetLimit(n)` or semaphore |
| Sharing pointer via channel | Send copies or immutable values |
| `wg.Add` inside goroutine | Call `Add` before `go` — `Wait` may return early otherwise |
| Forgetting `-race` in CI | Always run `go test -race ./...` |
| Mutex held across I/O | Keep critical sections short |

## Cross-References

- → See `samber/cc-skills-golang@golang-performance` skill for false sharing, cache-line padding, `sync.Pool` hot-path patterns
- → See `samber/cc-skills-golang@golang-context` skill for cancellation propagation and timeout patterns
- → See `samber/cc-skills-golang@golang-safety` skill for concurrent map access and race condition prevention
- → See `samber/cc-skills-golang@golang-troubleshooting` skill for debugging goroutine leaks and deadlocks
- → See `samber/cc-skills-golang@golang-design-patterns` skill for graceful shutdown patterns
- → See `samber/cc-skills-golang@golang-continuous-integration` skill for automated AI-driven code review in CI using these guidelines

### Goroutine leak profile

The goroutine leak profile (experimental behind `GOEXPERIMENT=goroutineleakprofile` in Go 1.26) is generally available in `runtime/pprof` since Go 1.27 — no build flag required. It is a useful production-oriented leak signal alongside the existing tools below.

```bash
curl http://localhost:6060/debug/pprof/goroutineleak?debug=2
go tool pprof http://localhost:6060/debug/pprof/goroutineleak
```

Keep existing tools:

- tests: `go.uber.org/goleak`
- runtime count: `runtime.NumGoroutine()`
- stack dump: `/debug/pprof/goroutine?debug=2`
- race checks: `go test -race ./...`

## References

- [Go Concurrency Patterns: Pipelines](https://go.dev/blog/pipelines)
- [Effective Go: Concurrency](https://go.dev/doc/effective_go#concurrency)


## Source Reference: `golang-concurrency/references/channels-and-select.md`

# Channels and Select Patterns

## Table of Contents

- [Goroutine Lifecycle](#goroutine-lifecycle)
  - [Panic Recovery at Goroutine Boundaries](#panic-recovery-at-goroutine-boundaries)
- [Channel Direction](#channel-direction)
- [Channel Closing](#channel-closing)
- [Buffer Size](#buffer-size)
- [Select for Non-Blocking Communication](#select-for-non-blocking-communication)
- [Avoid Repeated `time.After` in Hot Loops](#avoid-repeated-timeafter-in-hot-loops)

## Goroutine Lifecycle

NEVER start a goroutine without knowing how it stops. Every goroutine MUST answer: **how will it stop?**

```go
// ✗ Bad — fire-and-forget, no way to stop or wait
func startWorker() {
    go func() {
        for {
            doWork() // runs forever, leaks on shutdown
        }
    }()
}

// ✓ Good — goroutine respects context cancellation, caller can wait
func startWorker(ctx context.Context) *sync.WaitGroup {
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        defer wg.Done()
        for {
            select {
            case <-ctx.Done():
                return
            default:
                doWork(ctx)
            }
        }
    }()
    return &wg
}
```

### Panic Recovery at Goroutine Boundaries

A panic in a goroutine crashes the entire process. Always recover at goroutine boundaries in production code:

```go
go func() {
    defer func() {
        if r := recover(); r != nil {
            // ...
        }
    }()
    doWork(ctx)
}()
```

## Channel Direction

Specify direction in function signatures to prevent misuse at compile time:

```go
// ✗ Bad — caller could accidentally close or send on a receive-only channel
func consume(ch chan int) { ... }

// ✓ Good — compiler enforces correct usage
func produce(ch chan<- int) { ... } // send-only
func consume(ch <-chan int) { ... } // receive-only
```

## Channel Closing

Channels MUST be closed by the sender (producer), NEVER by the receiver — it causes a panic if the sender writes after close.

```go
// ✓ Good — producer closes when done
func generate(ctx context.Context) <-chan int {
    ch := make(chan int)
    go func() {
        defer close(ch) // sender closes
        for i := 0; ; i++ {
            select {
            case ch <- i:
            case <-ctx.Done():
                return
            }
        }
    }()
    return ch
}
```

## Buffer Size

| Size | When to use |
| --- | --- |
| 0 (unbuffered) | Default. Synchronizes sender and receiver — use when you need handoff guarantees |
| 1 | Signal channels (`done := make(chan struct{}, 1)`), or when sender must not block on a single pending item |
| N > 1 | Only with measured justification — document why N was chosen and what happens when the buffer fills |

```go
// ✓ Good — unbuffered for synchronous handoff
ch := make(chan Result)

// ✓ Good — buffered 1 for signal
done := make(chan struct{}, 1)

// ✗ Suspicious — arbitrary large buffer hides backpressure problems
// Give explanation in comments.
ch := make(chan Task, 1000) // why 1000? what if it fills?
```

## Select for Non-Blocking Communication

Use `select` to multiplex channel operations and always include `ctx.Done()` to prevent goroutine leaks:

```go
func process(ctx context.Context, in <-chan Task, out chan<- Result) {
    for {
        select {
        case <-ctx.Done():
            return
        case task, ok := <-in:
            if !ok {
                return // channel closed
            }
            result := handle(ctx, task)
            select {
            case out <- result:
            case <-ctx.Done():
                return
            }
        }
    }
}
```

## Avoid Repeated `time.After` in Hot Loops

```go
// ✗ Bad — creates a new timer on every iteration
for {
    select {
    case msg := <-ch:
        handle(msg)
    case <-time.After(5 * time.Second): // repeated allocation/churn
        handleTimeout()
    }
}

// ✓ Good (Go 1.23+) — reuse the timer
timer := time.NewTimer(5 * time.Second)
defer timer.Stop()
for {
    select {
    case msg := <-ch:
        timer.Stop()
        timer.Reset(5 * time.Second)
        handle(msg)
    case <-timer.C:
        handleTimeout()
        timer.Reset(5 * time.Second)
    }
}
```

For Go <1.23, if `timer.Stop()` returns false, drain a possible stale value before `Reset`. In Go 1.23+, receiving from `timer.C` after `Stop` returns is guaranteed to block rather than receive a stale value.


## Source Reference: `golang-concurrency/references/pipelines.md`

# Pipelines and Worker Pools

## Table of Contents

- [Pipeline Pattern](#pipeline-pattern)
- [Fan-Out / Fan-In](#fan-out--fan-in)
- [Worker Pool with errgroup](#worker-pool-with-errgroup)
- [Bounded Concurrency with Semaphore](#bounded-concurrency-with-semaphore)
- [Pipeline Alternatives](#pipeline-alternatives)
  - [Go 1.23+ Iterators (range-over-func)](#go-123-iterators-range-over-func)
  - [samber/ro](#samberro)
- [Goroutine Leak Detection](#goroutine-leak-detection)
- [Common Pipeline Mistakes](#common-pipeline-mistakes)

## Pipeline Pattern

A pipeline is a series of stages connected by channels, where each stage is a goroutine (or group of goroutines) that:

1. Receives values from an upstream channel
2. Processes each value
3. Sends results to a downstream channel

```go
// Stage 1: Generate integers
func generate(ctx context.Context, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case out <- n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}

// Stage 2: Square each integer
func square(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case out <- n * n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}

// Usage
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    ch := generate(ctx, 2, 3, 4)
    results := square(ctx, ch)

    for v := range results {
        fmt.Println(v) // 4, 9, 16
    }
}
```

**Key rules for pipelines**:

- Pipeline stages MUST accept and respect context cancellation — every stage must select on `ctx.Done()` to avoid goroutine leaks on early cancellation
- The producer (first stage) closes its output channel; each subsequent stage closes its own output
- NEVER create unbounded goroutines in pipeline stages
- Use unbuffered channels unless you have measured throughput needs

## Fan-Out / Fan-In

**Fan-out**: multiple goroutines read from the same channel to parallelize CPU-bound work. **Fan-in**: multiple channels are merged into a single output channel.

```go
// Fan-out: N workers reading from the same input channel
func fanOut(ctx context.Context, in <-chan Task, workers int) <-chan Result {
    out := make(chan Result)
    var wg sync.WaitGroup

    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for {
                select {
                case task, ok := <-in:
                    if !ok {
                        return
                    }
                    select {
                    case out <- process(ctx, task):
                    case <-ctx.Done():
                        return
                    }
                case <-ctx.Done():
                    return
                }
            }
        }()
    }

    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}
```

```go
// Fan-in: merge multiple channels into one
func fanIn(ctx context.Context, channels ...<-chan Result) <-chan Result {
    out := make(chan Result)
    var wg sync.WaitGroup

    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan Result) {
            defer wg.Done()
            for v := range c {
                select {
                case out <- v:
                case <-ctx.Done():
                    return
                }
            }
        }(ch)
    }

    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}
```

## Worker Pool with errgroup

Fan-out workers SHOULD use `errgroup.SetLimit` for bounded concurrency. For most use cases, `errgroup.SetLimit` replaces hand-rolled worker pools:

```go
func processAll(ctx context.Context, tasks []Task) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10) // max 10 concurrent workers

    for _, task := range tasks {
        g.Go(func() error {
            return process(ctx, task)
        })
    }
    return g.Wait()
}
```

Use a hand-rolled worker pool only when you need:

- Per-worker state (connections, buffers)
- Custom backpressure or priority scheduling
- Graceful draining with in-flight task completion

## Bounded Concurrency with Semaphore

When you need fine-grained concurrency control without errgroup:

```go
func processAll(ctx context.Context, items []Item) error {
    sem := make(chan struct{}, 10) // semaphore of 10
    var wg sync.WaitGroup

    for _, item := range items {
        wg.Add(1)
        sem <- struct{}{} // acquire
        go func(item Item) {
            defer wg.Done()
            defer func() { <-sem }() // release
            process(ctx, item)
        }(item)
    }
    wg.Wait()
    return nil
}
```

Prefer `errgroup.SetLimit` over this pattern when error propagation is needed.

## Pipeline Alternatives

### Go 1.23+ Iterators (range-over-func)

For in-process data transformations that do not need concurrency, iterators avoid the overhead of goroutines and channels:

```go
func Filter[T any](seq iter.Seq[T], pred func(T) bool) iter.Seq[T] {
    return func(yield func(T) bool) {
        for v := range seq {
            if pred(v) {
                if !yield(v) {
                    return
                }
            }
        }
    }
}

func Map[T, U any](seq iter.Seq[T], f func(T) U) iter.Seq[U] {
    return func(yield func(U) bool) {
        for v := range seq {
            if !yield(f(v)) {
                return
            }
        }
    }
}
```

Use iterators when:

- Processing is CPU-bound and does not benefit from parallelism
- You want lazy evaluation without goroutine overhead
- The data source is already sequential (slice, database cursor)

Use goroutine+channel pipelines when:

- Stages involve I/O (network, disk) that benefits from concurrency
- You need true parallelism across CPU cores
- Stages have different throughput characteristics

### samber/ro

`samber/ro` provides a fluent, type-safe pipeline API for read-only collections:

```go
import "github.com/samber/ro"

emails, _ := ro.Collect( // ignore error
    ro.Pipe(
        ro.FromSlice(users),
        ro.Filter(func(u User) bool { return u.Active }),
        ro.Map(func(u User) string { return u.Email }),
    ),
)

```

Use `samber/ro` for sequential data transformations that benefit from a fluent API. It might also support parallel processing if needed.

## Goroutine Leak Detection

Goroutine leaks SHOULD be detected with goleak in tests. Use `go.uber.org/goleak` in `TestMain` to catch leaked goroutines across all tests:

```go
func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}
```

## Common Pipeline Mistakes

| Mistake | Fix |
| --- | --- |
| Missing `ctx.Done()` in pipeline stage | Always select on context to allow cancellation |
| Not closing output channel | Producer must `defer close(out)` |
| Unbounded goroutine spawning | Use `errgroup.SetLimit` or a semaphore |
| Sending mutable data through channel | Send copies or immutable values |
| Blocking send without select | Wrap channel sends in select with `ctx.Done()` |

→ See `samber/cc-skills-golang@golang-concurrency` skill for sync primitives and channel patterns.


## Source Reference: `golang-concurrency/references/sync-primitives.md`

# Sync Primitives Deep Dive

## Table of Contents

- [sync.Mutex](#syncmutex)
  - [Embedding Convention](#embedding-convention)
- [sync.RWMutex](#syncrwmutex)
- [sync/atomic](#syncatomic)
- [sync.Map](#syncmap)
- [sync.Pool](#syncpool)
- [sync.Once](#synconce)
- [sync.WaitGroup](#syncwaitgroup)
  - [Go 1.25+: `wg.Go`](#go-125-wggo)
  - [Go <1.25 fallback](#go-125-fallback)
- [golang.org/x/sync/singleflight](#golangorgxsyncsingleflight)
- [golang.org/x/sync/errgroup](#golangorgxsyncerrgroup)
  - [Bounded Concurrency with SetLimit](#bounded-concurrency-with-setlimit)

## sync.Mutex

Protects shared state with exclusive access. MUST hold the lock for the shortest time possible — NEVER hold a mutex across I/O, network calls, or channel operations.

```go
type SafeCache struct {
    mu    sync.Mutex
    items map[string]string
}

func (c *SafeCache) Get(key string) (string, bool) {
    c.mu.Lock()
    defer c.mu.Unlock()
    v, ok := c.items[key]
    return v, ok
}

func (c *SafeCache) Set(key, value string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.items[key] = value
}
```

### Embedding Convention

Embed the mutex as an unexported field, placed directly above the fields it protects:

```go
type Registry struct {
    mu      sync.Mutex // protects entries
    entries map[string]Entry
}
```

## sync.RWMutex

SHOULD be used when reads greatly outnumber writes. Multiple goroutines can hold `RLock` simultaneously; `Lock` is exclusive.

```go
type Config struct {
    mu     sync.RWMutex
    values map[string]string
}

func (c *Config) Get(key string) string {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.values[key]
}

func (c *Config) Set(key, value string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.values[key] = value
}
```

**Pitfall**: Do not upgrade RLock to Lock — this deadlocks. Release RLock first, then acquire Lock.

## sync/atomic

Lock-free operations for simple values. SHOULD be preferred over Mutex for simple counter operations. Faster than mutex for low-contention counters and flags.

```go
// ✓ Good — atomic for a simple counter
var requestCount atomic.Int64

func handleRequest() {
    requestCount.Add(1)
}

func getCount() int64 {
    return requestCount.Load()
}
```

```go
// ✓ Good — atomic.Bool for a shutdown flag
var shuttingDown atomic.Bool

func shutdown() {
    shuttingDown.Store(true)
}

func isRunning() bool {
    return !shuttingDown.Load()
}
```

Go 1.19+ provides typed atomics (`atomic.Int64`, `atomic.Bool`, `atomic.Pointer[T]`) — prefer these over raw `atomic.AddInt64`/`atomic.LoadInt64`.

## sync.Map

SHOULD only be used for write-once/read-many patterns. Optimized for two common patterns: (1) keys are written once and read many times, (2) multiple goroutines read/write disjoint key sets. For other patterns, a plain `map` + `sync.RWMutex` is faster.

```go
var cache sync.Map

func Get(key string) (any, bool) {
    return cache.Load(key)
}

func Set(key string, value any) {
    cache.Store(key, value)
}

func GetOrSet(key string, compute func() any) any {
    if v, ok := cache.Load(key); ok {
        return v
    }
    v, _ := cache.LoadOrStore(key, compute())
    return v
}
```

**When NOT to use `sync.Map`**: when you need to iterate, get the length, or when writes are frequent and keys overlap heavily. Use `sync.RWMutex` + `map` instead.

## sync.Pool

Reuse temporary objects to reduce GC pressure. MUST NOT store pointers to stack-allocated objects. Objects in the pool may be reclaimed at any GC cycle — do not store persistent state.

```go
var bufPool = sync.Pool{
    New: func() any {
        return new(bytes.Buffer)
    },
}

func process(data []byte) string {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufPool.Put(buf)
    }()

    buf.Write(data)
    // ... transform ...
    return buf.String()
}
```

**Rules**:

- Always `Reset()` before `Put()` — returning dirty objects causes bugs
- Do not assume an object from `Get()` is zeroed — the `New` func only runs if the pool is empty
- Best for short-lived, frequently allocated objects (buffers, encoders, temporary structs)

## sync.Once

MUST be used for one-time initialization. Execute exactly once, regardless of how many goroutines call it concurrently. Thread-safe by design.

```go
type DBClient struct {
    initOnce  sync.Once
    closeOnce sync.Once
    conn      *sql.DB
}

func (c *DBClient) getConn() *sql.DB {
    c.initOnce.Do(func() {
        var err error
        c.conn, err = sql.Open("postgres", dsn)
        if err != nil {
            panic(fmt.Sprintf("db init: %v", err))
        }
    })
    return c.conn
}

func (c *DBClient) Close() error {
    var err error
    c.closeOnce.Do(func() {
        err = c.conn.Close()
    })
    return err
}
```

Go 1.21+ also provides `sync.OnceFunc`, `sync.OnceValue`, and `sync.OnceValues` for simpler use cases:

```go
var loadConfig = sync.OnceValue(func() *Config {
    cfg, err := parseConfig("config.yaml")
    if err != nil {
        panic(err)
    }
    return cfg
})

// Usage: cfg := loadConfig()
```

## sync.WaitGroup

Use `sync.WaitGroup` when you only need to wait for a set of goroutines to finish.

### Go 1.25+: `wg.Go`

`WaitGroup.Go` starts a goroutine, adds it to the group, and removes it from the group when the function returns.

```go
func processAll(items []Item) {
    var wg sync.WaitGroup

    for _, item := range items {
        // Go 1.22+ loop variables are per-iteration when the module has `go 1.22+`.
        // Do not add `item := item` solely for closure capture in modern modules.
        wg.Go(func() {
            process(item)
        })
    }

    wg.Wait()
}
```

Rules:

- `WaitGroup.Go` is Go 1.25+, not Go 1.24.
- The function passed to `wg.Go` must not panic.
- `WaitGroup` does not propagate errors and does not cancel siblings.
- For first-error-wins, cancellation, concurrency limits, or returned values, use `golang.org/x/sync/errgroup`.

**Benefits of `wg.Go()`**:

- No manual `Add`/`Done` bookkeeping
- Lower risk of `Add`/`Wait` ordering bugs
- Cleaner API for simple fire-and-wait work

**When to use**: Go 1.25+ projects for simple goroutines that must all finish, do not return errors, do not need cancellation, and must not panic. Use `errgroup` when work returns errors, needs cancellation, limits, or first-error behavior.

### Go <1.25 fallback

```go
func processAll(ctx context.Context, items []Item) {
    var wg sync.WaitGroup
    for _, item := range items {
        wg.Add(1) // Add BEFORE go
        go func(item Item) {
            defer wg.Done()
            process(ctx, item)
        }(item)
    }
    wg.Wait() // blocks until all goroutines finish
}
```

```go
// ✗ Bad — Add inside the goroutine (race: Wait may return before Add runs)
go func() {
    wg.Add(1)
    defer wg.Done()
    process(item)
}()
```

## golang.org/x/sync/singleflight

Deduplicates concurrent calls for the same key. When multiple goroutines request the same resource simultaneously, only one executes; the rest wait and share the result.

```go
var group singleflight.Group

func GetUser(ctx context.Context, id string) (*User, error) {
    v, err, _ := group.Do(id, func() (any, error) {
        // Only one goroutine executes this for a given id
        return db.QueryUser(ctx, id)
    })
    if err != nil {
        return nil, err
    }
    return v.(*User), nil
}
```

**Use cases**: cache stampede prevention, deduplicating expensive lookups (DB, API), rate-limited external service calls.

## golang.org/x/sync/errgroup

Goroutine group with error propagation. Returns the first error from any goroutine. With `WithContext`, cancels remaining goroutines on first error.

```go
func fetchAll(ctx context.Context, urls []string) ([]Response, error) {
    g, ctx := errgroup.WithContext(ctx) // cancel siblings on first error
    results := make([]Response, len(urls))

    for i, url := range urls {
        g.Go(func() error {
            resp, err := fetch(ctx, url)
            if err != nil {
                return fmt.Errorf("fetching %s: %w", url, err)
            }
            results[i] = resp // safe: each goroutine writes to its own index
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### Bounded Concurrency with SetLimit

SHOULD use `SetLimit` to bound concurrency and avoid unbounded goroutine spawning.

```go
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10) // at most 10 goroutines run concurrently

for _, task := range tasks {
    g.Go(func() error {
        return process(ctx, task)
    })
}
return g.Wait()
```

This replaces hand-rolled worker pools for most use cases.

→ See `samber/cc-skills-golang@golang-concurrency` skill for high-level patterns and decision trees.
