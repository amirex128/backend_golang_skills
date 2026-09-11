# GoFr-Golang: Testify

## GoFr adaptation rules

This is the GoFr-specific form of the general Golang guidance below. Use GoFr as the mandatory framework for service delivery: begin services with `gofr.New()`, keep GoFr lifecycle, configuration, health, structured logging, Prometheus metrics, OpenTelemetry tracing, datasource management, and graceful shutdown intact, and never silently replace GoFr with another web framework. Use the exact GoFr version installed by the project and verify version-sensitive APIs against the project module and official GoFr documentation.

Keep GoFr types at the adapter boundary. GoFr HTTP, gRPC, GraphQL, WebSocket, cron, and CLI handlers use the documented `func(c *gofr.Context) (any, error)` shape where applicable. Bind with `c.Bind(&value)` and check the error; read route parameters with `c.PathParam`, query values with `c.Param`, and return values/errors to GoFr instead of recreating response envelopes. Pass `*gofr.Context` through GoFr datasource/downstream calls for cancellation and trace propagation, but translate to application contracts before entering domain code.

The complete GoFr page set remains in the repository's `skills/gofr` Skill. Read the listed official pages there before implementing the relevant feature; these links are the authoritative framework-specific follow-up for this adapted reference.

## GoFr adaptation rules

Apply GoFr lifecycle, context, configuration, datasource, error, health, and observability conventions to this topic while preserving the Clean Architecture dependency rule.

## Required GoFr references

- `references-testing.md` — https://gofr.dev/docs/references/testing
- `references-context.md` — https://gofr.dev/docs/references/context
- `quick-start-add-rest-handlers.md` — https://gofr.dev/docs/quick-start/add-rest-handlers

## Unified Golang guidance

# Testify

This reference consolidates all retained guidance from `golang-stretchr-testify`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Persona:** You are a Go engineer who treats tests as executable specifications. You write tests to constrain behavior and make failures self-explanatory — not to hit coverage targets.

**Modes:**

- **Write mode** — adding new tests or mocks to a codebase.
- **Review mode** — auditing existing test code for testify misuse.

# stretchr/testify

testify complements Go's `testing` package with readable assertions, mocks, and suites. It does not replace `testing` — always use `*testing.T` as the entry point.

This skill is not exhaustive — refer to library documentation and code examples for more information:

- For Go package docs, symbols, versions, importers, and known vulnerabilities, → See `samber/cc-skills-golang@golang-pkg-go-dev` skill (`godig`), preferred over Context7 for Go package facts.
- To navigate this library's usage in your own code (definitions, call sites, diagnostics), → See `samber/cc-skills-golang@golang-gopls` skill (`gopls`).
- Context7 remains a fallback for docs not indexed on pkg.go.dev.

## assert vs require

Both offer identical assertions. The difference is failure behavior:

- **assert**: records failure, continues — see all failures at once
- **require**: calls `t.FailNow()` — use for preconditions where continuing would panic or mislead

Use `assert.New(t)` / `require.New(t)` for readability. Name them `is` and `must`:

```go
func TestParseConfig(t *testing.T) {
    is := assert.New(t)
    must := require.New(t)

    cfg, err := ParseConfig("testdata/valid.yaml")
    must.NoError(err)    // stop if parsing fails — cfg would be nil
    must.NotNil(cfg)

    is.Equal("production", cfg.Environment)
    is.Equal(8080, cfg.Port)
    is.True(cfg.TLS.Enabled)
}
```

**Rule**: `require` for preconditions (setup, error checks), `assert` for verifications. Never mix randomly.

## Core Assertions

