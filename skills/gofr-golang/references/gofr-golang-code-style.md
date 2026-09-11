# GoFr-Golang: Code Style

## GoFr adaptation rules

This is the GoFr-specific form of the general Golang guidance below. Use GoFr as the mandatory framework for service delivery: begin services with `gofr.New()`, keep GoFr lifecycle, configuration, health, structured logging, Prometheus metrics, OpenTelemetry tracing, datasource management, and graceful shutdown intact, and never silently replace GoFr with another web framework. Use the exact GoFr version installed by the project and verify version-sensitive APIs against the project module and official GoFr documentation.

Keep GoFr types at the adapter boundary. GoFr HTTP, gRPC, GraphQL, WebSocket, cron, and CLI handlers use the documented `func(c *gofr.Context) (any, error)` shape where applicable. Bind with `c.Bind(&value)` and check the error; read route parameters with `c.PathParam`, query values with `c.Param`, and return values/errors to GoFr instead of recreating response envelopes. Pass `*gofr.Context` through GoFr datasource/downstream calls for cancellation and trace propagation, but translate to application contracts before entering domain code.

The complete GoFr page set remains in the repository's `skills/gofr` Skill. Read the listed official pages there before implementing the relevant feature; these links are the authoritative framework-specific follow-up for this adapted reference.

## GoFr adaptation rules

Apply GoFr lifecycle, context, configuration, datasource, error, health, and observability conventions to this topic while preserving the Clean Architecture dependency rule.

## Required GoFr references

- `quick-start-introduction.md` — https://gofr.dev/docs/quick-start/introduction
- `quick-start-add-rest-handlers.md` — https://gofr.dev/docs/quick-start/add-rest-handlers
- `references-context.md` — https://gofr.dev/docs/references/context
- `quick-start-observability.md` — https://gofr.dev/docs/quick-start/observability

## Unified Golang guidance

# Code Style

This reference consolidates all retained guidance from `golang-code-style`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Orchestration mode:** Fan out the sub-agents described in the "Parallelizing Code Style Reviews" section, each covering an independent style concern, when reviewing code style across a large codebase, and merge their findings. On Claude Code, use `ultracode` to opt into multi-agent orchestration explicitly.

> **Community default.** A company skill that explicitly supersedes `samber/cc-skills-golang@golang-code-style` skill takes precedence.

# Go Code Style

Style rules that require human judgment — linters handle formatting, this skill handles clarity. For naming see `samber/cc-skills-golang@golang-naming` skill; for design patterns see `samber/cc-skills-golang@golang-design-patterns` skill; for struct/interface design see `samber/cc-skills-golang@golang-structs-interfaces` skill.

> "Clear is better than clever." — Go Proverbs

When ignoring a rule, add a comment to the code.

## Line Length & Breaking

No rigid line limit, but lines beyond ~120 characters MUST be broken. Break at **semantic boundaries**, not arbitrary column counts. Function calls with 4+ arguments MUST use one argument per line — even when the prompt asks for single-line code:

```go
// Good — each argument on its own line, closing paren separate
mux.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
    handleUsers(
        w,
        r,
        serviceName,
        cfg,
        logger,
        authMiddleware,
    )
})
```

When a function signature is too long, the real fix is often **fewer parameters** (use an options struct) rather than better line wrapping. For multi-line signatures, put each parameter on its own line.

## Variable Declarations

SHOULD use `:=` for non-zero values, `var` for zero-value initialization. The form signals intent: `var` means "this starts at zero."

```go
var count int              // zero value, set later
name := "default"          // non-zero, := is appropriate
var buf bytes.Buffer       // zero value is ready to use
```

### Slice & Map Initialization

Slices and maps MUST be initialized explicitly, never nil. Nil maps panic on write; nil slices serialize to `null` in JSON (vs `[]` for empty slices), surprising API consumers.

```go
users := []User{}                       // always initialized
m := map[string]int{}                   // always initialized
users := make([]User, 0, len(ids))      // preallocate when capacity is known
m := make(map[string]int, len(items))   // preallocate when size is known
```

Do not preallocate speculatively — `make([]T, 0, 1000)` wastes memory when the common case is 10 items.

### Composite Literals

Composite literals MUST use field names — positional fields break when the type adds or reorders fields:

```go
srv := &http.Server{
    Addr:         ":8080",
    ReadTimeout:  5 * time.Second,
    WriteTimeout: 10 * time.Second,
}
```

## Control Flow

### Reduce Nesting

Errors and edge cases MUST be handled first (early return). Keep the happy path at minimal indentation:

```go
func process(data []byte) (*Result, error) {
    if len(data) == 0 {
        return nil, errors.New("empty data")
    }

    parsed, err := parse(data)
    if err != nil {
        return nil, fmt.Errorf("parsing: %w", err)
    }

    return transform(parsed), nil
}
```

### Eliminate Unnecessary `else`

When the `if` body ends with `return`/`break`/`continue`, the `else` MUST be dropped. Use default-then-override for simple assignments — assign a default, then override with independent conditions or a `switch`:

```go
// Good — default-then-override with switch (cleanest for mutually exclusive overrides)
level := slog.LevelInfo
switch {
case debug:
    level = slog.LevelDebug
case verbose:
    level = slog.LevelWarn
}

// Bad — else-if chain hides that there's a default
if debug {
    level = slog.LevelDebug
} else if verbose {
    level = slog.LevelWarn
} else {
    level = slog.LevelInfo
}
```

### Complex Conditions & Init Scope

When an `if` condition has 3+ operands, MUST extract into named booleans — a wall of `||` is unreadable and hides business logic. Keep expensive checks inline for short-circuit benefit. [Details](./references/details.md)

```go
// Good — named booleans make intent clear
isAdmin := user.Role == RoleAdmin
isOwner := resource.OwnerID == user.ID
isPublicVerified := resource.IsPublic && user.IsVerified
if isAdmin || isOwner || isPublicVerified || permissions.Contains(PermOverride) {
    allow()
}
```

Scope variables to `if` blocks when only needed for the check:

```go
if err := validate(input); err != nil {
    return err
}
```

### Switch Over If-Else Chains

When comparing the same variable multiple times, prefer `switch`:

```go
switch status {
case StatusActive:
    activate()
case StatusInactive:
    deactivate()
default:
    panic(fmt.Sprintf("unexpected status: %d", status))
}
```

## Function Design

- Functions SHOULD be **short and focused** — one function, one job.
- Functions SHOULD have **≤4 parameters**. Beyond that, use an options struct (see `samber/cc-skills-golang@golang-design-patterns` skill).
- **Parameter order**: `context.Context` first, then inputs, then output destinations.
- Naked returns help in very short functions (1-3 lines) where return values are obvious, but become confusing when readers must scroll to find what's returned — name returns explicitly in longer functions.

```go
func FetchUser(ctx context.Context, id string) (*User, error)
func SendEmail(ctx context.Context, msg EmailMessage) error  // grouped into struct
```

### Prefer `range` for Iteration

SHOULD use `range` over index-based loops. Use `range n` (Go 1.22+) for simple counting.

```go
for _, user := range users {
    process(user)
}
```

## Value vs Pointer Arguments

Pass small types (`string`, `int`, `bool`, `time.Time`) by value. Use pointers when mutating, for large structs (~128+ bytes), or when nil is meaningful. [Details](./references/details.md)

## Code Organization Within Files

- **Group related declarations**: type, constructor, methods together
- **Order**: package doc, imports, constants, types, constructors, methods, helpers
- **One primary type per file** when it has significant methods
- **Blank imports** (`_ "pkg"`) register side effects (init functions). Restricting them to `main` and test packages makes side effects visible at the application root, not hidden in library code
- **Dot imports** pollute the namespace and make it impossible to tell where a name comes from — never use in library code
- **Unexport aggressively** — you can always export later; unexporting is a breaking change. → See `samber/cc-skills-golang@golang-gopls` skill to unexport safely — its rename updates every call site atomically and refuses the change when lowercasing a method would break interface satisfaction, a breakage grep/sed silently ships.

## String Handling

Use `strconv` for simple conversions (faster), `fmt.Sprintf` for complex formatting. Use `%q` in error messages to make string boundaries visible. Use `strings.Builder` for loops, `+` for simple concatenation.

## Type Conversions

Prefer explicit, narrow conversions. Use generics over `any` when a concrete type will do:

```go
func Contains[T comparable](slice []T, target T) bool  // not []any
```

## Philosophy

- **"A little copying is better than a little dependency"**
- **Use `slices` and `maps` standard packages**; for filter/group-by/chunk, use `github.com/samber/lo`
- **"Reflection is never clear"** — avoid `reflect` unless necessary
- **Don't abstract prematurely** — extract when the pattern is stable
- **Minimize public surface** — every exported name is a commitment

## Parallelizing Code Style Reviews

When reviewing code style across a large codebase, use up to 5 parallel sub-agents, each targeting an independent style concern (e.g. control flow, function design, variable declarations, string handling, code organization).

## Enforce with Linters

Many rules are enforced automatically: `gofmt`, `gofumpt`, `goimports`, `gocritic`, `revive`, `wsl_v5`. → See the `samber/cc-skills-golang@golang-lint` skill.

## Cross-References

- → See the `samber/cc-skills-golang@golang-naming` skill for identifier naming conventions
- → See the `samber/cc-skills-golang@golang-structs-interfaces` skill for pointer vs value receivers, interface design
- → See the `samber/cc-skills-golang@golang-design-patterns` skill for functional options, builders, constructors
- → See the `samber/cc-skills-golang@golang-lint` skill for automated formatting enforcement
- → See `samber/cc-skills-golang@golang-continuous-integration` skill for automated AI-driven code review in CI using these guidelines
- → See `samber/cc-skills-golang@golang-refactoring` skill for mechanically applying guard-clause conversion, function extraction, and options-struct migration safely across many call sites once a review surfaces violations at scale


## Source Reference: `golang-code-style/references/details.md`

# Code Style Details

## Extract Complex Conditions

When `if` conditions span multiple operands, extract into named booleans:

```go
// Good — self-documenting
isAdmin := user.Role == RoleAdmin
isOwner := resource.OwnerID == user.ID
hasOverride := permissions.Contains(PermOverride)
if isAdmin || isOwner || hasOverride {
    allow()
}

// Bad — wall of logic
if user.Role == RoleAdmin || resource.OwnerID == user.ID || permissions.Contains(PermOverride) {
    allow()
}
```

**Exception:** When the last condition involves expensive processing, keep it inline to benefit from short-circuit evaluation:

```go
// Good — avoid expensive operation when possible
if isAdmin || isOwner || expensivePermissionCheck(user, resource) {
    allow()
}

// Wasteful — always runs expensive check
canOverride := expensivePermissionCheck(user, resource)
if isAdmin || isOwner || canOverride {
    allow()
}
```

## Value vs Pointer Arguments

This covers **function parameters**, not method receivers (see `samber/cc-skills-golang@golang-structs-interfaces` skill for receiver rules).

Pass small, fixed-size types by value — strings are already a (pointer, length) pair internally:

```go
// Good — value types by value
func FormatUser(name string, age int, createdAt time.Time) string

// Good — pointer for mutation
func PopulateDefaults(cfg *Config)

// Good — pointer when nil is meaningful (optional field update)
func UpdateUser(ctx context.Context, id string, name *string) error

// Bad — pointer for no reason
func Greet(name *string) string
```

**When to use pointers**:

- The function **mutates** the value
- The struct is **large** (~128+ bytes) — avoids copying overhead
- **Nil is meaningful** (optional/nullable parameter)

**When NOT to use pointers**:

- `string`, `int`, `bool`, `float64`, `time.Time` — pass by value
- Read-only access to small structs — pass by value (better cache locality)
- "Just to save memory" — value copy is negligible; stack allocation is fast

**Memory access trade-offs when strong performance is required**:

- **Values (no pointer)**: Stack allocation, excellent CPU cache locality for small types, zero indirection cost. Slower only when copying large structs.
- **Pointers**: One extra dereference (negligible on modern CPUs), but risk cache misses if pointed-to data isn't in cache. Essential for large structs (>~128 bytes) where copy cost dominates.
- **Rule of thumb**: For structs <~128 bytes with read-only access, values are typically faster due to cache locality. For mutation or large structs, pointers win. When in doubt, benchmark.

-> See the `samber/cc-skills-golang@golang-structs-interfaces` skill for pointer vs value **receiver** rules.

