# Testing

This reference consolidates all retained guidance from `golang-testing`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Persona:** You are a Go engineer who treats tests as executable specifications. You write tests to constrain behavior, not to hit coverage targets.

**Thinking mode:** Reason as thoroughly as possible for test strategy design and failure analysis — shallow reasoning misses edge cases and produces brittle tests that pass today but break tomorrow. On Claude Code, use `ultrathink` to trigger extended thinking explicitly.

**Orchestration mode:** Fan out the three sub-agents described in Audit mode (unit quality and coverage gaps, integration isolation, goroutine/race issues) for auditing a large test suite, and merge their findings into one gap report. On Claude Code, use `ultracode` to opt into multi-agent orchestration explicitly.

**Modes:**

- **Write mode** — generating new tests for existing or new code. Work sequentially through the code under test; use `gotests` to scaffold table-driven tests, then enrich with edge cases and error paths.
- **Review mode** — reviewing a PR's test changes. Focus on the diff: check coverage of new behaviour, assertion quality, table-driven structure, and absence of flakiness patterns. Sequential.
- **Audit mode** — auditing an existing test suite for gaps, flakiness, or bad patterns (order-dependent tests, missing `t.Parallel()`, implementation-detail coupling). Launch up to 3 parallel sub-agents split by concern: (1) unit test quality and coverage gaps, (2) integration test isolation and build tags, (3) goroutine leaks and race conditions.
- **Debug mode** — a test is failing or flaky. Work sequentially: reproduce reliably, isolate the failing assertion, trace the root cause in production code or test setup.

> **Community default.** A company skill that explicitly supersedes `samber/cc-skills-golang@golang-testing` skill takes precedence.

**Dependencies:**

- gotests: `go install github.com/cweill/gotests/gotests@latest`

# Go Testing Best Practices

This skill guides the creation of production-ready tests for Go applications. Follow these principles to write maintainable, fast, and reliable tests.

## Best Practices Summary

1. Table-driven tests MUST use named subtests -- every test case needs a `name` field passed to `t.Run`
2. Integration tests MUST use build tags (`//go:build integration`) to separate from unit tests
3. Tests MUST NOT depend on execution order -- each test MUST be independently runnable
4. Independent tests SHOULD use `t.Parallel()` when possible
5. Tests MUST assert observable behavior and public API contracts, not implementation details -- a test coupled to internals turns every refactor into a test rewrite while proving nothing about the contract
6. Packages with goroutines SHOULD use `goleak.VerifyTestMain` in `TestMain` to detect goroutine leaks
7. Use testify as helpers, not a replacement for standard library
8. Mock interfaces, not concrete types
9. Keep unit tests fast (< 1ms), use build tags for integration tests
10. Run tests with race detection in CI
11. Include examples as executable documentation
12. Test files MUST be named after the source file under test, not after the function or method being tested
13. Test functions SHOULD appear in the same order as the functions/methods they test in the source file

## Test Structure and Organization

### File Conventions

```go
// package_test.go - tests in same package (white-box, access unexported)
package mypackage

// mypackage_test.go - tests in test package (black-box, public API only)
package mypackage_test
```

Name the test file after the source file it tests, not after the function or method under test. Go's convention is one test file per source file (`foo.go` -> `foo_test.go`), because tools (`go test`, coverage reports, IDE "jump to test" navigation, `gotests`) and reviewers all resolve tests by source file, not by symbol. A source file usually declares several functions/methods; splitting its tests by symbol name scatters them across many files and breaks that file-to-file mapping.

```
// ✓ Good — one test file per source file
helloworld.go       -> helloworld_test.go   // contains TestHelloWorld, TestAbcd, TestXyz, ...

// ✗ Bad — test file named after the function/method instead of the source file
helloworld.go       -> abcd_test.go         // wrong: should be helloworld_test.go
```

Exception: very large source files MAY be split into multiple `_test.go` files by concern (e.g. `foo_test.go` + `foo_edgecases_test.go`), but each split file's name MUST still be derived from the source file name, never from an individual function name. Prefer keeping a single `_test.go` file per source file even when it grows large — splitting adds navigation overhead and is rarely worth it; reach for the exception only when a single file becomes genuinely unwieldy to browse or review.

