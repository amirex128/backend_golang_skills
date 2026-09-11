# GoFr-Golang: Naming

## GoFr adaptation rules

This is the GoFr-specific form of the general Golang guidance below. Use GoFr as the mandatory framework for service delivery: begin services with `gofr.New()`, keep GoFr lifecycle, configuration, health, structured logging, Prometheus metrics, OpenTelemetry tracing, datasource management, and graceful shutdown intact, and never silently replace GoFr with another web framework. Use the exact GoFr version installed by the project and verify version-sensitive APIs against the project module and official GoFr documentation.

Keep GoFr types at the adapter boundary. GoFr HTTP, gRPC, GraphQL, WebSocket, cron, and CLI handlers use the documented `func(c *gofr.Context) (any, error)` shape where applicable. Bind with `c.Bind(&value)` and check the error; read route parameters with `c.PathParam`, query values with `c.Param`, and return values/errors to GoFr instead of recreating response envelopes. Pass `*gofr.Context` through GoFr datasource/downstream calls for cancellation and trace propagation, but translate to application contracts before entering domain code.

The complete GoFr page set remains in the repository's `skills/gofr` Skill. Read the listed official pages there before implementing the relevant feature; these links are the authoritative framework-specific follow-up for this adapted reference.

## GoFr adaptation rules

Apply GoFr lifecycle, context, configuration, datasource, error, health, and observability conventions to this topic while preserving the Clean Architecture dependency rule.

## Required GoFr references

- `quick-start-add-rest-handlers.md` — https://gofr.dev/docs/quick-start/add-rest-handlers
- `advanced-guide-swagger-documentation.md` — https://gofr.dev/docs/advanced-guide/swagger-documentation
- `references-context.md` — https://gofr.dev/docs/references/context

## Unified Golang guidance

# Naming

This reference consolidates all retained guidance from `golang-naming`. Read it for the matching Go engineering task.


## Source Skill Guidance

> **Community default.** A company skill that explicitly supersedes `samber/cc-skills-golang@golang-naming` skill takes precedence.

# Go Naming Conventions

Go favors short, readable names. Capitalization controls visibility — uppercase is exported, lowercase is unexported. All identifiers MUST use MixedCaps, NEVER underscores.

> "Clear is better than clever." — Go Proverbs
>
> "Design the architecture, name the components, document the details." — Go Proverbs

To ignore a rule, just add a comment to the code.

## Quick Reference

| Element | Convention | Example |
| --- | --- | --- |
| Package | lowercase, single word, \_test suffix OK for test files | `json`, `http`, `tabwriter`, `http_test` |
| File | lowercase, underscores OK | `user_handler.go` |
| Exported name | UpperCamelCase | `ReadAll`, `HTTPClient` |
| Unexported | lowerCamelCase | `parseToken`, `userCount` |
| Interface | method name + `-er` | `Reader`, `Closer`, `Stringer` |
| Struct | MixedCaps noun | `Request`, `FileHeader` |
| Constant | MixedCaps (not ALL_CAPS) | `MaxRetries`, `defaultTimeout` |
| Receiver | 1-2 letter abbreviation | `func (s *Server)`, `func (b *Buffer)` |
| Error variable | `Err` prefix | `ErrNotFound`, `ErrTimeout` |
| Error type | `Error` suffix | `PathError`, `SyntaxError` |
| Constructor | `New` (single type) or `NewTypeName` (multi-type) | `ring.New`, `http.NewRequest` |
| Boolean field | `is`, `has`, `can` prefix on **fields** and methods | `isReady`, `IsConnected()` |
| Test function | `Test` + function name | `TestParseToken` |
| Acronym | all caps or all lower | `URL`, `HTTPServer`, `xmlParser` |
| Variant: context | `WithContext` suffix | `FetchWithContext`, `QueryContext` |
| Variant: in-place | `In` suffix | `SortIn()`, `ReverseIn()` |
| Variant: error | `Must` prefix | `MustParse()`, `MustLoadConfig()` |
| Option func | `With` + field name | `WithPort()`, `WithLogger()` |
| Enum (iota) | type name prefix, zero-value = unknown | `StatusUnknown` at 0, `StatusReady` |
| Named return | descriptive, for docs only | `(n int, err error)` |
| Error string | lowercase (incl. acronyms), no punctuation | `"image: unknown format"`, `"invalid id"` |
| Import alias | short, only on collision | `mrand "math/rand"`, `pb "app/proto"` |
| Format func | `f` suffix | `Errorf`, `Wrapf`, `Logf` |
| Test table fields | `got`/`expected` prefixes | `input string`, `expected int` |

