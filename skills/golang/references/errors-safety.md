# Errors, Panics, Nil Safety, and Resource Safety

Return expected failures; reserve panic for broken invariants or intentionally fail-fast `Must` constructors at controlled initialization boundaries. Do not panic for user input, network/database failure, missing files, or ordinary validation.

## Error flow

Use `errors.New`/`fmt.Errorf` for creation. Add operation context with `%w` inside a module so callers can use `errors.Is` and `errors.As`; use `%v` only at a deliberate public boundary where hiding internal types is required. Match sentinel errors with `errors.Is`, extract types with `errors.As`/`errors.AsType` when supported, and use `errors.Join` for independent validation or cleanup failures. Handle an error once at the layer that can add context or decide behavior; do not log and return the same error at every layer. Keep user-facing errors generic and logs structured without secrets.

Use typed errors when callers need fields such as operation, resource, or validation field. Error strings are lowercase and punctuation-free. Preserve the cause chain unless exposing it would create an API contract or leak internals.

## Nil and zero-value hazards

A nil map write panics; a nil slice is safe to range but may serialize differently; a typed-nil inside an interface is non-nil. Validate pointers before dereferencing. Make useful zero values safe, or reject invalid states at construction. Do not return a nil error with a partially invalid result unless the API explicitly defines it.

## Cleanup

Immediately defer `Close` after successful open, but capture close/flush errors where durability matters. Avoid `defer` in long loops. Make cleanup idempotent and aggregate independent cleanup failures. Never hide errors with `_` without a documented reason.
