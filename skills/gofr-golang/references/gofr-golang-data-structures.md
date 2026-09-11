# GoFr-Golang: Data Structures

## GoFr adaptation rules

This is the GoFr-specific form of the general Golang guidance below. Use GoFr as the mandatory framework for service delivery: begin services with `gofr.New()`, keep GoFr lifecycle, configuration, health, structured logging, Prometheus metrics, OpenTelemetry tracing, datasource management, and graceful shutdown intact, and never silently replace GoFr with another web framework. Use the exact GoFr version installed by the project and verify version-sensitive APIs against the project module and official GoFr documentation.

Keep GoFr types at the adapter boundary. GoFr HTTP, gRPC, GraphQL, WebSocket, cron, and CLI handlers use the documented `func(c *gofr.Context) (any, error)` shape where applicable. Bind with `c.Bind(&value)` and check the error; read route parameters with `c.PathParam`, query values with `c.Param`, and return values/errors to GoFr instead of recreating response envelopes. Pass `*gofr.Context` through GoFr datasource/downstream calls for cancellation and trace propagation, but translate to application contracts before entering domain code.

The complete GoFr page set remains in the repository's `skills/gofr` Skill. Read the listed official pages there before implementing the relevant feature; these links are the authoritative framework-specific follow-up for this adapted reference.

## GoFr adaptation rules

Apply GoFr lifecycle, context, configuration, datasource, error, health, and observability conventions to this topic while preserving the Clean Architecture dependency rule.

## Required GoFr references

- `quick-start-add-rest-handlers.md` — https://gofr.dev/docs/quick-start/add-rest-handlers
- `references-context.md` — https://gofr.dev/docs/references/context
- `advanced-guide-dealing-with-sql.md` — https://gofr.dev/docs/advanced-guide/dealing-with-sql

## Unified Golang guidance

# Data Structures

This reference consolidates all retained guidance from `golang-data-structures`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Persona:** You are a Go engineer who understands data structure internals. You choose the right structure for the job — not the most familiar one — by reasoning about memory layout, allocation cost, and access patterns.

# Go Data Structures

Built-in and standard library data structures: internals, correct usage, and selection guidance.

- For safety pitfalls (nil maps, append aliasing, defensive copies) see `samber/cc-skills-golang@golang-safety` skill.
- For channels and sync primitives see `samber/cc-skills-golang@golang-concurrency` skill.
- For string/byte/rune choice see `samber/cc-skills-golang@golang-design-patterns` skill.

## Best Practices Summary

1. **Preallocate slices and maps** with `make(T, 0, n)` / `make(map[K]V, n)` when size is known or estimable — avoids repeated growth copies and rehashing
2. **Arrays** SHOULD be preferred over slices only for fixed, compile-time-known sizes (hash digests, IPv4 addresses, matrix dimensions)
3. **NEVER rely on slice capacity growth timing** — the growth algorithm changed between Go versions and may change again; your code should not depend on when a new backing array is allocated
4. **Use `container/heap`** for priority queues, **`container/list`** only when frequent middle insertions are needed, **`container/ring`** for fixed-size circular buffers
5. **`strings.Builder`** MUST be preferred for building strings; **`bytes.Buffer`** MUST be preferred for bidirectional I/O (implements both `io.Reader` and `io.Writer`)
6. Generic data structures SHOULD use the **tightest constraint** possible — `comparable` for keys, custom interfaces for ordering
7. **`unsafe.Pointer`** MUST only follow the 6 valid conversion patterns from the Go spec — NEVER store in a `uintptr` variable across statements
8. **`weak.Pointer[T]`** (Go 1.24+) SHOULD be used for caches and canonicalization maps to allow GC to reclaim entries

## Slice Internals

A slice is a 3-word header: pointer, length, capacity. Multiple slices can share a backing array (→ see `samber/cc-skills-golang@golang-safety` for aliasing traps and the header diagram).

### Capacity Growth