```go
is := assert.New(t)

// Equality
is.Equal(expected, actual)              // DeepEqual + exact type
is.NotEqual(unexpected, actual)
is.EqualValues(expected, actual)        // converts to common type first
is.EqualExportedValues(expected, actual)

// Nil / Bool / Emptiness
is.Nil(obj)                  is.NotNil(obj)
is.True(cond)                is.False(cond)
is.Empty(collection)         is.NotEmpty(collection)
is.Len(collection, n)

// Contains (strings, slices, map keys)
is.Contains("hello world", "world")
is.Contains([]int{1, 2, 3}, 2)
is.Contains(map[string]int{"a": 1}, "a")

// Comparison
is.Greater(actual, threshold)     is.Less(actual, ceiling)
is.Positive(val)                  is.Negative(val)
is.Zero(val)

// Errors
is.Error(err)                     is.NoError(err)
is.ErrorIs(err, ErrNotFound)      // walks error chain
is.ErrorAs(err, &target)
is.ErrorContains(err, "not found")

// Type
is.IsType(&User{}, obj)
is.Implements((*io.Reader)(nil), obj)
```

**Argument order**: always `(expected, actual)` — swapping produces confusing diff output.

## Advanced Assertions

```go
is.ElementsMatch([]string{"b", "a", "c"}, result)             // unordered comparison
is.InDelta(3.14, computedPi, 0.01)                            // float tolerance
is.JSONEq(`{"name":"alice"}`, `{"name": "alice"}`)             // ignores whitespace/key order
is.WithinDuration(expected, actual, 5*time.Second)
is.Regexp(`^user-[a-f0-9]+$`, userID)

// Async polling
is.Eventually(func() bool {
    status, _ := client.GetJobStatus(jobID)
    return status == "completed"
}, 5*time.Second, 100*time.Millisecond)

// Async polling with rich assertions
is.EventuallyWithT(func(c *assert.CollectT) {
    resp, err := client.GetOrder(orderID)
    assert.NoError(c, err)
    assert.Equal(c, "shipped", resp.Status)
}, 10*time.Second, 500*time.Millisecond)
```

## testify/mock

Mock interfaces to isolate the unit under test. Embed `mock.Mock`, implement methods with `m.Called()`, always verify with `AssertExpectations(t)`.

Key matchers: `mock.Anything`, `mock.AnythingOfType("T")`, `mock.MatchedBy(func)`. Call modifiers: `.Once()`, `.Times(n)`, `.Maybe()`, `.Run(func)`.

For defining mocks, argument matchers, call modifiers, return sequences, and verification, see [Mock reference](./references/mock.md).

## testify/suite

Suites group related tests with shared setup/teardown.

### Lifecycle

```
SetupSuite()    → once before all tests
  SetupTest()   → before each test
    TestXxx()
  TearDownTest() → after each test
TearDownSuite() → once after all tests
```

### Example

```go
type TokenServiceSuite struct {
    suite.Suite
    store   *MockTokenStore
    service *TokenService
}

func (s *TokenServiceSuite) SetupTest() {
    s.store = new(MockTokenStore)
    s.service = NewTokenService(s.store)
}

func (s *TokenServiceSuite) TestGenerate_ReturnsValidToken() {
    s.store.On("Save", mock.Anything, mock.Anything).Return(nil)
    token, err := s.service.Generate("user-42")
    s.NoError(err)
    s.NotEmpty(token)
    s.store.AssertExpectations(s.T())
}

// Required launcher
func TestTokenServiceSuite(t *testing.T) {
    suite.Run(t, new(TokenServiceSuite))
}
```

Suite methods like `s.Equal()` behave like `assert`. For require: `s.Require().NotNil(obj)`.

## Common Mistakes

- **Forgetting `AssertExpectations(t)`** — mock expectations silently pass without verification
- **`is.Equal(ErrNotFound, err)`** — fails on wrapped errors. Use `is.ErrorIs` to walk the chain
- **Swapped argument order** — testify assumes `(expected, actual)`. Swapping produces backwards diffs
- **`assert` for guards** — test continues after failure and panics on nil dereference. Use `require`
- **Missing `suite.Run()`** — without the launcher function, zero tests execute silently
- **Comparing pointers** — `is.Equal(ptr1, ptr2)` compares addresses. Dereference or use `EqualExportedValues`

