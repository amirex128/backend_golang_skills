# Style, Naming, and API Surface

Use clear, idiomatic Go rather than rigid formatting rules. `gofmt` owns layout; this reference owns readability and intent.

## Control flow and functions

Break lines at semantic boundaries; around 120 characters is a warning, not a hard limit. For calls with many arguments, use one argument per line or introduce an options/config struct. Handle errors and edge cases first, remove unnecessary `else` after terminal statements, use `switch` for repeated comparisons, and extract three-or-more-term conditions into named booleans unless short-circuiting an expensive final check matters. Keep functions focused, usually with no more than four parameters. Put `context.Context` first, inputs next, and output destinations last. Prefer `range`; use `range n` on supported Go versions for simple counts.

Use `:=` for non-zero initialization and `var` for intentional zero values. Use keyed composite literals. Initialize maps before writes; initialize API-facing empty slices when `[]` rather than JSON `null` is required. Preallocate only when capacity is known. Use `strings.Builder` in concatenation loops, `strconv` for simple conversions, and generics over `any` when the type can be concrete.

## Names

Packages are lowercase, short, singular, and not `utils`, `common`, or `helpers`. Export only deliberate API. Names use MixedCaps; initialisms are consistent (`ID`, `URL`, `HTTP`). Constructors are `NewType`; getters omit `Get`; booleans read as predicates (`Enabled`, `IsReady` when appropriate). Interfaces describe behavior and are commonly named with an `-er` suffix; define them where consumed and prefer small interfaces. Receivers use short consistent names. Constants are MixedCaps, not `ALL_CAPS`; enum values are type-prefixed and zero is an explicit Unknown/Invalid sentinel.

Sentinel errors use `Err...`; custom errors use an `Error` suffix. Error strings are lowercase, include useful package context where appropriate, and do not end in punctuation. Test names describe behavior, subtests use readable lower-case names, and examples follow Go's `ExampleType_Method_variant` naming rules.

## API and file organization

Group related declarations; a practical file order is package comment, imports, constants, types, constructors, methods, helpers. Prefer one primary type per substantial file. Avoid dot imports; keep blank imports visible at application roots. Avoid premature abstraction, reflection, and public surface growth. Prefer a little duplication over a large dependency when the pattern is small and stable.