- < 256 elements: capacity doubles
- > = 256 elements: grows by ~25% (`newcap += (newcap + 3*256) / 4`)
- Each growth copies the entire backing array — O(n)

### Preallocation

```go
// Exact size known
users := make([]User, 0, len(ids))

// Approximate size known
results := make([]Result, 0, estimatedCount)

// Pre-grow before bulk append (Go 1.21+)
s = slices.Grow(s, additionalNeeded)
```

### `slices` Package (Go 1.21+)

Key functions: `Sort`/`SortFunc`, `BinarySearch`, `Contains`, `Compact`, `Grow`. For `Clone`, `Equal`, `DeleteFunc` → see `samber/cc-skills-golang@golang-safety` skill.

**[Slice Internals Deep Dive](./references/slice-internals.md)** — Full `slices` package reference, growth mechanics, `len` vs `cap`, header copying, backing array aliasing.

## Map Internals

Maps are hash tables with 8-entry buckets and overflow chains. They are reference types — assigning a map copies the pointer, not the data.

### Preallocation

```go
m := make(map[string]*User, len(users)) // avoids rehashing during population
```

### `maps` Package Quick Reference (Go 1.21+)

| Function          | Purpose                      |
| ----------------- | ---------------------------- |
| `Collect` (1.23+) | Build map from iterator      |
| `Insert` (1.23+)  | Insert entries from iterator |
| `All` (1.23+)     | Iterator over all entries    |
| `Keys`, `Values`  | Iterators over keys/values   |

For `Clone`, `Equal`, sorted iteration → see `samber/cc-skills-golang@golang-safety` skill.

**[Map Internals Deep Dive](./references/map-internals.md)** — How Go maps store and hash data, bucket overflow chains, why maps never shrink (and what to do about it), comparing map performance to alternatives.

## Arrays

Fixed-size, value types. Copied entirely on assignment. Use for compile-time-known sizes:

```go
type Digest [32]byte           // fixed-size, value type
var grid [3][3]int             // multi-dimensional
cache := map[[2]int]Result{}   // arrays are comparable — usable as map keys
```

Prefer slices for everything else — arrays cannot grow and pass by value (expensive for large sizes).

## container/ Standard Library

| Package | Data Structure | Best For |
| --- | --- | --- |
| `container/list` | Doubly-linked list | LRU caches, frequent middle insertion/removal |
| `container/heap` | Min-heap (priority queue) | Top-K, scheduling, Dijkstra |
| `container/ring` | Circular buffer | Rolling windows, round-robin |
| `bufio` | Buffered reader/writer/scanner | Efficient I/O with small reads/writes |

Container types use `any` (no type safety) — consider generic wrappers. **[Container Patterns, bufio, and Examples](./references/containers.md)** — When to use each container type, generic wrappers to add type safety, and `bufio` patterns for efficient I/O.

## strings.Builder vs bytes.Buffer

Use `strings.Builder` for pure string concatenation (avoids copy on `String()`), `bytes.Buffer` when you need `io.Reader` or byte manipulation. Both support `Grow(n)`. **[Details and comparison](./references/containers.md)**

## Generic Collections (Go 1.18+)

Use the tightest constraint possible. `comparable` for map keys, `cmp.Ordered` for sorting, custom interfaces for domain-specific ordering.

```go
type Set[T comparable] map[T]struct{}

func (s Set[T]) Add(v T)          { s[v] = struct{}{} }
func (s Set[T]) Contains(v T) bool { _, ok := s[v]; return ok }
```

**[Writing Generic Data Structures](./references/generics.md)** — Using Go 1.18+ generics for type-safe containers, understanding constraint satisfaction, and building domain-specific generic types.

## Pointer Types

| Type | Use Case | Zero Value |
| --- | --- | --- |
| `*T` | Normal indirection, mutation, optional values | `nil` |
| `unsafe.Pointer` | FFI, low-level memory layout (6 spec patterns only) | `nil` |
| `weak.Pointer[T]` (1.24+) | Caches, canonicalization, weak references | N/A |

