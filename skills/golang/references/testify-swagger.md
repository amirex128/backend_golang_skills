# Testify and Swagger/OpenAPI

## Testify

Use `github.com/stretchr/testify/assert` for non-fatal checks and `require` for prerequisites. Prefer `assert.Equal`/`require.NoError` and domain-specific assertions over vague booleans. In mocks, declare expectations before execution, use `mock.AnythingOfType` or typed matchers only where appropriate, assert calls were made, and keep mock behavior deterministic. Suites provide `SetupSuite`, `SetupTest`, teardown, and named tests but must remain isolated.

## Swagger with swaggo

Keep API annotations next to handlers and models. Use `@Summary`, `@Description`, `@Tags`, `@Accept`, `@Produce`, `@Param`, `@Success`, `@Failure`, `@Router`, and `@Security` consistently. Document path/query/body/header parameters, response schemas, auth schemes, enums, examples, and errors. Use `swag init` from the package containing the general API annotations; configure `--parseDependency`/`--parseInternal` only when needed. Review generated docs in CI and do not hand-edit generated output. Match the actual router/framework and keep secrets out of examples.