Within a test file, order test functions to match the order their tested functions/methods appear in the source file. A reader (human or agent) scrolling `foo.go` alongside `foo_test.go` can then find the matching test by position instead of searching; drift between the two orderings compounds every time either file grows.

### Naming Conventions

```go
func TestAdd(t *testing.T) { ... }               // function test
func TestMyStruct_MyMethod(t *testing.T) { ... } // method test
func BenchmarkAdd(b *testing.B) { ... }          // benchmark
func ExampleAdd() { ... }                        // example
func FuzzAdd(f *testing.F) { ... }               // fuzz test
```

## Table-Driven Tests

Table-driven tests are the idiomatic Go way to test multiple scenarios. Always name each test case.

```go
func TestCalculatePrice(t *testing.T) {
    tests := []struct {
        name     string
        quantity int
        unitPrice float64
        expected  float64
    }{
        {
            name:      "single item",
            quantity:  1,
            unitPrice: 10.0,
            expected:  10.0,
        },
        {
            name:      "bulk discount - 100 items",
            quantity:  100,
            unitPrice: 10.0,
            expected:  900.0, // 10% discount
        },
        {
            name:      "zero quantity",
            quantity:  0,
            unitPrice: 10.0,
            expected:  0.0,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := CalculatePrice(tt.quantity, tt.unitPrice)
            if got != tt.expected {
                t.Errorf("CalculatePrice(%d, %.2f) = %.2f, want %.2f",
                    tt.quantity, tt.unitPrice, got, tt.expected)
            }
        })
    }
}
```

## Common Pitfall: Assert Scope Leaking into Subtests

Never create a testify `assert`/`require` instance in the parent test function and reuse it inside `t.Run` closures. `assert.New(t)` captures the exact `*testing.T` it was built with, so if that `t` belongs to the parent, every failure raised inside the subtest gets attributed to the _parent_ test in `go test` output — the failing subtest itself still reports `--- PASS`, silently hiding which case broke. This happens whether or not the subtest calls `t.Parallel()`.

```go
// WRONG -- `is` is bound to the parent's t
func TestCalculatePrice(t *testing.T) {
    is := assert.New(t)
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            is.Equal(tt.expected, CalculatePrice(tt.quantity, tt.unitPrice)) // misattributed on failure
        })
    }
}

// RIGHT -- each subtest builds its own instance from its own t
func TestCalculatePrice(t *testing.T) {
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            is := assert.New(t)
            is.Equal(tt.expected, CalculatePrice(tt.quantity, tt.unitPrice))
        })
    }
}
```

Verify with a deliberately-broken case: if `go test -v -run TestName` shows `--- FAIL: TestName` but every `--- PASS: TestName/subtest_name` line still says PASS, the assert scope is leaking.

## Unit Tests

Unit tests should be fast (< 1ms), isolated (no external dependencies), and deterministic.

## Testing HTTP Handlers

Use `httptest` for handler tests with table-driven patterns. See [HTTP Testing](./references/http-testing.md) for examples with request/response bodies, query parameters, headers, and status code assertions.

## Goroutine Leak Detection with goleak

Use `go.uber.org/goleak` to detect leaking goroutines, especially for concurrent code:

```go
import (
    "testing"
    "go.uber.org/goleak"
)

func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}
```

To exclude specific goroutine stacks (for known leaks or library goroutines):

```go
func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m,
        goleak.IgnoreCurrent(),
    )
}
```

Or per-test:

```go
func TestWorkerPool(t *testing.T) {
    defer goleak.VerifyNone(t)
    // ... test code ...
}
```

## testing/synctest for Deterministic Goroutine Testing

`testing/synctest` (Go 1.25+) provides deterministic tests for goroutines, timers, deadlines, and context cancellation. Time advances only when all goroutines are blocked, making ordering predictable.

When to use `synctest` instead of real time:

- Testing concurrent code with time-based operations (time.Sleep, time.After, time.Ticker)
- When race conditions need to be reproducible
- When tests are flaky due to timing issues