**[Pointer Types Deep Dive](./references/pointers.md)** — Normal pointers, `unsafe.Pointer` (the 6 valid spec patterns), and `weak.Pointer[T]` for GC-safe caches that don't prevent cleanup.

## Copy Semantics Quick Reference

| Type | Copy Behavior | Independence |
| --- | --- | --- |
| `int`, `float`, `bool`, `string` | Value (deep copy) | Fully independent |
| `array`, `struct` | Value (deep copy) | Fully independent |
| `slice` | Header copied, backing array shared | Use `slices.Clone` |
| `map` | Reference copied | Use `maps.Clone` |
| `channel` | Reference copied | Same channel |
| `*T` (pointer) | Address copied | Same underlying value |
| `interface` | Value copied (type + value pair) | Depends on held type |

## Third-Party Libraries

For advanced data structures (trees, sets, queues, stacks) beyond the standard library:

- **`emirpasic/gods`** — comprehensive collection library (trees, sets, lists, stacks, maps, queues)
- **`deckarep/golang-set`** — thread-safe and non-thread-safe set implementations
- **`gammazero/deque`** — fast double-ended queue

When using third-party libraries, refer to their official documentation and code examples for current API signatures.

- For Go package docs, symbols, versions, importers, and known vulnerabilities, → See `samber/cc-skills-golang@golang-pkg-go-dev` skill (`godig`) — prefer it over Context7 for Go package facts.
- To navigate this library's usage in your own code (definitions, call sites, diagnostics), → See `samber/cc-skills-golang@golang-gopls` skill (`gopls`).
- Context7 remains a fallback for docs not indexed on pkg.go.dev.

## Cross-References

- → See `samber/cc-skills-golang@golang-performance` skill for struct field alignment, memory layout optimization, and cache locality
- → See `samber/cc-skills-golang@golang-safety` skill for nil map/slice pitfalls, append aliasing, defensive copying, `slices.Clone`/`Equal`
- → See `samber/cc-skills-golang@golang-concurrency` skill for channels, `sync.Map`, `sync.Pool`, and all sync primitives
- → See `samber/cc-skills-golang@golang-design-patterns` skill for `string` vs `[]byte` vs `[]rune`, iterators, streaming
- → See `samber/cc-skills-golang@golang-structs-interfaces` skill for struct composition, embedding, and generics vs `any`
- → See `samber/cc-skills-golang@golang-code-style` skill for slice/map initialization style

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Growing a slice in a loop without preallocation | Each growth copies the entire backing array — O(n) per growth. Use `make([]T, 0, n)` or `slices.Grow` |
| Using `container/list` when a slice would suffice | Linked lists have poor cache locality (each node is a separate heap allocation). Benchmark first |
| `bytes.Buffer` for pure string building | Buffer's `String()` copies the underlying bytes. `strings.Builder` avoids this copy |
| `unsafe.Pointer` stored as `uintptr` across statements | GC can move the object between statements — the `uintptr` becomes a dangling reference |
| Large struct values in maps (copying overhead) | Map access copies the entire value. Use `map[K]*V` for large value types to avoid the copy |

## References