## Linters

Use `testifylint` to catch wrong argument order, assert/require misuse, and more. See `samber/cc-skills-golang@golang-lint` skill.

## Cross-References

- → See `samber/cc-skills-golang@golang-testing` skill for general test patterns, table-driven tests, and CI
- → See `samber/cc-skills-golang@golang-lint` skill for testifylint configuration


## Source Reference: `golang-stretchr-testify/references/mock.md`

# testify/mock — Reference

Mock interfaces to isolate the unit under test. Embed `mock.Mock`, implement methods with `m.Called()`, and always verify with `AssertExpectations(t)`.

## Quick example

```go
type MockSender struct { mock.Mock }

func (m *MockSender) Send(ctx context.Context, to string, msg Message) error {
    return m.Called(ctx, to, msg).Error(0)
}

func TestOrderService_Place(t *testing.T) {
    is := assert.New(t)
    m := new(MockSender)
    m.On("Send", mock.Anything, "buyer@example.com", mock.AnythingOfType("Message")).Return(nil)

    err := NewOrderService(m).Place(context.Background(), order)

    is.NoError(err)
    m.AssertExpectations(t)
}
```

## Defining a mock

```go
type NotificationSender interface {
    Send(ctx context.Context, to string, msg Message) error
    BatchSend(ctx context.Context, recipients []string, msg Message) (int, error)
}

type MockNotificationSender struct { mock.Mock }

func (m *MockNotificationSender) Send(ctx context.Context, to string, msg Message) error {
    return m.Called(ctx, to, msg).Error(0)
}

func (m *MockNotificationSender) BatchSend(ctx context.Context, recipients []string, msg Message) (int, error) {
    args := m.Called(ctx, recipients, msg)
    return args.Int(0), args.Error(1)
}
```

## Argument matchers

```go
// mock.Anything — matches any value
m.On("Send", mock.Anything, mock.Anything, mock.Anything).Return(nil)

// mock.AnythingOfType — matches by type name
m.On("Send", mock.Anything, mock.AnythingOfType("string"), mock.Anything).Return(nil)

// mock.MatchedBy — custom predicate
m.On("Send", mock.Anything, mock.MatchedBy(func(to string) bool {
    return strings.HasSuffix(to, "@example.com")
}), mock.Anything).Return(nil)
```

## Call modifiers

```go
m.On("Send", mock.Anything, mock.Anything, mock.Anything).Return(nil).Once()     // exactly 1 call
m.On("Send", mock.Anything, mock.Anything, mock.Anything).Return(nil).Times(3)   // exactly 3 calls
m.On("Send", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()    // optional

// Side effects
m.On("Send", mock.Anything, mock.Anything, mock.Anything).
    Run(func(args mock.Arguments) {
        msg := args.Get(2).(Message)
        t.Logf("mock received: %s", msg.Subject)
    }).Return(nil)
```

## Different returns per call

```go
// First call returns error, second succeeds (retry testing)
m.On("Send", mock.Anything, mock.Anything, mock.Anything).Return(errors.New("timeout")).Once()
m.On("Send", mock.Anything, mock.Anything, mock.Anything).Return(nil).Once()
```

## Removing expectations

```go
call := m.On("Send", mock.Anything, mock.Anything, mock.Anything).Return(nil)
call.Unset()
m.On("Send", mock.Anything, mock.Anything, mock.Anything).Return(errors.New("fail"))
```

## Verification

```go
m.AssertExpectations(t)                                                          // verify all expectations
m.AssertCalled(t, "Send", mock.Anything, "buyer@example.com", mock.Anything)     // specific call made
m.AssertNotCalled(t, "BatchSend", mock.Anything, mock.Anything, mock.Anything)   // specific call NOT made
m.AssertNumberOfCalls(t, "Send", 2)                                              // exact call count
```

