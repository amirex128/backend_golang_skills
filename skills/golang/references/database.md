# Database

This reference consolidates all retained guidance from `golang-database`. Read it for the matching Go engineering task.


## Source Skill Guidance

**Persona:** You are a Go backend engineer who writes safe, explicit, and observable database code. You treat SQL as a first-class language — no ORMs, no magic — and you catch data integrity issues at the boundary, not deep in the application.

**Modes:**

- **Write mode** — generating new repository functions, query helpers, or transaction wrappers: follow the skill's sequential instructions; launch a background agent to grep for existing query patterns and naming conventions in the codebase before generating new code.
- **Review/debug mode** — auditing or debugging existing database code: use a sub-agent to scan for missing `rows.Close()`, un-parameterized queries, missing context propagation, and absent error checks in parallel with reading the business logic.

> **Community default.** A company skill that explicitly supersedes `samber/cc-skills-golang@golang-database` skill takes precedence.

# Go Database Best Practices

Go's `database/sql` provides a solid foundation for database access. Use `sqlx` or `pgx` on top of it for ergonomics — never an ORM.

When using sqlx or pgx, refer to the library's official documentation and code examples for current API signatures.

## Best Practices Summary

1. **Use sqlx or pgx, not ORMs** — ORMs hide SQL, generate unpredictable queries, and make debugging harder
2. Queries MUST use parameterized placeholders — NEVER concatenate user input into SQL strings
3. Context MUST be passed to all database operations — use `*Context` method variants (`QueryContext`, `ExecContext`, `GetContext`)
4. `sql.ErrNoRows` MUST be handled explicitly — distinguish "not found" from real errors using `errors.Is`
5. Rows MUST be closed after iteration — `defer rows.Close()` immediately after `QueryContext` calls
6. NEVER use `db.Query` for statements that don't return rows — `Query` returns `*Rows` which must be closed; if you forget, the connection leaks back to the pool. Use `db.Exec` instead
7. **Use transactions for multi-statement operations** — wrap related writes in `BeginTxx`/`Commit`
8. **Use `SELECT ... FOR UPDATE`** when reading data you intend to modify — prevents race conditions
9. **Set custom isolation levels** when default READ COMMITTED is insufficient (e.g., serializable for financial operations)
10. **Handle NULLable columns** with pointer fields (`*string`, `*int`) or `sql.NullXxx` types
11. Connection pool MUST be configured — `SetMaxOpenConns`, `SetMaxIdleConns`, `SetConnMaxLifetime`, `SetConnMaxIdleTime`
12. **Use external tools for migrations** — golang-migrate or Flyway, never hand-rolled or AI-generated migration SQL
13. **Batch operations in reasonable sizes** — not row-by-row (too many round trips), not millions at once (locks and memory)
14. **Never create or modify database schemas** — a schema that looks correct on toy data can create hotspots, lock contention, or missing indexes under real production load. Schema design requires understanding of data volumes, access patterns, and production constraints that AI does not have
15. **Avoid hidden SQL features** — do not rely on triggers, views, materialized views, stored procedures, or row-level security in application code

## Library Choice

| Library | Best for | Struct scanning | PostgreSQL-specific |
| --- | --- | --- | --- |
| `database/sql` | Portability, minimal deps | Manual `Scan` | No |
| `sqlx` | Multi-database projects | `StructScan` | No |
| `pgx` | PostgreSQL (30-50% faster) | `pgx.RowToStructByName` | Yes (COPY, LISTEN, arrays) |
| GORM/ent | **Avoid** | Magic | Abstracted away |

**Why NOT ORMs:**

- Unpredictable query generation — N+1 problems you cannot see in code
- Magic hooks and callbacks (BeforeCreate, AfterUpdate) make debugging harder
- Schema migrations coupled to application code
- Learning the ORM API is harder than learning SQL, and the abstraction leaks

## Parameterized Queries

```go
// ✗ VERY BAD — SQL injection vulnerability
query := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email)

// ✓ Good — parameterized (PostgreSQL)
var user User
err := db.GetContext(ctx, &user, "SELECT id, name, email FROM users WHERE email = $1", email)

// ✓ Good — parameterized (MySQL)
err := db.GetContext(ctx, &user, "SELECT id, name, email FROM users WHERE email = ?", email)
```

### Dynamic IN clauses