## MixedCaps

All Go identifiers MUST use `MixedCaps` (or `mixedCaps`). NEVER use underscores in identifiers — the only exceptions are test function subcases (`TestFoo_InvalidInput`), generated code, and OS/cgo interop. This is load-bearing, not cosmetic — Go's export mechanism relies on capitalization, and tooling assumes MixedCaps throughout.

```go
// ✓ Good
MaxPacketSize
userCount
parseHTTPResponse

// ✗ Bad — these conventions conflict with Go's export mechanism and tooling expectations
MAX_PACKET_SIZE   // C/Python style
max_packet_size   // snake_case
kMaxBufferSize    // Hungarian notation
```

## Avoid Stuttering

Go call sites always include the package name, so repeating it in the identifier wastes the reader's time — `http.HTTPClient` forces parsing "HTTP" twice. A name MUST NOT repeat information already present in the package name, type name, or surrounding context.

```go
// Good — clean at the call site
http.Client       // not http.HTTPClient
json.Decoder      // not json.JSONDecoder
user.New()        // not user.NewUser()
config.Parse()    // not config.ParseConfig()

// In package sqldb:
type Connection struct{}  // not DBConnection — "db" is already in the package name

// Anti-stutter applies to ALL exported types, not just the primary struct:
// In package dbpool:
type Pool struct{}        // not DBPool
type Status struct{}      // not PoolStatus — callers write dbpool.Status
type Option func(*Pool)   // not PoolOption
```

## Frequently Missed Conventions

These conventions are correct but non-obvious — they are the most common source of naming mistakes:

**Constructor naming:** When a package exports a single primary type, the constructor is `New()`, not `NewTypeName()`. This avoids stuttering — callers write `apiclient.New()` not `apiclient.NewClient()`. Use `NewTypeName()` only when a package has multiple constructible types (like `http.NewRequest`, `http.NewServeMux`).

**Boolean struct fields:** Unexported boolean fields MUST use `is`/`has`/`can` prefix — `isConnected`, `hasPermission`, not bare `connected` or `permission`. The exported getter keeps the prefix: `IsConnected() bool`. This reads naturally as a question and distinguishes booleans from other types.

**Error strings are fully lowercase — including acronyms.** Write `"invalid message id"` not `"invalid message ID"`, because error strings are often concatenated with other context (`fmt.Errorf("parsing token: %w", err)`) and mixed case looks wrong mid-sentence. Sentinel errors should include the package name as prefix: `errors.New("apiclient: not found")`.

**Enum zero values:** Always place an explicit `Unknown`/`Invalid` sentinel at iota position 0. A `var s Status` silently becomes 0 — if that maps to a real state like `StatusReady`, code can behave as if a status was deliberately chosen when it wasn't.

**Subtest names:** Table-driven test case names in `t.Run()` should be fully lowercase descriptive phrases: `"valid id"`, `"empty input"` — not `"valid ID"` or `"Valid Input"`.

## Detailed Categories

For complete rules, examples, and rationale, see:

- **[Packages, Files & Import Aliasing](./references/packages-files.md)** — Package naming (single word, lowercase, no plurals), file naming conventions, import alias patterns (only use on collision to avoid cognitive load), and directory structure.