- [Go Data Structures (Russ Cox)](https://research.swtch.com/godata)
- [The Go Memory Model](https://go.dev/ref/mem)
- [Effective Go](https://go.dev/doc/effective_go)


## Source Reference: `golang-data-structures/references/containers.md`

# Container Packages and String Builders

## container/list — Doubly-Linked List

A general-purpose doubly-linked list. Elements hold `any` values (no type safety).

### Time Complexity

| Operation | Complexity | Notes |
| --- | --- | --- |
| **Insert at front/back** | O(1) | `PushFront()`, `PushBack()` |
| **Remove front/back** | O(1) | `l.Remove(l.Front())`, `l.Remove(l.Back())` |
| **Insert at arbitrary position** | O(1) | If you have the element reference (`*Element`) |
| **Remove at arbitrary position** | O(1) | If you have the element reference |
| **Access by index** | O(n) | Must walk the chain — no random access |
| **Search for value** | O(n) | Linear scan required |

### When to Use

- LRU cache implementations (O(1) move-to-front)
- Ordered collections with frequent insertion/removal at arbitrary positions
- When you need stable iterators that survive insertions

### When NOT to Use

Slices outperform linked lists for most use cases due to cache locality. If you only append/remove from the ends, use a slice or a deque. Also avoid if you need O(1) random access by index.

### Use Cases

- LRU cache implementations (O(1) move-to-front with element reference)
- Ordered task queues with frequent arbitrary insertions/removals (if mutations happen frequently)
- Undo/redo stacks with stable element references
- Sliding window algorithms where elements are frequently added/removed from both ends

## container/heap — Priority Queue

An interface-based min-heap. You provide a type implementing `heap.Interface` (which embeds `sort.Interface` plus `Push`/`Pop`).

### Time Complexity

| Operation | Complexity | Notes |
| --- | --- | --- |
| **heap.Push** | O(log n) | Appends and bubbles up |
| **heap.Pop** | O(log n) | Removes root, moves last to root, bubbles down |
| **heap.Init** | O(n) | Builds heap from unsorted slice in linear time |
| **heap.Fix** | O(log n) | Re-heapifies after priority change |
| **Peek (access root)** | O(1) | Direct access to `pq[0]` |
| **Search for value** | O(n) | No indexed lookup — must scan all items |

### Space Complexity

O(n) — stores all items in a backing slice. The heap is an array-based structure, not a tree of pointers.

### Use Cases

- Task scheduling (dequeue highest-priority tasks)
- Dijkstra's algorithm (repeatedly pop minimum-distance node)
- Huffman coding (repeatedly pop two smallest frequencies)
- Event processing (process events in time order)
- A\* pathfinding (explore nodes with lowest f-cost)
- Load balancing (process requests from server with lowest load)

## container/ring — Circular Buffer

A fixed-size circular linked list. Useful for rolling windows and round-robin scheduling.

```go
// Rolling average of last 5 values
r := ring.New(5)
for _, v := range values {
    r.Value = v
    r = r.Next()
}

sum := 0.0
r.Do(func(v any) {
    if v != nil {
        sum += v.(float64)
    }
})
avg := sum / float64(r.Len())
```

## bufio — Buffered I/O

`bufio` wraps `io.Reader` and `io.Writer` with an internal buffer, reducing system call overhead for frequent small reads/writes. Use `NewReader()` / `NewWriter()` for default 4096-byte buffers, or `NewReaderSize()` / `NewWriterSize()` for custom sizes.

**bufio.Reader & Writer:** Call `Flush()` explicitly on writers and check its error. Buffered data is not written until flush or the buffer is full; ignoring a flush error can silently lose data.

**bufio.Scanner:** Convenient line-by-line reading with `scanner.Scan()` and `scanner.Text()`. Default max token size is 64 KB; call `scanner.Buffer()` to increase for larger lines.

## strings.Builder vs bytes.Buffer

**strings.Builder:** Optimized for building strings by concatenating parts — `String()` returns the accumulated string without copying. `Reset()` discards the buffer.

**bytes.Buffer:** Implements both `io.Reader` and `io.Writer`. Use for I/O operations, encoding/decoding, or when you need both read and write. `Reset()` reuses the allocated memory.

**Choose Builder for string concatenation, Buffer for I/O operations or buffer reuse in pools.**


## Source Reference: `golang-data-structures/references/generics.md`

# Writing Generic Data Structures (Go 1.18+)

## Type Constraints

Use the tightest constraint that satisfies your needs:

| Constraint | What It Allows | Use For |
| --- | --- | --- |
| `any` | All types | Containers that only store/retrieve |
| `comparable` | Types supporting `==` and `!=` | Map keys, set membership, dedup |
| `cmp.Ordered` | Numeric types + `string` | Sorting, min/max, binary search |
| Custom interface | Domain-specific operations | Specialized containers |

### Custom Constraints

```go
// Union constraint — restrict to specific types
type Number interface {
    ~int | ~int64 | ~float64
}

// Method constraint — require specific behavior
type Stringer interface {
    comparable
    String() string
}
```

The `~` prefix includes all types whose underlying type matches (e.g., `~int` matches `type UserID int`).

## Generic Set Example

```go
type Set[T comparable] map[T]struct{}

func NewSet[T comparable](vals ...T) Set[T] {
    s := make(Set[T], len(vals))
    for _, v := range vals {
        s[v] = struct{}{}
    }
    return s
}

func (s Set[T]) Add(v T)             { s[v] = struct{}{} }
func (s Set[T]) Remove(v T)          { delete(s, v) }
func (s Set[T]) Contains(v T) bool   { _, ok := s[v]; return ok }
func (s Set[T]) Len() int            { return len(s) }

func (s Set[T]) Union(other Set[T]) Set[T] {
    result := NewSet[T]()
    for v := range s {
        result.Add(v)
    }
    for v := range other {
        result.Add(v)
    }
    return result
}
```

## Generic Sorted Slice

```go
func InsertSorted[T cmp.Ordered](s []T, v T) []T {
    i, _ := slices.BinarySearch(s, v)
    return slices.Insert(s, i, v)
}
```

## Constraint Composition

Combine multiple constraints with embedded interfaces:

```go
type OrderedStringer interface {
    cmp.Ordered
    fmt.Stringer
}
```

## When NOT to Use Generics

- **Single concrete type** — generics add complexity for no benefit
- **`any` constraint with type switches** — you're just reimplementing `interface{}` with extra syntax
- **Two or fewer instantiations** — the abstraction overhead isn't justified
- **Complex type relationships** — Go's type system doesn't support higher-kinded types; if the constraints become convoluted, use interfaces instead

Generics shine for data structures (containers, sets, trees), algorithms (sort, search, transform), and utility functions (min, max, clamp) where the logic is identical across types.

→ See `samber/cc-skills-golang@golang-structs-interfaces` skill for generics vs `any` guidance and interface design.


## Source Reference: `golang-data-structures/references/map-internals.md`

# Map Internals Deep Dive

## Hash Table Structure

Go maps use hash tables with bucket-based collision resolution. The map header holds:

- `count` — number of entries
- `B` — log₂ of bucket count (2^B buckets total)
- `buckets` — pointer to bucket array
- `oldbuckets` — pointer to old buckets during growth

Each bucket holds 8 key-value pairs. Keys and values are stored in separate arrays within buckets to minimize padding waste.

## Memory Growth and Capacity

- **Load factor threshold**: 6.5 entries per bucket triggers growth (sweet spot between memory efficiency and collision performance)
- **Overflow bucket chains** also trigger growth if too long (prevents O(1)→O(n) degradation)
- **Bucket count doubles**: 2^B → 2^(B+1) (efficient rehashing with powers of 2)
- **Incremental evacuation**: Old and new buckets coexist during growth; entries move lazily during operations to avoid GC pauses
- **No `cap()` function**: Capacity depends on hash distribution and load factor, not a fixed limit. Preallocation (`make(map[string]int, expectedSize)`) is worthwhile for large maps to avoid repeated growth cycles

## Preallocation

```go
// Without preallocation — multiple growths as entries are added
m := map[string]int{}

// With preallocation — allocates enough buckets upfront
m := make(map[string]int, expectedSize)
```

Preallocation avoids repeated growths. The hint is approximate — Go allocates 2^B buckets where 2^B \* 6.5 >= hint.

## Pointers vs Values

For large value types, storing pointers reduces copy overhead:

```go
// Large struct — copied on every read/write
m := map[string]BigStruct{}  // copies large struct

// Pointer — only pointer is copied
m := map[string]*BigStruct{} // copies 8-byte pointer
```

Trade-off: pointer maps add GC pressure. For small structs (< 128 bytes), value maps are typically faster.

## `maps` Package (Go 1.21+)

| Function | Description |
| --- | --- |
| `Clone`, `Equal`, `EqualFunc` | Shallow copy and equality comparison |
| `Keys`, `Values`, `All` (1.23+) | Iterators over keys, values, or pairs |
| `Collect`, `Insert` (1.23+) | Build maps from iterators or insert entries |

See `samber/cc-skills-golang@golang-safety` skill for `Clone`, `Equal`, and sorted iteration patterns.

## Map Key Requirements

Map keys must be comparable (`==` must work). This includes:

- All numeric types, `string`, `bool`
- Pointers, channels, interfaces (compared by identity)
- Arrays of comparable types
- Structs where all fields are comparable

Slices, maps, and functions **cannot** be map keys.


## Source Reference: `golang-data-structures/references/pointers.md`

# Pointer Types Deep Dive

## Table of Contents

- [Regular Pointers (`*T`)](#regular-pointers-t)
  - [Stack vs Heap (Escape Analysis)](#stack-vs-heap-escape-analysis)
  - [`new(T)` vs `&T{}`](#newt-vs-t)
- [`unsafe.Pointer`](#unsafepointer)
  - [The 6 Valid Patterns (from the Go spec)](#the-6-valid-patterns-from-the-go-spec)
  - [Critical Rule: NEVER Store `uintptr` Across Statements](#critical-rule-never-store-uintptr-across-statements)
  - [Modern Alternatives (prefer these)](#modern-alternatives-prefer-these)
- [`weak.Pointer[T]` (Go 1.24+)](#weakpointert-go-124)
  - [Use Cases](#use-cases)
  - [`runtime.AddCleanup` vs `runtime.SetFinalizer`](#runtimeaddcleanup-vs-runtimesetfinalizer)

## Regular Pointers (`*T`)

### Stack vs Heap (Escape Analysis)

Go's compiler decides whether to allocate on the stack or heap. A variable "escapes" to the heap when its lifetime extends beyond the function:

```go
func noEscape() int {
    x := 42
    return x // x stays on stack — copied on return
}

func escapes() *int {
    x := 42
    return &x // x escapes to heap — pointer outlives function
}
```

Use `go build -gcflags="-m"` to see escape analysis decisions. Heap allocations add GC pressure — avoid unnecessary escapes in hot paths.

### `new(T)` vs `&T{}`

Both allocate and return a pointer. `&T{}` is preferred because it allows field initialization:

```go
p := new(Point)       // *Point with zero values
p := &Point{X: 1}     // *Point with initialized fields — preferred
```

## `unsafe.Pointer`

`unsafe.Pointer` bypasses Go's type system for FFI and low-level memory manipulation. Only the 6 patterns from the Go spec are safe; any other pattern is undefined behavior.

### The 6 Valid Patterns (from the Go spec)

These are the ONLY safe ways to use `unsafe.Pointer`. Any other pattern is undefined behavior.

**Pattern 1: Convert `*T` to `*U` via `unsafe.Pointer`**

```go
// Reinterpret a float64 as its raw bits
f := 1.5
bits := *(*uint64)(unsafe.Pointer(&f))
```

**Pattern 2: Convert `unsafe.Pointer` to `uintptr` and back (same expression)**

```go
// Pointer arithmetic — MUST be a single expression
p := unsafe.Pointer(uintptr(unsafe.Pointer(&s.field)) + offset)
```

**Pattern 3: `reflect.Value.Pointer()` or `UnsafeAddr()` to `unsafe.Pointer`**

```go
p := unsafe.Pointer(reflect.ValueOf(&x).Pointer())
```

**Pattern 4: `syscall.Syscall` arguments**

```go
syscall.Syscall(SYS_READ, fd, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
```

### Critical Rule: NEVER Store `uintptr` Across Statements

```go
// ✗ DANGEROUS — GC can move the object between these two lines
u := uintptr(unsafe.Pointer(&x))
// ... GC may run here, moving x ...
p := unsafe.Pointer(u) // dangling pointer

// ✓ Safe — single expression
p := unsafe.Pointer(uintptr(unsafe.Pointer(&x)) + offset)
```

### Modern Alternatives (prefer these)

| Function | Since | Purpose |
| --- | --- | --- |
| `unsafe.Add(ptr, len)` | Go 1.17 | Pointer arithmetic without `uintptr` conversion |
| `unsafe.Slice(ptr, len)` | Go 1.17 | Create slice from pointer + length |
| `unsafe.String(ptr, len)` | Go 1.20 | Create string from pointer + length |
| `unsafe.SliceData(s)` | Go 1.17 | Get pointer to slice's backing array |
| `unsafe.StringData(s)` | Go 1.20 | Get pointer to string's backing array |

These are safer than manual `uintptr` arithmetic because they keep values as pointers (visible to GC) throughout.

## `weak.Pointer[T]` (Go 1.24+)

A weak pointer holds a reference to an object without preventing garbage collection. When the GC reclaims the object, `Value()` returns `nil`.

```go
strong := new(MyType)
w := weak.Make(strong)

if p := w.Value(); p != nil {
    // object still alive
} else {
    // object was garbage collected
}
```

### Use Cases

- **Deduplication caches** — intern equivalent values without preventing GC
- **Automatic cache eviction** — cached objects evict when no strong references remain

### `runtime.AddCleanup` vs `runtime.SetFinalizer`

Prefer `runtime.AddCleanup` (Go 1.24+) over `runtime.SetFinalizer`:

- Multiple cleanups can be registered per object
- Cleanup function receives a value, not a pointer to the collected object
- No risk of resurrecting the object
- Works correctly with weak pointers


## Source Reference: `golang-data-structures/references/slice-internals.md`

# Slice Internals

## Memory Layout

A slice is a 24-byte header (3 machine words):

- **Pointer** — points to backing array (heap-allocated)
- **Length** — number of elements in use
- **Capacity** — allocated size of backing array

Assigning or passing a slice copies the 24-byte header, not the backing array. Both the original and copy point to the same underlying data—mutations are visible to both.

## Capacity Growth

When `append` exceeds capacity:

- `oldCap < 256`: double capacity
- `oldCap ≥ 256`: grow ~25% (`oldCap + (oldCap + 3*256) / 4`)

### Growth Cost

Each growth is O(n) — the entire array is copied to a new location. For a slice growing from 0 to N elements one at a time, the amortized cost per append is O(1), but the total copies are roughly 2N. **Preallocation eliminates all intermediate copies:**

```go
// Known size — direct indexing
out := make([]Result, len(input))
for i, v := range input {
    out[i] = transform(v)
}

// Approximate size
out := make([]Result, 0, len(input)*2)
for _, v := range input {
    out = append(out, transform(v))
}
```

## `slices` Package (Go 1.21+)

| Category | Key Functions |
| --- | --- |
| **Sort** | `Sort`, `SortFunc`, `SortStableFunc`, `IsSorted` |
| **Search** | `BinarySearch`, `BinarySearchFunc`, `Contains`, `Index`, `IndexFunc` |
| **Mutate** | `Insert`, `Delete`, `Replace`, `Compact`, `Reverse`, `Grow`, `Clip` |
| **Create** | `Concat` (1.22+), `Repeat` (1.23+), `Chunk` (1.23+) |
| **Compare** | `Clone`, `Equal`, `EqualFunc`, `Compare`, `DeleteFunc` |

## `copy()` vs `append()` vs `slices.Clone()`

| Operation             | Use When                         |
| --------------------- | -------------------------------- |
| `copy(dst, src)`      | Copying into pre-allocated slice |
| `append(dst, src...)` | Appending to a slice             |
| `slices.Clone(s)`     | Creating independent copy        |
| `s[:len(s):len(s)]`   | Preventing append aliasing       |