```go
import (
    "context"
    "testing"
    "testing/synctest"
    "time"
)

func TestContextTimeout(t *testing.T) {
    synctest.Test(t, func(t *testing.T) {
        const timeout = 5 * time.Second

        ctx, cancel := context.WithTimeout(t.Context(), timeout)
        defer cancel()

        time.Sleep(timeout - time.Nanosecond)
        synctest.Wait()
        if err := ctx.Err(); err != nil {
            t.Fatalf("before timeout: %v", err)
        }

        time.Sleep(time.Nanosecond)
        synctest.Wait()
        if err := ctx.Err(); err != context.DeadlineExceeded {
            t.Fatalf("after timeout: got %v, want DeadlineExceeded", err)
        }
    })
}
```

Use `synctest.Test` in Go 1.25+ and later. Do not use the old Go 1.24 experimental `synctest.Run` API in Go 1.25+ code. If a module explicitly targets Go 1.24 and opts into `GOEXPERIMENT=synctest`, use the old API only as a compatibility fallback.

Key differences in `synctest`:

- `time.Sleep` advances synthetic time instantly when the goroutine blocks
- `time.After` fires when synthetic time reaches the duration
- All goroutines run to blocking points before time advances
- Test execution is deterministic and repeatable
- Go 1.27+ adds `synctest.Sleep(d)` as a direct helper to advance the bubble's fake clock, equivalent to `time.Sleep(d)` followed by `synctest.Wait()` but without needing a real goroutine to block on

Go 1.27+ also adds `httptest.NewTestServer()`, an in-memory fake-network variant of `httptest.NewServer` that composes with `synctest` — no real socket, so server tests can run inside a `synctest.Test` bubble instead of needing `httptest.NewServer` plus real timers.

## Test Timeouts

For tests that may hang, use a timeout helper that panics with caller location. See [Helpers](./references/helpers.md).

## Benchmarks

Write benchmarks as sub-benchmarks (`b.Run` per variant) so each variant gets its own name in the output — that name is what comparison tooling diffs. For Go 1.24+, use `b.Loop()` rather than a `b.N` loop.

→ See [Benchmarks in a Test Suite](./references/benchmarks.md) for the code shape and size-parameterized examples.

→ See `samber/cc-skills-golang@golang-benchmark` skill for measurement methodology: `benchstat`, profiling from benchmarks, and CI regression detection.

## Go 1.26+: test artifacts

When a test, benchmark, or fuzz target needs to persist files for inspection, use `ArtifactDir()` instead of ad-hoc paths or repo-local output.

```go
func TestRenderGoldenArtifact(t *testing.T) {
    dir := t.ArtifactDir()

    out := filepath.Join(dir, "rendered.json")
    if err := os.WriteFile(out, renderedBytes, 0o644); err != nil {
        t.Fatal(err)
    }

    t.Logf("artifact written: %s", out)
}
```

Available on `*testing.T`, `*testing.B`, and `*testing.F` in Go 1.26+.

### Go 1.27+: `stdversion` runs automatically

`go test` now invokes the `stdversion` vet check by default, flagging any use of an API newer than the module's `go` directive. A CI failure from this check means either the `go` directive needs bumping or the code needs to stop using the newer API — it is not a check to silence.

## Parallel Tests

Use `t.Parallel()` to run tests concurrently:

```go
func TestParallelOperations(t *testing.T) {
    tests := []struct {
        name string
        data []byte
    }{
        {"small data", make([]byte, 1024)},
        {"medium data", make([]byte, 1024*1024)},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            is := assert.New(t)

            result := Process(tt.data)
            is.NotNil(result)
        })
    }
}
```

## Fuzzing

Use fuzzing to find edge cases and bugs:

```go
func FuzzReverse(f *testing.F) {
    f.Add("hello")
    f.Add("")
    f.Add("a")

    f.Fuzz(func(t *testing.T, input string) {
        reversed := Reverse(input)
        doubleReversed := Reverse(reversed)
        if input != doubleReversed {
            t.Errorf("Reverse(Reverse(%q)) = %q, want %q", input, doubleReversed, input)
        }
    })
}
```