- **[Variables, Booleans, Receivers & Acronyms](./references/identifiers.md)** — Scope-based naming (length matches scope: `i` for 3-line loops, longer names for package-level), single-letter receiver conventions (`s` for Server), acronym casing (URL not Url, HTTPServer not HttpServer), and boolean naming patterns (isReady, hasPrefix).

- **[Functions, Methods & Options](./references/functions-methods.md)** — Getter/setter patterns (Go omits `Get` so `user.Name()` reads naturally), constructor conventions (`New` or `NewTypeName`), named returns (for documentation only), format function suffixes (`Errorf`, `Wrapf`), and functional options (`WithPort`, `WithLogger`).

- **[Types, Constants & Errors](./references/types-errors.md)** — Interface naming (`Reader`, `Closer` suffix with `-er`), struct naming (nouns, MixedCaps), constants (MixedCaps, not ALL_CAPS), enums (type name prefix like `StatusReady`), sentinel errors (`ErrNotFound` variables), error types (`PathError` suffix), and error message conventions (lowercase, no punctuation).

- **[Test Naming](./references/testing.md)** — Test function naming (`TestFunctionName`), table-driven test field conventions (`input`, `expected`), test helper naming, and subcase naming patterns.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| `ALL_CAPS` constants | Go reserves casing for visibility, not emphasis — use `MixedCaps` (`MaxRetries`) |
| `GetName()` getter | Go omits `Get` because `user.Name()` reads naturally at call sites. But `Is`/`Has`/`Can` prefixes are kept for boolean predicates: `IsHealthy() bool` not `Healthy() bool` |
| `Url`, `Http`, `Json` acronyms | Mixed-case acronyms create ambiguity (`HttpsUrl` — is it `Https+Url`?). Use all caps or all lower |
| `this` or `self` receiver | Go methods are called frequently — use 1-2 letter abbreviation (`s` for `Server`) to reduce visual noise |
| `util`, `helper` packages | These names say nothing about content — use specific names that describe the abstraction |
| `http.HTTPClient` stuttering | Package name is always present at call site — `http.Client` avoids reading "HTTP" twice |
| `user.NewUser()` constructor | Single primary type uses `New()` — `user.New()` avoids repeating the type name |
| `connected bool` field | Bare adjective is ambiguous — use `isConnected` so the field reads as a true/false question |
| `"invalid message ID"` error | Error strings must be fully lowercase including acronyms — `"invalid message id"` |
| `StatusReady` at iota 0 | Zero value should be a sentinel — `StatusUnknown` at 0 catches uninitialized values |
| `"not found"` error string | Sentinel errors should include the package name — `"mypackage: not found"` identifies the origin |
| `userSlice` type-in-name | Types encode implementation detail — `users` describes what it holds, not how |
| Inconsistent receiver names | Switching names across methods of the same type confuses readers — use one name consistently |
| `snake_case` identifiers | Underscores conflict with Go's MixedCaps convention and tooling expectations — use `mixedCaps` |
| Long names for short scopes | Name length should match scope — `i` is fine for a 3-line loop, `userIndex` is noise |
| Naming constants by value | Values change, roles don't — `DefaultPort` survives a port change, `Port8080` doesn't |
| `FetchCtx()` context variant | `WithContext` is the standard Go suffix — `FetchWithContext()` is instantly recognizable |
| `sort()` in-place but no `In` | Readers assume functions return new values. `SortIn()` signals mutation |
| `parse()` panicking on error | `MustParse()` warns callers that failure panics — surprises belong in the name |
| Mixing `With*`, `Set*`, `Use*` | Consistency across the codebase — `With*` is the Go convention for functional options |
| Plural package names | Go convention is singular (`net/url` not `net/urls`) — keeps import paths consistent |
| `Wrapf` without `f` suffix | The `f` suffix signals format-string semantics — `Wrapf`, `Errorf` tell callers to pass format args |
| Unnecessary import aliases | Aliases add cognitive load. Only alias on collision — `mrand "math/rand"` |
| Inconsistent concept names | Using `user`/`account`/`person` for the same concept forces readers to track synonyms — pick one name |

