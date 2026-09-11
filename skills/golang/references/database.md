# Database Access

Use `database/sql`, a project-approved `pgx`/`sqlx` layer, or the framework's existing repository abstraction consistently. Parameterize every value; never concatenate user input into SQL. Pass context to `QueryContext`, `ExecContext`, scans, and transaction operations.

## Queries and scanning

Select explicit columns, scan in the same order, distinguish `sql.ErrNoRows` with `errors.Is`, and model nullable columns with `sql.Null*` or pointers according to domain semantics. Always close rows and check `rows.Err()`. Keep query code behind focused repositories; do not leak database handles throughout business logic. Validate pagination limits and ordering fields against an allowlist.

## Transactions and locking

Begin a transaction with context, `defer tx.Rollback()` immediately, execute all related operations through `tx`, then commit and return commit errors. Choose isolation deliberately. Use `SELECT ... FOR UPDATE` when reading, calculating, and writing a row under concurrency; use `NOWAIT`/`SKIP LOCKED` only for a documented workload. Keep transactions short and never perform remote calls while holding locks. Ensure connection pools have bounded max open/idle connections and lifetimes.

## Batching and performance

Use prepared statements only when reuse warrants them, batch inserts with bounded batches, stream large result sets instead of loading everything, and inspect query plans before adding indexes or caches. Avoid N+1 queries. Use migrations as the source of schema truth and make integration tests run against a real database; mocks cannot prove SQL correctness.

## Testing

Unit tests use interfaces or sqlmock and never production databases. Integration tests use a build tag and an isolated database, preferably testcontainers in CI; roll back or clean each test. Test NULLs, constraints, transaction boundaries, timeouts, and cancellation.