## Examples as Documentation

`ExampleXxx` functions are executable documentation: `go test` compares their stdout to the `// Output:` comment, so a drifting example fails the build instead of misleading readers.

→ See [Examples as Documentation](./references/examples.md) for naming rules, `Unordered output`, and placement.

## Code Coverage

Generate a profile with `go test -coverprofile=coverage.out ./...`, then read the uncovered lines with `go tool cover -html=coverage.out`. Coverage locates untested paths; it does not measure assertion quality, so treat a percentage as a gap finder rather than a target.

→ See [Code Coverage](./references/coverage.md) for coverage modes, `-coverpkg`, and reporting pitfalls.

## Integration Tests

Use build tags to separate integration tests from unit tests:

```go
//go:build integration

package mypackage

func TestDatabaseIntegration(t *testing.T) {
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        t.Fatal(err)
    }
    defer db.Close()

    // Test real database operations
}
```

Run integration tests separately:

```bash
go test -tags=integration ./...
```

For Docker Compose fixtures, SQL schemas, and integration test suites, see [Integration Testing](./references/integration-testing.md).

## Mocking

Mock interfaces, not concrete types. Define interfaces where consumed, then create mock implementations.

For mock patterns, test fixtures, and time mocking, see [Mocking](./references/mocking.md).

## Enforce with Linters

Many test best practices are enforced automatically by linters: `thelper`, `paralleltest`, `testifylint`. See the `samber/cc-skills-golang@golang-lint` skill for configuration and usage.

## Cross-References

- → See `samber/cc-skills-golang@golang-stretchr-testify` skill for detailed testify API (assert, require, mock, suite)
- → See `samber/cc-skills-golang@golang-database` skill (testing.md) for database integration test patterns
- → See `samber/cc-skills-golang@golang-concurrency` skill for goroutine leak detection with goleak
- → See `samber/cc-skills-golang@golang-continuous-integration` skill for CI test configuration and GitHub Actions workflows
- → See `samber/cc-skills-golang@golang-lint` skill for testifylint and paralleltest configuration
- → See `samber/cc-skills-golang@golang-continuous-integration` skill for automated AI-driven code review in CI using these guidelines

## Quick Reference

```bash
go test ./...                          # all tests
go test -run TestName ./...            # specific test by exact name
go test -run TestName/subtest ./...    # subtests within a test
go test -run 'Test(Add|Sub)' ./...     # multiple tests (regexp OR)
go test -run 'Test[A-Z]' ./...         # tests starting with capital letter
go test -run 'TestUser.*' ./...        # tests matching prefix
go test -run '.*Validation.*' ./...    # tests containing substring
go test -run TestName/. ./...          # all subtests of TestName
go test -run '/(unit|integration)' ./... # filter by subtest name
go test -race ./...                    # race detection
go test -cover ./...                   # coverage summary
go test -bench=. -benchmem ./...       # benchmarks
go test -fuzz=FuzzName ./...           # fuzzing
go test -tags=integration ./...        # integration tests
```


## Source Reference: `golang-testing/references/benchmarks.md`

# Benchmarks in a Test Suite

Benchmarking methodology — `benchstat`, profiling from benchmarks, noise control, CI regression detection — belongs to the `samber/cc-skills-golang@golang-benchmark` skill. This page only covers writing a benchmark that sits next to the tests of the same package.

## Shape

```go
func BenchmarkStringConcatenation(b *testing.B) {
    b.Run("plus-operator", func(b *testing.B) {
        for b.Loop() {
            result := "a" + "b" + "c"
            _ = result
        }
    })

    b.Run("strings.Builder", func(b *testing.B) {
        for b.Loop() {
            var builder strings.Builder
            builder.WriteString("a")
            builder.WriteString("b")
            builder.WriteString("c")
            _ = builder.String()
        }
    })
}
```

Sub-benchmarks give each variant its own name in the output, which is what `benchstat` compares. A single benchmark mixing both variants produces one number and hides the difference.

## Varying input size