Applying these fixes means renaming existing identifiers — → See `samber/cc-skills-golang@golang-gopls` skill to do it safely: its rename updates every call site across the workspace and refuses a rename that would break interface satisfaction, which a grep/sed or manual Edit-based rename silently misses.

## Enforce with Linters

Many naming convention issues are caught automatically by linters: `revive`, `predeclared`, `misspell`, `errname`. See `samber/cc-skills-golang@golang-lint` skill for configuration and usage.

## Cross-References

- → See `samber/cc-skills-golang@golang-code-style` skill for broader formatting and style decisions
- → See `samber/cc-skills-golang@golang-structs-interfaces` skill for interface naming depth and receiver design
- → See `samber/cc-skills-golang@golang-lint` skill for automated enforcement (revive, predeclared, misspell, errname)
- → See `samber/cc-skills-golang@golang-gopls` skill for safe rename when applying a naming fix
- → See `samber/cc-skills-golang@golang-refactoring` skill for how to apply a rename safely at scale (gopls Rename/Inline, blast-radius mapping, staged PR workflow) once you've decided what to rename identifiers to


## Source Reference: `golang-naming/references/functions-methods.md`

# Functions, Methods & Options

## Table of Contents

- [Functions and Methods](#functions-and-methods)
  - [Getters and Setters](#getters-and-setters)
  - [Constructors](#constructors)
  - [Named Return Values](#named-return-values)
- [Functional Options Pattern](#functional-options-pattern)

## Functions and Methods

Functions returning a value are named like **nouns** (what they return). Functions performing actions are named like **verbs** (what they do).

```go
// Noun-like: returns something
func UserName() string { ... }
func DefaultConfig() Config { ... }

// Verb-like: performs an action
func WriteFile(name string, data []byte) error { ... }
func SendNotification(user *User) error { ... }
```

NEVER repeat the package name in function names:

```go
// Good: users call http.Get(), not http.HTTPGet()
package http
func Get(url string) (*Response, error)

// Bad: stutters at the call site
package http
func HTTPGet(url string) (*Response, error)
```

Functions that accept a format string and variadic args (like `fmt.Sprintf`) MUST end with **`f`**:

```go
// Good
func Errorf(format string, args ...any) error
func Wrapf(err error, format string, args ...any) error
func Logf(format string, args ...any)

// Bad
func Error(format string, args ...any) error    // looks like it takes a plain string
func WrapError(err error, format string, args ...any) error
```

### Getters and Setters

Getters MUST NOT use the `Get` prefix. The getter is simply the field name, capitalized.

```go
// Good
func (u *User) Name() string        { return u.name }
func (u *User) SetName(name string)  { u.name = name }

// Bad
func (u *User) GetName() string      { return u.name }
```

Only use `Get` when the underlying concept inherently uses "get" (e.g., HTTP GET). For expensive or blocking operations, use `Fetch` or `Compute` to signal that the call is not trivial.

**Exception — boolean predicates keep the `Is`/`Has`/`Can` prefix.** The no-Get rule applies to value getters, not boolean predicates. A method returning `bool` SHOULD use `Is`/`Has`/`Can` to read naturally as a question — this follows the standard library pattern (`reflect.Type.IsVariadic()`, `net.IP.IsLoopback()`, `big.Int.IsInt64()`).

```go
// Good — boolean predicate keeps Is prefix
func (s *Server) IsHealthy() bool   { return s.healthy }

// Good — value getter omits Get prefix
func (s *Server) Port() int         { return s.port }

// Good — richer return type, bare name is fine (different semantics)
func (s *Server) Healthy() (HealthStatus, error)

// Bad — bare adjective for bool is ambiguous
func (s *Server) Healthy() bool     { return s.healthy }

// Bad — Get prefix on value getter is redundant
func (s *Server) GetPort() int      { return s.port }
```

### Constructors

Name constructors `New` when the package exports a single primary type, or `NewTypeName` when there are multiple types.

```go
// Single primary type — New is unambiguous
package ring
func New(size int) *Ring

// Multiple types — qualify with the type name
package http
func NewRequest(method, url string, body io.Reader) (*Request, error)
func NewServeMux() *ServeMux
```

### Named Return Values

Named return values SHOULD only be used when it improves readability — typically when multiple return values have the same type, or when the names serve as documentation.

```go
// Good — names clarify which int64 is which
func Copy(dst Writer, src Reader) (written int64, err error)
func ScanBytes(data []byte, atEOF bool) (advance int, token []byte, err error)

// Good — single error return, no name needed
func Write(p []byte) (int, error)

// Bad — names add no clarity
func Read(p []byte) (bytes int, e error)  // "bytes" shadows the package, "e" is non-standard
```

NEVER use named returns just to enable bare `return` — bare returns hurt readability in anything but the shortest functions.

## Functional Options Pattern

When a constructor has 3+ optional parameters that may grow, use the **functional options pattern** for clean, extensible APIs.

- **Struct**: `ServerOptions`, `ClientOptions` (not `Opts`, `Params`, `Settings`, `Config`)
- **Function type**: `ServerOption` (singular, not plural)
- **With\* functions**: `WithPort()`, `WithTimeout()`, `WithLogger()`
- **Factory**: `DefaultServerOptions()`


## Source Reference: `golang-naming/references/identifiers.md`

# Variables, Booleans, Receivers & Acronyms

## Table of Contents

- [Variables](#variables)
  - [Avoid Type in the Name](#avoid-type-in-the-name)
  - [Avoid Repetition with Context](#avoid-repetition-with-context)
  - [Use Predictable Names](#use-predictable-names)
  - [Parameters](#parameters)
- [Booleans](#booleans)
- [Receivers](#receivers)
- [Acronyms and Initialisms](#acronyms-and-initialisms)

## Variables

Name length SHOULD be **proportional to scope size**. Short names for small scopes, descriptive names for large scopes.

```go
// Small scope (1-7 lines): short names are fine
for i, v := range items {
    result = append(result, v.Name)
}

// Medium scope: moderately descriptive
userCount := len(users)

// Large scope / package-level: explicit and clear
var defaultHTTPTransport = &http.Transport{
    MaxIdleConns: 100,
}
```

Common single-letter conventions:

| Letter        | Meaning                |
| ------------- | ---------------------- |
| `i`, `j`, `k` | Loop indices           |
| `n`           | Count or length        |
| `v`           | Value (in range loops) |
| `k`           | Key (in map ranges)    |
| `r`           | `io.Reader`            |
| `w`           | `io.Writer`            |
| `b`           | `[]byte` or buffer     |
| `s`           | String                 |
| `t`           | `*testing.T`           |
| `ctx`         | `context.Context`      |
| `err`         | Error                  |

### Avoid Type in the Name

The name should describe what the value represents, not its type.

```go
// Good
users := getUsers()
count := len(items)

// Bad
userSlice := getUsers()
countInt := len(items)
nameString := "hello"
```

### Avoid Repetition with Context

Omit words already clear from the enclosing function, method, or type.

```go
// Good — "user" is clear from the method receiver
func (u *UserService) Create(name string) error { ... }

// Bad — "user" is redundant
func (u *UserService) CreateUser(userName string) error { ... }
```

### Use Predictable Names

The same concept MUST always use the same name across the codebase. If a user is called `user` in one function, it should not become `account`, `person`, or `u` in another. Consistency makes code searchable and reduces cognitive load.

```go
// Good — same concept, same name everywhere
func CreateUser(user *User) error { ... }
func UpdateUser(user *User) error { ... }
func DeleteUser(userID string) error { ... }

// Bad — same concept, different names
func CreateUser(user *User) error { ... }
func UpdateAccount(acct *User) error { ... }   // why "acct"? it's a User
func RemovePerson(id string) error { ... }      // why "person"? why "remove"?
```

This applies to variables, parameters, functions, and fields. Pick one name per domain concept and stick with it: `order` not sometimes `order` / sometimes `purchase`; `userID` not sometimes `userID` / sometimes `uid` / sometimes `userId`.

### Parameters

Parameters double as documentation at the call site. When the type is descriptive, keep the name short. When the type is ambiguous, use a longer name to clarify intent.

```go
// Good — type is descriptive, short name is fine
func AfterFunc(d Duration, f func()) *Timer
func Escape(w io.Writer, s []byte)

// Good — type is ambiguous (int64, string), longer name documents meaning
func Unix(sec, nsec int64) Time
func HasPrefix(s, prefix string) bool

// Bad — ambiguous type with cryptic name
func Unix(a, b int64) Time          // what are a and b?
func HasPrefix(a, b string) bool    // which is the prefix?
```

## Booleans

Boolean variables and fields MUST read naturally as true/false questions. Use prefixes like `is`, `has`, `can`, `allow`, `should`. This applies to **both variables and struct fields**.

```go
// Good — struct fields use is/has prefix
type Client struct {
    isConnected  bool  // reads as "client is connected"
    hasPermission bool // reads as "client has permission"
}

// Good — variables
isReady := true
hasPermission := user.CanEdit(doc)

// Bad — bare adjective is ambiguous
type Client struct {
    connected  bool   // could be confused with a connection object
    permission bool   // noun, not a question
}
```

For exported boolean methods, the prefix becomes part of the method name: `IsValid()`, `HasPrefix()`, `CanRetry()`. The unexported field keeps the prefix too: `isConnected` field → `IsConnected()` method.

## Receivers

Receivers MUST be **1-2 letter abbreviations** of the type name. Use the same name across all methods of a type.

```go
// Good — short, consistent
func (s *Server) Start() error      { ... }
func (s *Server) Stop() error       { ... }
func (s *Server) Handle(r *Request) { ... }

// Bad — too long
func (server *Server) Start() error { ... }

// Bad — inconsistent names across methods
func (s *Server) Start() error      { ... }
func (srv *Server) Stop() error     { ... }

// Bad — NEVER use "this" or "self"
func (this *Server) Handle(r *Request) { ... }
```

## Acronyms and Initialisms

Acronyms MUST be **all caps or all lower**, NEVER mixed. This preserves readability in MixedCaps names.

```go
// Good
URL           // all caps
url           // all lower
HTTPServer    // HTTP is all caps
xmlParser     // xml is all lower
userID        // ID is all caps
newHTTPSURL   // both HTTPS and URL all caps

// Bad
Url           // mixed case acronym
HttpServer    // mixed case
userId        // mixed case for ID
```

When exporting a lowercase acronym, capitalize the whole thing: `url` → `URL`, `grpc` → `GRPC`, `ios` → `IOS`.


## Source Reference: `golang-naming/references/packages-files.md`

# Packages, Files & Import Aliasing

## Packages

Package names MUST be **lowercase, single-word**, with no underscores or MixedCaps. They should be short, concise, and evocative of their purpose. Numbers are allowed (`oauth2`, `k8s`).

```go
// Good
package json
package http
package tabwriter
package oauth2

// Bad
package httpServer    // no MixedCaps
package http_server   // no underscores
package util          // too generic
package common        // meaningless
package helpers       // what does it help with?
package base          // says nothing
package model         // too vague
```

NEVER use generic package names like `util`, `helper`, `common`, `base`, `model`. They fail to communicate purpose and cause import collisions. If you reach for `util`, the function probably belongs in a more specific package.

Package names SHOULD be **singular**, not plural — `net/url` not `net/urls`, `go/token` not `go/tokens`.

### Directory vs Package Name

Directory names SHOULD **match the package name** when possible. Multi-word directories use **hyphens**, but since package names cannot contain hyphens, the package drops them.

```
// Good — directory matches package
httputil/          → package httputil
middleware/        → package middleware
auth/              → package auth

// Good — hyphenated directory, package drops hyphens
user-service/      → package userservice
rate-limit/        → package ratelimit
go-chi/            → package chi

// Good — special directories
cmd/api/           → package main       (cmd/ subdirectories are always main)
internal/auth/     → package auth       (internal/ restricts visibility)

// Bad
user_service/      → package user_service  (underscores in both)
UserService/       → package UserService   (no MixedCaps in directories)
myPackage/         → package mypackage     (directory has caps, package doesn't)
```

Special directories have Go toolchain meaning and don't follow normal naming:

- `cmd/` — entry points, each subdirectory is `package main`
- `internal/` — restricts import visibility to parent module
- `testdata/` — ignored by the Go tool
- `vendor/` — vendored dependencies

Package names SHOULD NOT duplicate exported names — users see `bufio.Reader`, not `bufio.BufReader`. Think about the call site.

## Files

File names MUST be **lowercase** with words separated by **underscores**.

```
user_handler.go
string_converter.go
http_client_test.go
```

Special suffixes:

- `_test.go` — test files (excluded from production builds)
- `_linux.go`, `_amd64.go` — OS/architecture-specific (build constraints)

## Import Aliasing

Import aliases SHOULD only be used on name collision. When an alias is necessary, use a descriptive short name.

```go
// Good — no alias needed
import "github.com/go-chi/chi/v5"

// Good — alias resolves collision
import (
    "crypto/rand"
    mrand "math/rand"
)

// Good — conventional alias for generated code
import pb "myapp/proto/userpb"

// Bad — unnecessary alias
import f "fmt"
```


## Source Reference: `golang-naming/references/testing.md`

# Test Naming

## Test Functions

Test functions follow `Test` + the name of what is being tested. Use underscores for subcases.

```go
func TestParseToken(t *testing.T) { ... }
func TestServer_Handle(t *testing.T) { ... }           // method test
func TestParseToken_InvalidInput(t *testing.T) { ... }  // subcase
```

## Table-Driven Tests

Table-driven test case names SHOULD be **fully lowercase, descriptive phrases** — including acronyms. Use `input` for inputs and `expected` for expected outputs to make the data flow clear:

```go
tests := []struct {
    name         string
    input        string
    expectedCode int
    expectedErr  bool
}{
    {name: "empty input", input: "", expectedCode: 400, expectedErr: true},
    {name: "valid token", input: "abc123", expectedCode: 200},
    {name: "expired token", input: "exp", expectedCode: 401, expectedErr: true},
    {name: "invalid id", input: "???", expectedCode: 400, expectedErr: true},  // "id" not "ID"
}

// Bad — mixed case in test names
{name: "valid ID", ...}      // should be "valid id"
{name: "Empty Input", ...}   // should be "empty input"
```

## Test Helpers

Test helper functions that panic on failure conventionally use the `must` prefix: `mustLoadFixture()`, `mustParseURL()`.


## Source Reference: `golang-naming/references/types-errors.md`

# Types, Constants & Errors

## Table of Contents

- [Interfaces](#interfaces)
  - [Single-Method Interfaces](#single-method-interfaces)
  - [Multi-Method Interfaces](#multi-method-interfaces)
  - [Canonical Method Names](#canonical-method-names)
- [Structs](#structs)
- [Constants](#constants)
  - [Enums (iota)](#enums-iota)
- [Errors](#errors)
  - [Sentinel Errors](#sentinel-errors)
  - [Error Types](#error-types)
  - [Error Strings](#error-strings)

## Interfaces

### Single-Method Interfaces

Name them with the **method name + `-er`** suffix:

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Stringer interface {
    String() string
}

type Closer interface {
    Close() error
}
```

### Multi-Method Interfaces

Use a descriptive **noun** or compose from single-method interfaces:

```go
type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}

type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}
```

### Canonical Method Names

Honor established Go method names and their signatures. If your type implements `Read`, it MUST match `io.Reader`'s signature. NEVER invent variations like `ReadData` or `ToString` — use `String`.

| Method name | Expected interface |
| ----------- | ------------------ |
| `Read`      | `io.Reader`        |
| `Write`     | `io.Writer`        |
| `Close`     | `io.Closer`        |
| `String`    | `fmt.Stringer`     |
| `Error`     | `error`            |
| `Len`       | `sort.Interface`   |
| `ServeHTTP` | `http.Handler`     |

## Structs

Name structs with **MixedCaps nouns** describing the entity. Fields follow exported/unexported rules.

```go
type Server struct {
    Addr     string        // exported
    Handler  http.Handler  // exported
    timeout  time.Duration // unexported
}
```

NEVER suffix struct names with `Struct`, `Object`, or `Data` — they add no information.

## Constants

Constants MUST use **MixedCaps**, NEVER `ALL_CAPS`. The name should explain the **role**, not the **value**.

```go
// Good — MixedCaps, name explains purpose
const MaxRetries = 3
const defaultTimeout = 30 * time.Second
const DefaultPort = 8080

// Bad — ALL_CAPS is not idiomatic Go
const MAX_RETRIES = 3
const DEFAULT_TIMEOUT = 30

// Bad — name is the value, not the purpose
const Three = 3
const Port8080 = 8080
```

### Enums (iota)

Prefix enum values with the **type name** to avoid collisions and improve readability at the call site.

```go
type Status int

const (
    StatusUnknown Status = iota // zero value = unknown/invalid
    StatusReady
    StatusRunning
    StatusDone
)

type Color int

const (
    ColorRed Color = iota + 1  // skip zero to catch uninitialized values
    ColorGreen
    ColorBlue
)
```

**Always protect the zero value.** A `var s Status` will silently be 0 — if that maps to a real state like `StatusReady`, code can behave as if a status was deliberately chosen when it wasn't. Either place an explicit `Unknown` sentinel at iota 0, or start at `iota + 1`. This is not optional — uninitialized enums are a common source of silent bugs.

## Errors

### Sentinel Errors

Sentinel error variables use the `Err` prefix. Error strings SHOULD include the package name as prefix to identify the origin when errors are wrapped:

```go
// Good — package prefix identifies origin
var ErrNotFound = errors.New("mypackage: not found")
var ErrPermissionDenied = errors.New("mypackage: permission denied")
var ErrTimeout = errors.New("mypackage: operation timed out")

// Bad — bare strings lose origin when wrapped
var ErrNotFound = errors.New("not found")
```

### Error Types

Custom error types use the `Error` suffix:

```go
type PathError struct {
    Op   string
    Path string
    Err  error
}

type SyntaxError struct {
    Offset int64
    msg    string
}
```

### Error Strings

Error strings MUST be **fully lowercase — including acronyms** — and MUST NOT **end with punctuation**, because they are often printed following other context (`fmt.Errorf("parsing config: %w", err)`). Acronyms that would normally be capitalized in identifiers (`ID`, `URL`, `HTTP`) become lowercase in error strings.

```go
// Good — lowercase including acronyms, no punctuation
errors.New("image: unknown format")
errors.New("mypackage: invalid message id")     // "id" not "ID"
errors.New("mypackage: invalid url")             // "url" not "URL"
fmt.Errorf("decoding config: %w", err)

// Bad — capitalized, acronyms, punctuation
errors.New("Image: Unknown format.")
errors.New("mypackage: invalid message ID")      // ID should be lowercase in error strings
fmt.Errorf("Failed to decode config: %w.", err)
```