```go
query, args, err := sqlx.In("SELECT * FROM users WHERE id IN (?)", ids)
if err != nil {
    return fmt.Errorf("building IN clause: %w", err)
}
query = db.Rebind(query) // adjust placeholders for your driver
err = db.SelectContext(ctx, &users, query, args...)
```

### Dynamic column names

Never interpolate column names from user input. Use an allowlist:

```go
allowed := map[string]bool{"name": true, "email": true, "created_at": true}
if !allowed[sortCol] {
    return fmt.Errorf("invalid sort column: %s", sortCol)
}
query := fmt.Sprintf("SELECT id, name, email FROM users ORDER BY %s", sortCol)
```

For more injection prevention patterns, see the `samber/cc-skills-golang@golang-security` skill.

## Struct Scanning and NULLable Columns

Use `db:"column_name"` tags for sqlx, `pgx.CollectRows` with `pgx.RowToStructByName` for pgx. Handle NULLable columns with pointer fields (`*string`, `*time.Time`) — they work cleanly with both scanning and JSON marshaling. See [Scanning Reference](./references/scanning.md) for examples of all approaches.

## Error Handling

```go
func GetUser(id string) (*User, error) {
    var user User

    err := db.GetContext(ctx, &user, "SELECT id, name FROM users WHERE id = $1", id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, ErrUserNotFound // translate to domain error
        }
        return nil, fmt.Errorf("querying user %s: %w", id, err)
    }

    return &user, nil
}
```

or:

```go
func GetUser(id string) (u *User, exists bool, err error) {
    var user User

    err := db.GetContext(ctx, &user, "SELECT id, name FROM users WHERE id = $1", id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, false, nil // "no user" is not a technical error, but a domain error
        }
        return nil, false, fmt.Errorf("querying user %s: %w", id, err)
    }

    return &user, true, nil
}
```

### Always close rows

```go
rows, err := db.QueryContext(ctx, "SELECT id, name FROM users")
if err != nil {
    return fmt.Errorf("querying users: %w", err)
}
defer rows.Close() // prevents connection leaks

for rows.Next() {
    // ...
}
if err := rows.Err(); err != nil { // always check after iteration
    return fmt.Errorf("iterating users: %w", err)
}
```

### Common database error patterns

| Error | How to detect | Action |
| --- | --- | --- |
| Row not found | `errors.Is(err, sql.ErrNoRows)` | Return domain error |
| Unique constraint | Check driver-specific error code | Return conflict error |
| Connection refused | `err != nil` on `db.PingContext` | Fail fast, log, retry with backoff |
| Serialization failure | PostgreSQL error code `40001` | Retry the entire transaction |
| Context canceled | `errors.Is(err, context.Canceled)` | Stop processing, propagate |

## Context Propagation

Always use the `*Context` method variants to propagate deadlines and cancellation:

```go
// ✗ Bad — no context, query runs until completion even if client disconnects
db.Query("SELECT ...")

// ✓ Good — respects context cancellation and timeouts
db.QueryContext(ctx, "SELECT ...")
```

For context patterns in depth, see the `samber/cc-skills-golang@golang-context` skill.

## Transactions, Isolation Levels, and Locking

For transaction patterns, isolation levels, `SELECT FOR UPDATE`, and locking variants, see [Transactions](./references/transactions.md).

## Connection Pool

```go
db.SetMaxOpenConns(25)              // limit total connections
db.SetMaxIdleConns(10)              // keep warm connections ready
db.SetConnMaxLifetime(5 * time.Minute)  // recycle stale connections
db.SetConnMaxIdleTime(1 * time.Minute)  // close idle connections faster
```

For sizing guidance and formulas, see [Database Performance](./references/performance.md).

## Migrations

Use an external migration tool. Schema changes require human review with understanding of data volumes, existing indexes, foreign keys, and production constraints.

Recommended tools:

- [golang-migrate](https://github.com/golang-migrate/migrate) — CLI + Go library, supports all major databases
- [Flyway](https://flywaydb.org/) — JVM-based, widely used in enterprise environments
- [Atlas](https://atlasgo.io/) — modern, declarative schema management

Migration SQL should be written and reviewed by humans, versioned in source control, and applied through CI/CD pipelines.

## Avoid Hidden SQL Features

Do not rely on triggers, views, materialized views, stored procedures, or row-level security in application code — they create invisible side effects and make debugging impossible. Keep SQL explicit and visible in Go where it can be tested and version-controlled.

## Schema Creation

**This skill does NOT cover schema creation.** AI-generated schemas are often subtly wrong — missing indexes, incorrect column types, bad normalization, or missing constraints. Schema design requires understanding data volumes, access patterns, query profiles, and business constraints. Use dedicated database tooling and human review.

## Deep Dives

- **[Transactions](./references/transactions.md)** — Transaction boundaries, isolation levels, deadlock prevention, `SELECT FOR UPDATE`
- **[Testing Database Code](./references/testing.md)** — Mock connections, integration tests with containers, fixtures, schema setup/teardown
- **[Database Performance](./references/performance.md)** — Connection pool sizing, batch processing, indexing strategy, query optimization
- **[Struct Scanning](./references/scanning.md)** — Struct tags, NULLable column handling, JSON marshaling patterns

## Cross-References

- → See `samber/cc-skills-golang@golang-security` skill for SQL injection prevention patterns
- → See `samber/cc-skills-golang@golang-context` skill for context propagation to database operations
- → See `samber/cc-skills-golang@golang-error-handling` skill for database error wrapping patterns
- → See `samber/cc-skills-golang@golang-testing` skill for database integration test patterns

## References

- [database/sql tutorial](https://go.dev/doc/database/)
- [sqlx](https://github.com/jmoiron/sqlx)
- [pgx](https://github.com/jackc/pgx)
- [golang-migrate](https://github.com/golang-migrate/migrate)


## Source Reference: `golang-database/references/performance.md`

# Database Performance

## Table of Contents

- [Connection Pool Sizing](#connection-pool-sizing)
  - [Configuration](#configuration)
  - [Monitoring](#monitoring)
  - [Prometheus Metrics](#prometheus-metrics)
- [Batch Processing](#batch-processing)
  - [Sweet spot: 100–1,000 rows per batch](#sweet-spot-1001000-rows-per-batch)
  - [Batch INSERT with sqlx](#batch-insert-with-sqlx)
  - [Bulk INSERT with pgx (PostgreSQL COPY protocol)](#bulk-insert-with-pgx-postgresql-copy-protocol)
  - [Cursor-based pagination (avoid OFFSET)](#cursor-based-pagination-avoid-offset)
- [Indexing Strategy](#indexing-strategy)
  - [Use SQL MCP to check existing indexes](#use-sql-mcp-to-check-existing-indexes)
  - [When to suggest adding indexes](#when-to-suggest-adding-indexes)
  - [When to suggest removing indexes](#when-to-suggest-removing-indexes)
- [Query Performance Tips](#query-performance-tips)

## Connection Pool Sizing

### Configuration

```go
db, err := sqlx.Connect("postgres", dsn)
if err != nil {
    return fmt.Errorf("connecting to database: %w", err)
}

db.SetMaxOpenConns(25)                  // total connections (match your DB capacity)
db.SetMaxIdleConns(10)                  // keep connections warm, reduce handshake overhead
db.SetConnMaxLifetime(5 * time.Minute)  // recycle connections (DNS changes, server restarts)
db.SetConnMaxIdleTime(1 * time.Minute)  // release idle connections back to the pool
```

| Setting | Too low | Too high |
| --- | --- | --- |
| `MaxOpenConns` | Requests queue waiting for conn | DB overwhelmed, context switches |
| `MaxIdleConns` | Cold connections, slow queries | Wasted memory holding idle conns |
| `ConnMaxLifetime` | Frequent reconnection overhead | Stale connections after failover |
| `ConnMaxIdleTime` | Same as MaxIdleConns too low | Idle conns consume server memory |

### Monitoring

Check pool stats in production to detect exhaustion:

```go
stats := db.Stats()
slog.Info("db pool",
    "open", stats.OpenConnections,
    "in_use", stats.InUse,
    "idle", stats.Idle,
    "wait_count", stats.WaitCount,        // total waits for a connection
    "wait_duration", stats.WaitDuration,  // total wait time
)
```

If `WaitCount` keeps climbing, increase `MaxOpenConns` or optimize slow queries.

### Prometheus Metrics

Use a custom Prometheus collector to export pool metrics on-demand (scales to multiple pools automatically):

```go
type DBCollector struct {
    pools map[string]*sqlx.DB
}

func NewDBCollector(pools map[string]*sqlx.DB) *DBCollector {
    return &DBCollector{pools: pools}
}

func (c *DBCollector) Describe(ch chan<- *prometheus.Desc) {
    ch <- prometheus.NewDesc("db_open_connections", "Number of open connections", []string{"pool"}, nil)
    ch <- prometheus.NewDesc("db_in_use_connections", "Connections currently in use", []string{"pool"}, nil)
    ch <- prometheus.NewDesc("db_idle_connections", "Idle connections in pool", []string{"pool"}, nil)
    ch <- prometheus.NewDesc("db_total_latency_seconds", "Total latency for a connection", []string{"pool"}, nil)
}

func (c *DBCollector) Collect(ch chan<- prometheus.Metric) {
    for poolName, db := range c.pools {
        stats := db.Stats()

        ch <- prometheus.MustNewConstMetric(
            prometheus.NewDesc("db_open_connections", "Number of open connections", []string{"pool"}, nil),
            prometheus.GaugeValue, float64(stats.OpenConnections), poolName)

        ch <- prometheus.MustNewConstMetric(
            prometheus.NewDesc("db_in_use_connections", "Connections currently in use", []string{"pool"}, nil),
            prometheus.GaugeValue, float64(stats.InUse), poolName)

        ch <- prometheus.MustNewConstMetric(
            prometheus.NewDesc("db_idle_connections", "Idle connections in pool", []string{"pool"}, nil),
            prometheus.GaugeValue, float64(stats.Idle), poolName)

        ch <- prometheus.MustNewConstMetric(
            prometheus.NewDesc("db_wait_duration_seconds_total", "Total connection wait duration", []string{"pool"}, nil),
            prometheus.CounterValue, stats.WaitDuration.Seconds(), poolName)
    }
}

func init() {
    pools := map[string]*sqlx.DB{
        "primary": mainDB,
        "replica": replicaDB,
    }
    prometheus.MustRegister(NewDBCollector(pools))
}
```

**Collector advantages:**

- Metrics are collected on-demand during scrapes (no background goroutine)
- Always returns current state (no stale data between scrapes)
- Scales to multiple pools automatically
- Lower memory footprint (no metric state in memory)

**Alert thresholds:**

- Open connections approaching `MaxOpenConns` → risk of request queuing
- Wait count climbing steadily → pool is exhausted, increase `MaxOpenConns`
- Idle connections too high → reduce `MaxIdleConns` or lower `ConnMaxIdleTime`

## Batch Processing

Avoid two extremes:

- **Row-by-row** — N round trips for N rows, extremely slow
- **One giant batch** — locks tables, consumes memory, can timeout and block other queries

### Sweet spot: 100–1,000 rows per batch

Adjust based on row size and database load. Larger rows → smaller batches.

### Batch INSERT with sqlx

```go
func insertUsersBatch(ctx context.Context, db *sqlx.DB, users []User) error {
    const batchSize = 500
    for i := 0; i < len(users); i += batchSize {
        end := min(i+batchSize, len(users))
        batch := users[i:end]

        _, err := db.NamedExecContext(ctx, `INSERT INTO users (name, email) VALUES (:name, :email)`, batch)
        if err != nil {
            return fmt.Errorf("inserting users batch %d-%d: %w", i, end, err)
        }
    }
    return nil
}
```

### Bulk INSERT with pgx (PostgreSQL COPY protocol)

For maximum throughput on PostgreSQL, use `pgx.CopyFrom` which uses the binary COPY protocol — significantly faster than multi-row INSERT:

```go
rows := make([][]any, len(users))
for i, u := range users {
    rows[i] = []any{u.Name, u.Email}
}
_, err := pool.CopyFrom(ctx,
    pgx.Identifier{"users"},
    []string{"name", "email"},
    pgx.CopyFromRows(rows),
)
```

### Cursor-based pagination (avoid OFFSET)

For reading large datasets, use cursor-based pagination instead of `OFFSET`. OFFSET re-scans skipped rows, getting slower as you paginate deeper:

```go
// ✗ Bad — OFFSET re-scans rows, O(offset + limit)
SELECT * FROM events ORDER BY created_at LIMIT 100 OFFSET 10000

// ✓ Good — cursor-based, O(limit) regardless of depth
SELECT * FROM events WHERE created_at > $1 ORDER BY created_at LIMIT 100
```

## Indexing Strategy

**Never create or drop indexes yourself.** Index changes affect production query performance and write throughput. Always suggest to the developer and let them decide.

### Use SQL MCP to check existing indexes

When a SQL MCP tool is available, query the database to check existing indexes before suggesting new ones:

```sql
-- PostgreSQL: list indexes on a table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users';

-- Check for unused indexes (low scan count relative to writes)
SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan < 10
ORDER BY idx_scan;
```

### When to suggest adding indexes

- Foreign key columns (PostgreSQL does NOT auto-index foreign keys)
- Columns frequently used in `WHERE`, `JOIN`, or `ORDER BY`
- Composite indexes for multi-column queries (leftmost column is most selective)
- Partial indexes for filtered queries (`WHERE active = true`)

### When to suggest removing indexes

- Indexes with near-zero `idx_scan` count (nobody reads them)
- Duplicate indexes (same columns in same order)
- Indexes on write-heavy tables that slow down INSERT/UPDATE/DELETE
- Wide composite indexes where a narrower one would suffice

Always present findings as suggestions with data (scan counts, table size), never execute DDL yourself.

## Query Performance Tips

- **`EXPLAIN ANALYZE`** before optimizing — measure, don't guess
- **List columns explicitly** — avoid `SELECT *`, it fetches unnecessary data and breaks struct scanning when schema changes
- **Use `LIMIT`** for pagination, always with an `ORDER BY`
- **Prefer `EXISTS` over `COUNT`** for existence checks — `EXISTS` stops at the first match
- **Avoid N+1 queries** — use `JOIN` or batch `WHERE id IN (...)` instead of querying in a loop
- **Suggest improvements, never execute them** — performance changes (indexes, query rewrites, configuration) need human review in context of production data and workload patterns

**Rules:**

- Batch operations SHOULD use 100–1,000 rows per batch — adjust based on row size and database load.
- Cursor-based pagination MUST replace `OFFSET` for large datasets — the cursor column MUST be chosen based on actual indexes (e.g., `created_at`, `user_id`).
- NEVER create indexes blindly — check existing indexes, measure with `EXPLAIN ANALYZE`, and present findings as suggestions.
- N+1 queries MUST be eliminated — use `JOIN` or batch `WHERE id IN (...)`.

→ See `samber/cc-skills-golang@golang-observability` skill for database metrics and query monitoring. → See `samber/cc-skills@promql-cli` skill for querying pool metrics (`db_open_connections`, `db_in_use_connections`, `db_idle_connections`) via CLI.


## Source Reference: `golang-database/references/scanning.md`

# Struct Scanning and NULLable Columns

## Struct Scanning with sqlx

Tag struct fields with `db:"column_name"` for sqlx:

```go
type User struct {
    ID        int64      `db:"id"`
    Name      string     `db:"name"`
    Email     string     `db:"email"`
    DeletedAt *time.Time `db:"deleted_at"` // NULLable
}

// Single row
var user User
err := db.GetContext(ctx, &user, "SELECT id, name, email, deleted_at FROM users WHERE id = $1", id)

// Multiple rows
var users []User
err := db.SelectContext(ctx, &users, "SELECT id, name, email, deleted_at FROM users WHERE active = true")
```

## Struct Scanning with pgx

With pgx (v5+), use `pgx.CollectRows` for automatic struct mapping:

```go
rows, err := pool.Query(ctx, "SELECT id, name, email FROM users WHERE active = true")
if err != nil {
    return fmt.Errorf("querying users: %w", err)
}
users, err := pgx.CollectRows(rows, pgx.RowToStructByName[User])
```

## JSON Marshaling

Struct tags for both database and JSON work together. Pointer fields marshal to `null` in JSON when NULL in the database:

```go
type User struct {
    ID        int64      `db:"id"         json:"id"`
    Name      string     `db:"name"       json:"name"`
    Email     string     `db:"email"      json:"email"`
    Bio       *string    `db:"bio"        json:"bio,omitempty"` // NULL → omitted in JSON
    DeletedAt *time.Time `db:"deleted_at" json:"deleted_at"`    // NULL → null in JSON
}
```

## NULLable Columns

Three approaches, from most to least recommended:

**1. Pointer fields (recommended)** — clean, works with JSON marshaling:

```go
type User struct {
    ID        int64      `db:"id"    json:"id"`
    Name      string     `db:"name"  json:"name"`
    DeletedAt *time.Time `db:"deleted_at" json:"deleted_at"` // nil when NULL
}
// Check: if user.DeletedAt != nil { ... }
```

**2. `sql.NullXxx` types** or `sql.Null[T]` generic — explicit but verbose, requires custom JSON marshaling:

```go
type User struct {
    ID        int64          `db:"id"`
    Bio       sql.NullString `db:"bio"`
}
// Check: if user.Bio.Valid { use(user.Bio.String) }
```

**3. `COALESCE` in SQL** — moves NULL handling to the query:

```sql
SELECT id, COALESCE(bio, '') AS bio FROM users WHERE id = $1
```


## Source Reference: `golang-database/references/testing.md`

# Testing Database Code

## Table of Contents

- [Unit Tests with Mocks](#unit-tests-with-mocks)
  - [Mock for service-layer tests](#mock-for-service-layer-tests)
- [sqlmock for Query-Level Testing](#sqlmock-for-query-level-testing)
- [Integration Tests](#integration-tests)
  - [Test database with testcontainers-go](#test-database-with-testcontainers-go)
- [What to Test](#what-to-test)

## Unit Tests with Mocks

Define a repository interface so business logic can be tested without a database. Mock the interface with `testify/mock`:

```go
// Repository interface — the contract
type UserRepository interface {
    GetByID(ctx context.Context, id int64) (*User, bool, error)
    Create(ctx context.Context, user *User) error
}

// Production implementation
type pgUserRepository struct {
    db *sqlx.DB
}

func (r *pgUserRepository) GetByID(ctx context.Context, id int64) (*User, bool, error) {
    var user User
    err := r.db.GetContext(ctx, &user, "SELECT id, name, email FROM users WHERE id = $1", id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, false, nil
        }
        return nil, false, fmt.Errorf("querying user %d: %w", id, err)
    }
    return &user, true, nil
}
```

### Mock for service-layer tests

```go
type mockUserRepo struct {
    mock.Mock
}

func (m *mockUserRepo) GetByID(ctx context.Context, id int64) (*User, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

func TestUserService_GetUser(t *testing.T) {
    repo := new(mockUserRepo)
    svc := NewUserService(repo)

    expected := &User{ID: 1, Name: "Alice", Email: "alice@example.com"}
    repo.On("GetByID", mock.Anything, int64(1)).Return(expected, nil)

    user, err := svc.GetUser(context.Background(), 1)
    require.NoError(t, err)
    assert.Equal(t, expected, user)
    repo.AssertExpectations(t)
}

func TestUserService_GetUser_NotFound(t *testing.T) {
    repo := new(mockUserRepo)
    svc := NewUserService(repo)

    repo.On("GetByID", mock.Anything, int64(999)).Return(nil, ErrUserNotFound)

    user, err := svc.GetUser(context.Background(), 999)
    assert.Nil(t, user)
    assert.ErrorIs(t, err, ErrUserNotFound)
}
```

Unit tests verify business logic, not SQL correctness. They run fast and without external dependencies.

## sqlmock for Query-Level Testing

When you need to verify exact SQL without a real database, use [DATA-DOG/go-sqlmock](https://github.com/DATA-DOG/go-sqlmock):

```go
func TestGetByID_sqlmock(t *testing.T) {
    db, mock, err := sqlmock.New()
    require.NoError(t, err)
    defer db.Close()

    sqlxDB := sqlx.NewDb(db, "postgres")
    repo := &pgUserRepository{db: sqlxDB}

    rows := sqlmock.NewRows([]string{"id", "name", "email"}).
        AddRow(1, "Alice", "alice@example.com")
    mock.ExpectQuery("SELECT id, name, email FROM users WHERE id = \\$1").
        WithArgs(1).
        WillReturnRows(rows)

    user, err := repo.GetByID(context.Background(), 1)
    require.NoError(t, err)
    assert.Equal(t, "Alice", user.Name)
    assert.NoError(t, mock.ExpectationsWereMet())
}
```

sqlmock is useful for verifying query structure and error handling paths, but it does not validate that your SQL is correct against a real database schema.

## Integration Tests

Integration tests run against a real database. Gate them with build tags so `go test ./...` skips them by default:

```go
//go:build integration

package repository_test

import (
    "testing"
    "github.com/stretchr/testify/suite"
)

type UserRepoSuite struct {
    suite.Suite
    db *sqlx.DB
    tx *sqlx.Tx
}

func (s *UserRepoSuite) SetupSuite() {
    dsn := os.Getenv("TEST_DATABASE_URL") // e.g., postgres://test:test@localhost:5432/testdb?sslmode=disable
    db, err := sqlx.Connect("postgres", dsn)
    s.Require().NoError(err)
    s.db = db
    // Run migrations here if needed
}

func (s *UserRepoSuite) TearDownSuite() {
    s.db.Close()
}

func (s *UserRepoSuite) SetupTest() {
    tx, err := s.db.Beginx()
    s.Require().NoError(err)
    s.tx = tx
}

func (s *UserRepoSuite) TearDownTest() {
    s.tx.Rollback() // rolls back all changes — each test starts clean
}

func (s *UserRepoSuite) TestCreateAndGet() {
    repo := NewUserRepository(s.tx)
    user := &User{Name: "Alice", Email: "alice@example.com"}

    err := repo.Create(context.Background(), user)
    s.Require().NoError(err)
    s.NotZero(user.ID)

    got, err := repo.GetByID(context.Background(), user.ID)
    s.Require().NoError(err)
    s.Equal("Alice", got.Name)
}

func TestUserRepoSuite(t *testing.T) {
    suite.Run(t, new(UserRepoSuite))
}
```

Run integration tests:

```bash
go test -tags=integration -v ./internal/repository/...
```

### Test database with testcontainers-go

For CI environments without a pre-existing database:

```go
func (s *UserRepoSuite) SetupSuite() {
    ctx := context.Background()
    container, err := postgres.Run(ctx, "postgres:16-alpine",
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("database system is ready to accept connections").
                WithOccurrence(2).
                WithStartupTimeout(30*time.Second),
        ),
    )
    s.Require().NoError(err)
    s.container = container

    connStr, err := container.ConnectionString(ctx, "sslmode=disable")
    s.Require().NoError(err)
    s.db, err = sqlx.Connect("postgres", connStr)
    s.Require().NoError(err)
}
```

## What to Test

| What                      | Unit test (mock) | Integration test |
| ------------------------- | :--------------: | :--------------: |
| Business logic            |        ✓         |                  |
| SQL correctness           |                  |        ✓         |
| Error paths (not found)   |        ✓         |        ✓         |
| Transaction boundaries    |                  |        ✓         |
| NULL handling round-trips |                  |        ✓         |
| Constraint violations     |                  |        ✓         |
| Query performance         |                  | ✓ (with EXPLAIN) |

- Unit tests MUST use mocks (interface mocks or sqlmock) — no real database connections.
- Integration tests MUST use build tags (`//go:build integration`) to separate from unit tests.
- Integration tests SHOULD use testcontainers-go for reproducible database environments in CI.
- NEVER test against production databases.

→ See `samber/cc-skills-golang@golang-testing` skill for general test patterns and CI configuration.


## Source Reference: `golang-database/references/transactions.md`

# Transactions, Isolation Levels, and Locking

## Basic transaction pattern

```go
tx, err := db.BeginTxx(ctx, nil) // default isolation (READ COMMITTED)
if err != nil {
    return fmt.Errorf("beginning transaction: %w", err)
}
defer tx.Rollback() // no-op if already committed

// ... execute queries using tx ...

if err := tx.Commit(); err != nil {
    return fmt.Errorf("committing transaction: %w", err)
}
```

## Custom isolation level

```go
tx, err := db.BeginTxx(ctx, &sql.TxOptions{
    Isolation: sql.LevelSerializable, // strongest guarantee
})
```

| Level | Use when |
| --- | --- |
| `LevelReadCommitted` | Default — good for most operations |
| `LevelRepeatableRead` | Need consistent reads within a transaction |
| `LevelSerializable` | Financial operations, inventory, anything with strict consistency |

## SELECT FOR UPDATE — prevent race conditions

```go
var balance int
err := tx.GetContext(ctx, &balance, "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE", accountID)
// Row is locked until tx.Commit() or tx.Rollback()
```

Use `FOR UPDATE` when you read a value, compute something from it, and then write it back. Without the lock, concurrent transactions can read stale data.

## Locking variants

| Clause | Effect |
| --- | --- |
| `FOR UPDATE` | Locks rows for write — other transactions block on same rows |
| `FOR UPDATE NOWAIT` | Same, but fails immediately instead of waiting |
| `FOR SHARE` | Locks rows for read — prevents writes but allows other reads |