```go
func BenchmarkFibonacci(b *testing.B) {
    sizes := []int{10, 20, 30}
    for _, size := range sizes {
        b.Run(fmt.Sprintf("n=%d", size), func(b *testing.B) {
            b.ReportAllocs()
            for b.Loop() {
                Fibonacci(size)
            }
        })
    }
}
```

Size-parameterized sub-benchmarks expose complexity growth: a jump that outpaces the size increase points at a superlinear algorithm, which no single-size benchmark reveals.

## `b.Loop()` vs `b.N`

For Go 1.24+, write new benchmarks with `b.Loop()` — it keeps setup outside the timed region and prevents the compiler from optimizing the loop body away, the two failure modes that make `b.N` benchmarks report impossibly fast results. Use a legacy `b.N` loop only when the module targets Go <1.24 or when preserving existing benchmark code intentionally.

→ See `samber/cc-skills-golang@golang-benchmark` skill for measurement methodology and regression detection.


## Source Reference: `golang-testing/references/coverage.md`

# Code Coverage

Coverage measures which lines ran, not whether their behavior was asserted. Treat it as a gap finder — read the uncovered lines — not as a quality target to chase.

## Commands

```bash
# Generate coverage file
go test -coverprofile=coverage.out ./...

# View coverage in HTML (uncovered lines in red)
go tool cover -html=coverage.out

# Coverage by function
go tool cover -func=coverage.out

# Total coverage percentage
go tool cover -func=coverage.out | grep total

# Count how many times each statement ran, not just whether it ran
go test -covermode=count -coverprofile=coverage.out ./...

# Safe under -race (atomic counters)
go test -race -covermode=atomic -coverprofile=coverage.out ./...

# Attribute coverage of package A to tests living in package B
go test -coverpkg=./... ./...

# Coverage of a single package, printed inline
go test -cover ./internal/store
```

## Modes

| Mode | Records | Use when |
| --- | --- | --- |
| `set` | Statement executed (default) | Normal runs |
| `count` | Execution count per statement | Finding never-taken branches in hot paths |
| `atomic` | Count, race-safe | Any run combined with `-race` or `t.Parallel()` |

## Pitfalls

- **Per-package by default.** Without `-coverpkg`, a test in `api` exercising `store` reports nothing for `store`, making well-tested packages look untested.
- **Integration tests are invisible** unless the build tag is passed: `go test -tags=integration -coverprofile=...`.
- **Generated code inflates the number.** Exclude it before setting any threshold, otherwise the metric measures the generator.
- **A covered line is not an asserted line.** A test that calls a function and ignores its result reports 100% coverage and verifies nothing.

→ See `samber/cc-skills-golang@golang-continuous-integration` skill for wiring coverage reporting into CI.


## Source Reference: `golang-testing/references/examples.md`

# Examples as Documentation

Examples are executable documentation: `go test` runs them and compares stdout to the `// Output:` comment, and `pkg.go.dev` renders them next to the documented symbol. An example that drifts from the API fails the build, unlike a code block in a README.

```go
func ExampleCalculatePrice() {
    price := CalculatePrice(100, 10.0)
    fmt.Printf("Price: %.2f\n", price)
    // Output: Price: 900.00
}

func ExampleCalculatePrice_singleItem() {
    price := CalculatePrice(1, 25.50)
    fmt.Printf("Price: %.2f\n", price)
    // Output: Price: 25.50
}
```

## Naming

The suffix decides where godoc attaches the example, so a typo silently detaches it from its symbol:

| Function name               | Documents                          |
| --------------------------- | ---------------------------------- |
| `Example()`                 | The package itself                 |
| `ExampleCalculatePrice()`   | The `CalculatePrice` function      |
| `ExampleStore_Get()`        | The `Get` method of `Store`        |
| `ExampleStore_Get_cached()` | A named variant of the same method |

The suffix after the second underscore MUST start with a lowercase letter — otherwise Go reads it as a type or method name and the example is orphaned.

## Output directives

- `// Output:` — stdout MUST match exactly (leading/trailing whitespace is trimmed).
- `// Unordered output:` — lines may arrive in any order. Use it for map iteration and concurrent producers, which have no stable order.
- **No output comment** — the example is compiled but not run. Useful for code that needs a live dependency, but it stops verifying behavior, so prefer a real output assertion.

## Placement

Examples live in `_test.go` files. Put them in the `package foo_test` external test package: an example that only compiles against the exported API proves the public surface is usable, which is the point of the example.


## Source Reference: `golang-testing/references/helpers.md`

# Test Helpers

## Test Timeout

For tests that may hang, use a timeout helper that panics with caller location:

```go
// https://github.com/stretchr/testify/issues/1101
func testWithTimeout(t *testing.T, timeout time.Duration) {
    t.Helper()

    testFinished := make(chan struct{})
    t.Cleanup(func() {
        close(testFinished)
    })

    var pc [1]uintptr
    n := runtime.Callers(2, pc[:])
    line, funcName := "", ""
    if n > 0 {
        frames := runtime.CallersFrames(pc[:])
        frame, _ := frames.Next()
        line = frame.File + ":" + strconv.Itoa(frame.Line)
        funcName = frame.Function
    }

    go func() {
        select {
        case <-testFinished:
        case <-time.After(timeout):
            panic(fmt.Sprintf("%s: Test timed out after: %v\n%s", funcName, timeout, line))
        }
    }()
}

// Usage
func TestLongRunningOperation(t *testing.T) {
    testWithTimeout(t, 2*time.Second)
    result := LongRunningOperation()
    // If this takes longer than 2 seconds, the test panics with location info
}
```


## Source Reference: `golang-testing/references/http-testing.md`

# HTTP Handler Testing

Use `httptest` package for testing HTTP handlers without starting a server.

## Basic Handler Test

```go
func TestCreateUserHandler(t *testing.T) {
    tests := []struct {
        name           string
        body           string
        expectedStatus int
    }{
        {
            name:           "valid request",
            body:           `{"name": "Alice", "email": "alice@example.com"}`,
            expectedStatus: http.StatusCreated,
        },
        {
            name:           "invalid JSON",
            body:           `invalid json`,
            expectedStatus: http.StatusBadRequest,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            is := assert.New(t)

            req := httptest.NewRequest(http.MethodPost, "/users", strings.NewReader(tt.body))
            req.Header.Set("Content-Type", "application/json")

            w := httptest.NewRecorder()
            handler := http.HandlerFunc(CreateUserHandler)
            handler.ServeHTTP(w, req)

            is.Equal(tt.expectedStatus, w.Code)
        })
    }
}
```

## Query Parameters and Headers

```go
func TestListUsersHandler(t *testing.T) {
    tests := []struct {
        name           string
        query          string
        authHeader     string
        expectedStatus int
    }{
        {
            name:           "paginated results",
            query:          "?page=1&limit=10",
            authHeader:     "Bearer token123",
            expectedStatus: http.StatusOK,
        },
        {
            name:           "missing auth",
            query:          "?page=1",
            authHeader:     "",
            expectedStatus: http.StatusUnauthorized,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            is := assert.New(t)

            req := httptest.NewRequest(http.MethodGet, "/users"+tt.query, nil)
            if tt.authHeader != "" {
                req.Header.Set("Authorization", tt.authHeader)
            }

            w := httptest.NewRecorder()
            handler := AuthMiddleware(ListUsersHandler)
            handler.ServeHTTP(w, req)

            is.Equal(tt.expectedStatus, w.Code)
        })
    }
}
```


## Source Reference: `golang-testing/references/integration-testing.md`

# Integration Testing

## Table of Contents

- [Docker Compose Fixture](#docker-compose-fixture)
- [SQL Schema Fixture](#sql-schema-fixture)
- [Test Data Fixture](#test-data-fixture)
- [Using Fixtures in Tests](#using-fixtures-in-tests)
- [Test Helper with Embedded Fixtures](#test-helper-with-embedded-fixtures)

## Docker Compose Fixture

Create `pkg/myfeature/testdata/docker-compose.yml` for test services:

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
```

## SQL Schema Fixture

Create `pkg/myfeature/testdata/schema.sql` for database initialization:

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Test Data Fixture

Create `pkg/myfeature/testdata/testdata.sql`:

```sql
INSERT INTO users (name, email) VALUES
    ('Alice Johnson', 'alice@example.com'),
    ('Bob Smith', 'bob@example.com'),
    ('Charlie Brown', 'charlie@example.com');

INSERT INTO orders (user_id, amount, status) VALUES
    (1, 100.00, 'completed'),
    (1, 50.00, 'pending'),
    (2, 200.00, 'completed');
```

## Using Fixtures in Tests

```go
//go:build integration

package database_test

import (
    "database/sql"
    "os"
    "os/exec"
    "testing"
    "time"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/suite"
)

type DatabaseTestSuite struct {
    suite.Suite
    db *sql.DB
}

func (s *DatabaseTestSuite) SetupSuite() {
    cmd := exec.Command("docker-compose", "-f", "testdata/docker-compose.yml", "up", "-d")
    if err := cmd.Run(); err != nil {
        s.T().Fatalf("failed to start docker-compose: %v", err)
    }

    time.Sleep(5 * time.Second)

    db, err := sql.Open("postgres", "postgres://test:test@localhost:5433/testdb?sslmode=disable")
    if err != nil {
        s.T().Fatalf("failed to connect to database: %v", err)
    }
    s.db = db

    schema, _ := os.ReadFile("testdata/schema.sql")
    _, err = db.Exec(string(schema))
    if err != nil {
        s.T().Fatalf("failed to run schema: %v", err)
    }
}

func (s *DatabaseTestSuite) TearDownSuite() {
    cmd := exec.Command("docker-compose", "-f", "testdata/docker-compose.yml", "down", "-v")
    _ = cmd.Run()
}

func (s *DatabaseTestSuite) SetupTest() {
    _, err := s.db.Exec("TRUNCATE TABLE orders, users CASCADE")
    if err != nil {
        s.T().Fatalf("failed to clear database: %v", err)
    }

    testdata, _ := os.ReadFile("testdata/testdata.sql")
    _, err = s.db.Exec(string(testdata))
    if err != nil {
        s.T().Fatalf("failed to load test data: %v", err)
    }
}

func (s *DatabaseTestSuite) TestUserCount() {
    is := assert.New(s.T())

    var count int
    err := s.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
    is.NoError(err)
    is.Equal(3, count)
}

func (s *DatabaseTestSuite) TestOrderSum() {
    is := assert.New(s.T())

    var sum float64
    err := s.db.QueryRow("SELECT SUM(amount) FROM orders").Scan(&sum)
    is.NoError(err)
    is.InDelta(350.0, sum, 0.01)
}

func TestDatabaseTestSuite(t *testing.T) {
    suite.Run(t, new(DatabaseTestSuite))
}
```

## Test Helper with Embedded Fixtures

```go
package myfeature

import (
    "database/sql"
    "embed"
)

//go:embed testdata/schema.sql testdata/testdata.sql
var fixtures embed.FS

func SetupDB(db *sql.DB) error {
    schema, err := fixtures.ReadFile("testdata/schema.sql")
    if err != nil {
        return err
    }
    if _, err := db.Exec(string(schema)); err != nil {
        return err
    }

    data, err := fixtures.ReadFile("testdata/testdata.sql")
    if err != nil {
        return err
    }
    if _, err := db.Exec(string(data)); err != nil {
        return err
    }
    return nil
}
```


## Source Reference: `golang-testing/references/mocking.md`

# Mocking and Test Fixtures

## Table of Contents

- [Mocks with testify/mock](#mocks-with-testifymock)
- [Mock Organization](#mock-organization)
- [Test Fixtures](#test-fixtures)
- [Time Mocking](#time-mocking)

## Mocks with testify/mock

Create interfaces for your dependencies, then mock them.

> For the full testify/mock API (argument matchers, call modifiers, verification), see the `samber/cc-skills-golang@golang-stretchr-testify` skill.

```go
// Define the interface
type Database interface {
    GetUser(id string) (*User, error)
    CreateUser(user *User) error
}

// Mock implementation
type MockDatabase struct {
    mock.Mock
}

func (m *MockDatabase) GetUser(id string) (*User, error) {
    args := m.Called(id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

func (m *MockDatabase) CreateUser(user *User) error {
    args := m.Called(user)
    return args.Error(0)
}

// Usage in tests
func TestService_GetUser(t *testing.T) {
    is := assert.New(t)

    mockDB := new(MockDatabase)
    service := NewService(mockDB)

    expectedUser := &User{ID: "1", Name: "John"}
    mockDB.On("GetUser", "1").Return(expectedUser, nil)

    user, err := service.GetUser("1")

    is.NoError(err)
    is.Equal(expectedUser, user)
    mockDB.AssertExpectations(t)
}

func TestService_GetUser_NotFound(t *testing.T) {
    is := assert.New(t)

    mockDB := new(MockDatabase)
    service := NewService(mockDB)

    mockDB.On("GetUser", "999").Return(nil, ErrNotFound)

    user, err := service.GetUser("999")

    is.Error(err)
    is.ErrorIs(err, ErrNotFound)
    is.Nil(user)
    mockDB.AssertExpectations(t)
}
```

## Mock Organization

For larger codebases, organize mocks alongside the code they mock:

```go
// user_service.go
type UserService struct {
    db    Database
    email EmailService
}
type Database interface {
    GetUser(id string) (*User, error)
    CreateUser(user *User) error
}
type EmailService interface {
    SendWelcomeEmail(to string) error
}
```

```go
// user_service_test.go
package mypackage_test

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "path/to/mypackage"
)

// MockDatabase implements mypackage.Database
type MockDatabase struct {
    mock.Mock
}
func (m *MockDatabase) GetUser(id string) (*mypackage.User, error) {
    args := m.Called(id)
    if args.Get(0) == nil { return nil, args.Error(1) }
    return args.Get(0).(*mypackage.User), args.Error(1)
}
func (m *MockDatabase) CreateUser(user *mypackage.User) error {
    return m.Called(user).Error(0)
}

// MockEmailService implements mypackage.EmailService
type MockEmailService struct {
    mock.Mock
}
func (m *MockEmailService) SendWelcomeEmail(to string) error {
    return m.Called(to).Error(0)
}

func TestUserService_CreateUser(t *testing.T) {
    mockDB := new(MockDatabase)
    mockEmail := new(MockEmailService)
    service := mypackage.NewUserService(mockDB, mockEmail)

    user := &mypackage.User{Name: "Test", Email: "test@example.com"}
    mockDB.On("CreateUser", user).Return(nil)
    mockEmail.On("SendWelcomeEmail", "test@example.com").Return(nil)

    err := service.CreateUser(user)

    assert.NoError(t, err)
    mockDB.AssertExpectations(t)
    mockEmail.AssertExpectations(t)
}
```

## Test Fixtures

Create reusable test data in a separate package or file:

```go
package fixtures

import "time"

var (
    DefaultUser = &User{
        ID:        "user-123",
        Name:      "Jane Doe",
        Email:     "jane@example.com",
        CreatedAt: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
    }

    AdminUser = &User{
        ID:        "admin-1",
        Name:      "Admin User",
        Email:     "admin@example.com",
        Role:      "admin",
        CreatedAt: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
    }
)

func NewUser(name, email string) *User {
    return &User{
        ID:        "user-" + uuid.New().String(),
        Name:      name,
        Email:     email,
        CreatedAt: time.Now(),
    }
}
```

## Time Mocking

Use `clockwork` to test time-dependent code without `time.Sleep()`:

```go
import (
    "testing"
    "time"
    "github.com/jonboulle/clockwork"
    "github.com/stretchr/testify/assert"
)

func TestScheduler_AddJob(t *testing.T) {
    is := assert.New(t)

    fakeClock := clockwork.NewFakeClock()
    scheduler := NewScheduler(fakeClock)

    job := &Job{ID: "1", RunAt: time.Now().Add(1 * time.Hour)}
    scheduler.AddJob(job)

    is.Equal(1, scheduler.PendingCount())

    // Advance fake time
    fakeClock.Advance(2 * time.Hour)

    is.Equal(0, scheduler.PendingCount())
}
```

Install clockwork:

```bash
go get github.com/jonboulle/clockwork
```
