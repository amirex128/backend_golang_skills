# GoFr-Golang: Refactoring

## GoFr adaptation rules

This is the GoFr-specific form of the general Golang guidance below. Use GoFr as the mandatory framework for service delivery: begin services with `gofr.New()`, keep GoFr lifecycle, configuration, health, structured logging, Prometheus metrics, OpenTelemetry tracing, datasource management, and graceful shutdown intact, and never silently replace GoFr with another web framework. Use the exact GoFr version installed by the project and verify version-sensitive APIs against the project module and official GoFr documentation.

Keep GoFr types at the adapter boundary. GoFr HTTP, gRPC, GraphQL, WebSocket, cron, and CLI handlers use the documented `func(c *gofr.Context) (any, error)` shape where applicable. Bind with `c.Bind(&value)` and check the error; read route parameters with `c.PathParam`, query values with `c.Param`, and return values/errors to GoFr instead of recreating response envelopes. Pass `*gofr.Context` through GoFr datasource/downstream calls for cancellation and trace propagation, but translate to application contracts before entering domain code.

The complete GoFr page set remains in the repository's `skills/gofr` Skill. Read the listed official pages there before implementing the relevant feature; these links are the authoritative framework-specific follow-up for this adapted reference.

## GoFr adaptation rules

Apply GoFr lifecycle, context, configuration, datasource, error, health, and observability conventions to this topic while preserving the Clean Architecture dependency rule.

## Required GoFr references

- `quick-start-introduction.md` — https://gofr.dev/docs/quick-start/introduction
- `references-context.md` — https://gofr.dev/docs/references/context
- `advanced-guide-dealing-with-sql.md` — https://gofr.dev/docs/advanced-guide/dealing-with-sql
- `references-testing.md` — https://gofr.dev/docs/references/testing

## Unified Golang guidance

# Refactoring

This reference consolidates all retained guidance from `golang-refactoring`. Read it for the matching Go engineering task.


## Source Skill Guidance

> **Community default.** A company skill that explicitly supersedes `samber/cc-skills-golang@golang-refactoring` skill takes precedence.

**Persona:** You are a Go refactoring engineer. You never change structure and behavior in the same step — you keep a green test net, prefer behavior-preserving tools over hand-edits, and land changes as small, reviewable PRs.

**Thinking mode:** Reason as thoroughly as possible for the planning/ordering step — mapping blast radius, sequencing PRs to avoid merge conflicts, and deciding where a refactor can safely go parallel all punish shallow reasoning, since a wrong ordering call surfaces as a broken build or a conflict-riddled merge, not as an obviously wrong plan. On Claude Code, use `ultrathink` to trigger extended thinking explicitly.

**Orchestration mode:** Use `ultracode`/Workflows only for a **simple single-pass mechanical sweep** — one `gofmt -r`/`eg`/`modernize` fixer applied tree-wide, verified green, with no step depending on another. Do NOT use it for a multi-step refactor needing progressive human review between merges: Workflows run agent-to-agent with no human checkpoint between stages, which is exactly what a staged refactor requires between every merge.

**Modes:**

- **Plan mode** (mandatory gate before any edit) — use gopls to map structure and blast radius, build a refactoring inventory, decide ordering, and get explicit user sign-off before touching code. See [workflow.md](references/workflow.md).
- **Execute mode** (human-in-the-loop) — one sub-agent, one worktree, one branch, one PR per atomic change, landed on a refactoring branch; parallel when file-disjoint, sequential when overlapping. Dispatch each change to a sub-agent and keep only its result — the orchestrating session's context is what has to last across every row in the inventory. See [workflow.md](references/workflow.md).
- **Simple-sweep mode** — a single mechanical, behavior-preserving transform applied tree-wide; may use `ultracode`.
- **Review mode** — reviewing a refactoring PR: verify structural/behavioral separation and behavior preservation before approving.

**Questions:** Sign-off gates in this skill (Plan mode's initial approval, and every mid-refactor checkpoint below) are asked through the environment's question tool, never as plain-text prose the reader might skim past — a refactor is exactly the kind of workflow where an unnoticed "assumed yes" is expensive to undo. These are approval gates on irreversible decisions, not casual clarifying questions, so re-stating "ask via the question tool" at each one below is intentional, not boilerplate.

**Dependencies:** `gopls` (primary actuator) — `go install golang.org/x/tools/gopls@latest`. Optional: `golangci-lint`, `benchstat`, `deadcode`, `eg`, `gopatch`. Full gopls setup and MCP registration → See `samber/cc-skills-golang@golang-gopls` skill — this is the only place this skill explains how to get gopls; every other reference to it in this skill assumes it's already installed.

# Go Refactoring — Safe Change at Scale

- Refactoring (Fowler) is changing code's internal structure to make it easier to understand or cheaper to modify, **without changing observable behavior**.
- Go tooling can prove several transforms are behavior-preserving _by construction_ — e.g. gopls refuses a Rename rather than risk a broken build.
- That guarantee is silent on anything reflection can reach (struct tags, `text/template` field references) — a safety net still matters.

## The Core Loop

**Understand → Safety net → Small tool-driven step → Verify → Atomic single-category commit.** Repeat.

1. **Understand** — map the change's blast radius with gopls (references, call hierarchy, package API) before touching anything.
2. **Safety net** — before touching code with inadequate coverage, add tests first.
   - Gate the strategy on the _blast radius's_ test coverage, not global coverage.
   - Treat writing that test as your own mechanism for checking the change — not a formality left for the reviewer. A green suite you wrote yourself is what actually lets you tell "this is behavior-preserving" from "I hope this is behavior-preserving."
   - See [safety-net.md](references/safety-net.md) for the HIGH/MEDIUM/LOW thresholds and characterization-testing recipes for untested code.
3. **Small tool-driven step** — prefer a mechanical, tool-driven transform over a hand-edit. See [go-tooling.md](references/go-tooling.md) and [catalog.md](references/catalog.md).
4. **Verify** — `go build ./... && go vet ./... && go test ./...`; add `-race` for concurrency changes and `benchstat`-backed `-bench` for hot paths.
5. **Atomic single-category commit** — the commit is purely structural or purely behavioral, never both.

## Hard Rules

- **Never mix structural and behavioral changes in one commit or PR.**
  - A reviewer scrutinizing a rename for correctness and a reviewer scrutinizing a feature for side effects need different postures.
  - Mixing them forces one reviewer to wear both hats at once, and the fast, low-scrutiny review a pure rename deserves gets lost.
- **Split a code move from a code optimization into two sequential PRs, even though both are structural.**
  - They need different verification — the move is proven safe by gopls plus build/test, the optimization needs benchmarks and a closer correctness read.
  - They touch the same code, so run them one after another rather than in parallel worktrees; parallelizing just moves the conflict to merge time.
  - Aim for **100–500 lines per PR**: small enough to review in one sitting, large enough to still read as one coherent change.
- **Prefer gopls Rename/Inline over LLM hand-edits.**
  - Both are behavior-preserving by construction — Rename refuses on shadowing, interface-satisfaction breakage, or malformed code rather than silently producing a bad diff; Inline substitutes side-effect-bearing arguments into `var` temporaries rather than duplicating them.
  - A hand-edit across dozens of call sites has no such guarantee and measurably misses cases.
- **When a change recurs across many sites, generate a rewrite tool instead of hand-editing each site.**
  - Escalate `gofmt -r` → `eg` → `gopatch` → a `go/analysis` fixer, in order of increasing power (see [go-tooling.md](references/go-tooling.md)).
  - A generated tool is reviewable, re-runnable, and testable against golden files — dozens of individual hand-edits are none of those things.
- **Use a type alias (`type A = B`) for every type moved across packages.**
  - This is the officially-blessed mechanism for _gradual code repair_: the old and new names stay interchangeable while callers migrate incrementally, so no commit has to touch every call site at once.
  - See [structural.md](references/structural.md).
- **Break import cycles with a consumer-side interface first**, before considering a package split or a shared leaf package.
  - Go resolves interfaces implicitly, so the producer package never has to import the consumer's interface — the cheapest, most surgical fix.
  - See [structural.md](references/structural.md).
- **Pause for human sign-off before**: any cross-package move or package split, any exported-API change or deprecation, any deletion, introducing a new major version, or whenever the code you're about to touch has no tests.
  - These are the moves a wrong call is expensive to undo.
- **Grep for tag and reflection references after any rename.**
  - gopls Rename only guards against _compilation_ breakage — it cannot see a struct tag, a `text/template` field reference, or a `reflect`-driven dispatch that still points at the old name.
  - Renaming a field silently desyncs it from its `json`/`db` tag.
- **Load `samber/cc-skills-golang@golang-security` (and `golang-safety` for internal-correctness risk) whenever a step changes code logic, not just its shape.**
  - A mechanical, tool-verified transform can't introduce a vulnerability, but a behavioral change can.
  - Treat "changes what the code does" as the trigger for a security-and-safety pass, not an afterthought reserved for the final review.
- **Start every step from a clean, committed baseline, and revert rather than debug forward when it goes red.**
  - Version control is the safety net underneath the test safety net.
  - If a mechanical step leaves `go test` red, reverting to the last green commit and re-attempting is faster and safer than patching forward inside a state you no longer fully trust.
  - Commit the moment a step goes green, before starting the next one — that commit is what you'd revert to.

## When Not to Refactor

Refactoring is an investment that only pays off if a future change is coming to spend it on. Question it — or skip it — when:

- **The code works and nothing planned will touch it again.**
  - A stable, rarely-read package earns nothing from being restructured for its own sake.
  - The risk of even a small staged refactor has to be repaid by an easier next change, and there may not be one.
- **It's critical production code with no tests.** Don't refactor it directly.
  - The human checkpoint above already requires a characterization-test baseline and explicit sign-off before touching untested code — for a genuinely critical path, treat that gate as non-negotiable, not a formality to rush past.
- **The deadline is tight.**
  - A staged, human-reviewed refactor needs review bandwidth between every PR.
  - Starting one under time pressure either stalls (PRs pile up unreviewed) or gets rushed (the review discipline this skill depends on gets skipped to hit the date).
  - Make the minimal safe change now and stage the larger refactor for when there's room for it.
- **There's no clear purpose.**
  - "Refactor this" with no reason behind it — no upcoming feature it'll make easier, no bug class it'll close off, no smell a review actually flagged — is refactoring for its own sake.
  - Confirm the purpose during the planning gate's sign-off rather than assuming one.

## Risk Stratification

| Risk | Transforms | Safety requirement |
| --- | --- | --- |
| **Low** | gopls Rename, Extract Variable/Constant, Inline Variable, `gofmt -s`, organize imports, local `refactor.rewrite.*` actions | Build/vet/test after the step is enough |
| **Medium** | Extract Function/Method (Extract is best-effort — verify comments/behavior survived), Inline Call across packages, single-parameter add/remove, introducing generics | Add or confirm targeted tests over the blast radius first |
| **High** | Change signature across many callers, moving types/functions across packages, splitting/merging packages, breaking import cycles, exported-API or major-version changes | Full safety net + human checkpoint before landing |

**Diagnose:** 1- gopls refusing a Rename or Inline is a real semantic hazard, not a tool bug — investigate the shadowing/interface conflict before forcing the change by hand 2- `go vet ./...` / `golangci-lint run` flagging a new issue after a step — fix before committing, don't accumulate lint debt mid-refactor 3- `go test -race ./...` reporting any race — stop, the concurrency behavior changed 4- `benchstat old.txt new.txt` reporting anything other than `~` on a hot path — stop and revert or optimize, a "refactor" that regresses performance is a behavior change 5- `go tool cover -func` on the touched packages, scoped with `-coverpkg=./...` — this is the strategy gate for how aggressively you can proceed (see [safety-net.md](references/safety-net.md))

## Workflow: Plan → Stage → Land

- A refactor of any real size does not land as one commit or even one PR — it lands as an ordered sequence of small, independently reviewable PRs, staged on a refactoring branch, with a human approving each merge.
- [workflow.md](references/workflow.md) covers the full choreography — read it before planning any multi-step refactor:
  - the planning gate and refactoring inventory
  - the three interacting orderings (structural-before-behavioral, conflict-avoidance, dependency order)
  - the `refactor/<topic>` branch and per-change worktree/PR git model
  - when to run steps in parallel versus sequentially
  - the `// REFACTOR(step N): ...` marker convention
  - why Workflows/`ultracode` are the wrong tool for this

## Detailed References

- **[workflow.md](references/workflow.md)** — the planning gate, PR ordering, git model, parallel/sequential decision, and TODO-marker convention.
- **[catalog.md](references/catalog.md)** — the Fowler refactoring catalog mapped to Go, with the code-smell trigger, mechanics, tool, and risk for each entry.
- **[go-tooling.md](references/go-tooling.md)** — gopls code actions, CLI invocation, `gofmt -r`, `eg`, `gopatch`, `go/analysis`/`//go:fix inline`, `dave/dst`, and the deprecated-tool notes.
- **[safety-net.md](references/safety-net.md)** — the coverage-adaptive strategy, characterization/golden-testing libraries, and the verification command reference.
- **[structural.md](references/structural.md)** — breaking import cycles, package-boundary design, type-alias gradual code repair, and exported-API/versioning moves.

## Cross-References

- → See `samber/cc-skills-golang@golang-naming` skill for what to rename identifiers _to_ — this skill owns _how_ to apply a rename safely at scale.
- → See `samber/cc-skills-golang@golang-project-layout` skill for target directory/package layout — this skill owns the mechanics of moving code there without breaking callers.
- → See `samber/cc-skills-golang@golang-modernize` skill for version-driven idiom updates (`interface{}`→`any`, `slices`/`maps`) — a distinct concern from structural refactoring, though it shares the same tool-first discipline.
- → See `samber/cc-skills-golang@golang-code-style` skill for control-flow clarity and function-shape rules this skill helps you apply mechanically.
- → See `samber/cc-skills-golang@golang-design-patterns` skill for target patterns (options struct, DI, consumer-side interfaces) this skill helps you migrate toward.
- → See `samber/cc-skills-golang@golang-testing` skill for the test-writing practices that make the safety net in this skill trustworthy.
- → See `samber/cc-skills-golang@golang-lint` skill for configuring `golangci-lint`, run here only as a post-step verification gate.
- → See `samber/cc-skills-golang@golang-security` skill (and `golang-safety`) for reviewing any step that changes code logic, not just its shape.

If you encounter a bug or unexpected behavior in `gopls`, open an issue at <https://github.com/golang/go/issues>.


## Source Reference: `golang-refactoring/references/catalog.md`

# The Fowler Catalog, Mapped to Go

Each entry below follows the same structure: **Motivation** (why the refactoring earns its keep), **Smell trigger** (the code shape that signals it's time), **Go mechanics** (what the transform actually looks like in Go), **Tool** (what performs it), and **Risk** (matching the Risk Stratification table in [SKILL.md](../SKILL.md)). Entries are grouped by family, following the shape of Fowler's _Refactoring_ catalog.

## Table of Contents

- [Extract Function / Extract Method](#extract-function--extract-method)
- [Inline Function / Inline Call](#inline-function--inline-call)
- [Extract Variable / Inline Variable, Extract Constant](#extract-variable--inline-variable-extract-constant)
- [Rename](#rename)
- [Change Function Declaration (Signature)](#change-function-declaration-signature)
- [Move Function / Move Field / Move Type](#move-function--move-field--move-type)
- [Split Package / Merge Package](#split-package--merge-package)
- [Replace Nested Conditional with Guard Clauses](#replace-nested-conditional-with-guard-clauses)
- [Introduce Parameter Object](#introduce-parameter-object)
- [Replace Conditional with Polymorphism](#replace-conditional-with-polymorphism)
- [Hide Delegate / Remove Middle Man](#hide-delegate--remove-middle-man)
- [Sprout Method / Wrap Method](#sprout-method--wrap-method)
- [Replace Temp with Query](#replace-temp-with-query)
- [Smell → Refactoring Quick Reference](#smell--refactoring-quick-reference)
- [Cross-References](#cross-references)

## Extract Function / Extract Method

- **Motivation:** A function doing more than one job is harder to name, test, and reuse than two functions each doing one job — splitting it restores a name for the piece that was previously anonymous.
- **Smell trigger:** Long Function — a function whose body mixes several levels of abstraction, or where a comment introduces a block that could instead be the function's name.
- **Go mechanics:** Select the statements to extract; the tool infers the parameter list from free variables and the return list from variables used after the extracted block. For a method, it additionally infers the receiver.
- **Tool:**

```
gopls codeaction -exec -kind=refactor.extract.function file.go:#start,#end
gopls codeaction -exec -kind=refactor.extract.method   file.go:#start,#end
```

Editor-integrated as "Extract function"/"Extract method" in the code actions menu.

- **Risk:** Medium. gopls's own documentation describes Extract as "considerably less rigorous" than Rename or Inline, and it is known to drop comments attached to the extracted statements (golang/go#20744). Always diff the result and re-read the extracted body — don't trust it as behavior-preserving by construction the way Rename and Inline are.

## Inline Function / Inline Call

- **Motivation:** A wrapper that no longer adds a distinct name, or a level of indirection that has stopped paying for itself, is pure navigation overhead for the reader — inlining removes the detour.
- **Smell trigger:** A trivial one-line forwarding function, or a Middle Man that has accreted no behavior of its own since it was introduced.
- **Go mechanics:** The call site is replaced with the callee's body, with real substitution rather than naive text-splicing: arguments that have side effects are hoisted into `var` temporaries instead of being duplicated wherever the parameter is used, implicit conversions at the call boundary are made explicit, and a callee body containing `defer` is wrapped in an immediately-invoked function literal so the deferred call still fires at the right point. Inline cannot cross a dynamic dispatch (interface method call, function value) or inline a generic function.
- **Tool:**

```
gopls codeaction -exec -kind=refactor.inline.call file.go:#offset
```

- **Risk:** Low. Alongside Rename, this is one of the two gopls operations that is provably behavior-preserving by construction — it refuses rather than produce a semantically wrong inline.

## Extract Variable / Inline Variable, Extract Constant

- **Motivation:** A repeated or unexplained expression forces every reader to re-derive its meaning at each occurrence; giving it a name states the meaning once.
- **Smell trigger:** The same non-trivial expression appears more than once, or a single occurrence is opaque enough that a reader has to pause and work out what it computes.
- **Go mechanics:** Extract Variable introduces a `:=` binding immediately above the first use; the `-all` variant rewrites every syntactic occurrence of the expression in scope to reference the new variable. Extract Constant does the same for a literal that deserves a name and compile-time immutability. Inline Variable is the reverse: substitute the variable's value at its use site(s) and remove the binding.
- **Tool:**

```
gopls codeaction -exec -kind=refactor.extract.variable     file.go:#start,#end
gopls codeaction -exec -kind=refactor.extract.variable-all file.go:#start,#end
gopls codeaction -exec -kind=refactor.extract.constant     file.go:#start,#end
gopls codeaction -exec -kind=refactor.inline.variable      file.go:#offset
```

- **Risk:** Low.

## Rename

- **Motivation:** A misleading identifier costs every future reader the same confusion, repeatedly — fixing the name once removes that tax for good. A naming fix is often the trigger for an entire refactor, because a name that's wrong for the current shape of the code cascades into every call site that reads it.
- **Smell trigger:** Any identifier — variable, function, type, field, package — whose name no longer describes what it holds or does.
- **Go mechanics:**
  - gopls Rename is workspace-wide: it updates every reference across every file and package that imports the renamed symbol, and it type-checks the result.
  - It refuses rather than proceed when the rename would introduce a shadowing conflict, when renaming a method would break an interface satisfaction relationship elsewhere in the workspace, or when the surrounding code doesn't currently type-check.
  - Two special cases are easy to get backwards: renaming the `p` in `package p` moves the entire package directory and rewrites every import path that referred to it; renaming a method's _receiver declaration_ (the `s` in `func (s *Store) Get(...)`) propagates to every method of that type, while renaming a single _use_ of a receiver variable inside one method body touches only that method.
- **Tool:**

```
gopls rename file.go:#offset newName
```

Editor-integrated as "Rename Symbol" (F2 in most gopls-backed editors).

- **Risk:** Low — but treat any refusal as a real semantic hazard to investigate, not friction to route around by hand-editing instead.

→ See `samber/cc-skills-golang@golang-naming` skill for what to rename identifiers _to_. This entry covers only _how_ to apply the rename safely at scale.

## Change Function Declaration (Signature)

- **Motivation:** A parameter list that has grown past what the function actually needs, or that no longer matches how the function is used, makes every call site harder to read and easier to call wrong.
- **Smell trigger:** Long Parameter List, or a single parameter that has stopped being relevant to the function's job.
- **Go mechanics:**
  - gopls has partial, single-purpose support: removing a parameter nobody passes meaningfully, or reordering two adjacent parameters, are each mechanical.
  - Adding a new parameter across every call site, or a broader signature rewrite, is not a single gopls action today. For that case, use an `eg`-staged migration: write a new function variant with the added or generalized parameter, migrate call sites to the new form via an `eg` template (`eg -t template.go -w ./...`), verify, then Rename the old function out of the way (or delete it) once nothing calls it anymore.
  - This keeps the migration mechanical and reviewable instead of a set of manual edits scattered across the tree.
- **Tool:**

```
gopls codeaction -exec -kind=refactor.rewrite.removeUnusedParam file.go:#offset
gopls codeaction -exec -kind=refactor.rewrite.moveParamLeft      file.go:#offset
gopls codeaction -exec -kind=refactor.rewrite.moveParamRight     file.go:#offset
eg -t template.go -w ./...   # staged migration for adding/generalizing a parameter
```

- **Risk:** Medium for a single-parameter add/remove with a handful of call sites; High when the signature changes across many callers with no mechanical one-shot action available.

→ See `samber/cc-skills-golang@golang-design-patterns` skill for converting a long parameter list into an options struct rather than just reordering or trimming it.

## Move Function / Move Field / Move Type

- **Motivation:** A function, field, or type placed in the wrong package is a standing invitation to reach across a boundary that shouldn't be crossed — moving it to where its data lives removes that temptation.
- **Smell trigger:** Feature Envy — a function reads and manipulates another package's data more than its own — or a type whose responsibilities clearly belong to a different package than the one it currently lives in.
- **Go mechanics:**
  - No one-shot gopls action moves a symbol across package boundaries yet.
  - The gradual-repair sequence: introduce the symbol in its new home; leave a **type alias** (`type Old = pkg.New`) for a moved type, or a thin wrapper function/forwarding variable for a moved function, in the old location so both the old and new names keep working; migrate callers to the new name incrementally, one small commit at a time; delete the old name (and the alias/wrapper) only once nothing references it.
  - Splitting a large file into a new file _within the same package_ is a distinct, one-shot gopls action.
- **Tool:**

```
gopls codeaction -exec -kind=refactor.extract.toNewFile file.go:#start,#end   # same-package file split
```

Cross-package moves are the manual type-alias/wrapper sequence above — there is no equivalent one-shot command.

- **Risk:** High.

→ See `samber/cc-skills-golang@golang-project-layout` skill for target package layout. See [structural.md](structural.md) for the full type-alias gradual-repair recipe.

## Split Package / Merge Package

- **Motivation:** A package that has grown to serve many unrelated responsibilities is hard to review, test, and reason about as a unit — splitting it along its natural seams restores each piece's ability to be understood on its own. The reverse move, merging, is occasionally right when two packages have become so mutually dependent that the boundary between them adds ceremony without adding isolation.
- **Smell trigger:** A "god package" (the package-level analogue of a Large Class), or Divergent Change — the same package keeps changing for several unrelated reasons because it hosts several unrelated concerns.
- **Go mechanics:**
  - gopls exposes an experimental code action that partitions a package's top-level declarations into groups with no cyclic dependency between them, proposing a split into acyclic components. Treat its proposal as a starting point to review, not a final answer — package boundaries also encode API and ownership decisions the tool can't see.
  - Merging has no dedicated tool: move the declarations into the target package and resolve whatever import cycle results with a consumer-side interface (see [structural.md](structural.md)) before falling back to a bigger restructuring.
- **Tool:**

```
gopls codeaction -exec -kind=source.splitPackage file.go   # experimental; splitting only
```

- **Risk:** High.

→ See `samber/cc-skills-golang@golang-project-layout` skill for target package layout.

## Replace Nested Conditional with Guard Clauses

- **Motivation:** Deep `if`/`else` nesting forces a reader to hold every outer condition in mind to understand an inner branch; guard clauses let each precondition exit on its own line and leave only the main path in the body.
- **Smell trigger:** An `if`/`else if`/`else` chain, or nested `if` blocks, where most branches are actually preconditions or error cases rather than alternatives of equal weight.
- **Go mechanics:** Each branch that isn't the primary path becomes an early `return`/`continue`/`break`, flattening the remaining logic to a single nesting level. gopls's invert-if action flips a single `if`/`else` in place and is a useful mechanical building block for this, but it operates on one condition at a time — turning a whole nested chain into guard clauses is a structural pass with the assistance of that action, not a single tool invocation.
- **Tool:**

```
gopls codeaction -exec -kind=refactor.rewrite.invertIf file.go:#offset
```

- **Risk:** Low.

→ See `samber/cc-skills-golang@golang-code-style` skill for the full early-return style rule this refactor works toward.

## Introduce Parameter Object

- **Motivation:** When the same group of parameters keeps showing up together across several functions, the group itself is a concept that deserves a name and a single place to add validation or a new field.
- **Smell trigger:** Data Clumps — the same cluster of parameters (or fields) recurring together — or a Long Parameter List where several parameters are conceptually one unit.
- **Go mechanics:** Define a struct that holds the recurring parameter group, then change each affected function's signature to take the struct instead of the individual values. gopls has a planned "Extract parameter struct" action tracked as golang/go#65552; as of this writing it is not yet generally available. Until it lands, treat this as an Extract-Variable-style manual step (define the struct, construct it at each call site) followed by a signature change at each call site — the same staged approach as Change Function Declaration above.
- **Tool:** No dedicated gopls action yet (golang/go#65552 tracks it). Combine manual struct extraction with the signature-change tooling above.
- **Risk:** Medium.

→ See `samber/cc-skills-golang@golang-design-patterns` skill for functional options as the alternative when the struct exists to configure construction rather than to group a plain data clump.

## Replace Conditional with Polymorphism

- **Motivation:** A `switch` on a type or state constant that shows up in more than one place forces every new case to be added in lock-step at every one of those places; an interface with one implementation per case collects each case's behavior in one place instead.
- **Smell trigger:** Repeated Switches — the same `switch` on a type tag or state value recurs at multiple call sites, and adding a new case means finding and updating every one of them.
- **Go mechanics:** Define an interface with one method per behavior that currently varies by case, then give each case its own implementing type. Callers that used to switch on the tag now just call the interface method, and dispatch happens through Go's interface mechanism instead of a repeated `switch`.
- **Tool:** Manual — no mechanical tool performs this transform; use Extract Function/Interface steps to carve out each case's behavior into its own type, then Rename/Inline to clean up the seams.
- **Risk:** Medium.

→ See `samber/cc-skills-golang@golang-design-patterns` skill for the target interface-dispatch pattern.

## Hide Delegate / Remove Middle Man

- **Motivation:** A caller that reaches through one object to call methods on another is coupled to both the shape of the first object _and_ the shape of everything downstream of it; hiding the delegate collapses that chain to a single call. The opposite failure — a method that does nothing but forward to another object — adds a hop with no behavior to show for it, and removing it lets callers reach the real implementation directly.
- **Smell trigger:** Message Chains (`a.B().C().D()` reaching through several objects to get to the one that matters) call for Hide Delegate; a Middle Man (a method whose entire body is `return x.SameMethod(...)`) calls for Remove Middle Man.
- **Go mechanics:** Struct embedding is Go's usual mechanism for Hide Delegate — embedding the delegate promotes its methods onto the containing type, so callers invoke them directly on the outer struct instead of chaining through an accessor. Remove Middle Man is the inverse: delete the pass-through method (after an Inline Call at each of its call sites, or a Rename-and-redirect) and let callers reach the real implementation directly, whether through an exported field or the embedded type.
- **Tool:** Manual for the embedding decision; `gopls codeaction -exec -kind=refactor.inline.call` mechanizes the "delete the middle man" step once callers are ready to call through directly.
- **Risk:** Low-Medium.

## Sprout Method / Wrap Method

- **Motivation:** Feathers's core insight: code with no tests is code you can't safely edit in place, because there's no way to notice if you broke it. Both techniques add new behavior without touching the untested code directly, so the new behavior can be tested even when the old code still can't be.
- **Smell trigger:** A need to add new behavior to a function or method that currently has little or no test coverage.
- **Go mechanics:**
  - **Sprout Method** — write the new behavior as a brand-new, fully-tested function or method, and call it from the one call site that needs it, leaving the original code otherwise untouched.
  - **Wrap Method** — rename the original method (e.g. `Save` → `saveInternal`), then add a new method with the old name (`Save`) that calls the renamed original and adds the new behavior around it; this is a manual decorator, since Go has no built-in method-wrapping mechanism.
- **Tool:** `gopls rename` for the rename step in Wrap Method; the new code itself is hand-written and tested like any other new function.
- **Risk:** Low — by design, this is how Feathers's approach avoids touching untested code directly.

→ See [safety-net.md](safety-net.md) for when low/zero coverage should push you toward this pattern instead of editing in place.

## Replace Temp with Query

- **Motivation:** A local variable computed once and reused several times hides the fact that it's a derived value — reading the variable's name doesn't tell you it's a computation, only that it's a value, which obscures where the real logic lives.
- **Smell trigger:** A local variable assigned once from an expression and then read multiple times later in the function, where the variable's name doesn't make clear it's derived rather than an input.
- **Go mechanics:** Replace the variable with a call to a small unexported function or method that recomputes the same expression, then remove the variable and each of its reads becomes a call instead. This is a manual step — Go's function-call cost is cheap enough that the transform is rarely a performance concern, so the only judgment call is readability, not cost.
- **Tool:** Manual. If the resulting function is only ever called once, gopls's inline action can fold it back at any point without losing the readability gain that motivated extracting it.
- **Risk:** Low.

## Smell → Refactoring Quick Reference

| Smell | Go-specific fix |
| --- | --- |
| Long Function | Extract Function/Method |
| Large/God Package | Split Package |
| Long Parameter List | Introduce Parameter Object, or an options struct |
| Data Clumps | Extract a struct for the recurring group |
| Primitive Obsession | Introduce a named type instead of a bare `string`/`int` |
| Divergent Change (one package, many unrelated reasons to change) | Split Package |
| Shotgun Surgery (one conceptual change touches many packages) | Move Function/Field to consolidate the concept into one package |
| Feature Envy | Move Function to the package whose data it actually uses |
| Repeated Switches | Replace Conditional with Polymorphism |
| Message Chains | Hide Delegate |
| Middle Man | Remove Middle Man |

Divergent Change and Shotgun Surgery point to opposite fixes even though both are "too much change ripples around": Divergent Change is one package changing for many reasons — the fix is to split it apart. Shotgun Surgery is one reason to change rippling across many packages — the fix is to consolidate that concept into one package so a single change touches one place.

## Cross-References

- → See [structural.md](structural.md) for the full type-alias gradual-repair recipe used by Move Function/Field/Type, and for breaking import cycles ahead of a package split or merge.
- → See [safety-net.md](safety-net.md) for the coverage-adaptive strategy that determines when Sprout/Wrap Method should replace an in-place edit.
- → See [go-tooling.md](go-tooling.md) for the full gopls code-action reference, `gofmt -r`, `eg`, and `gopatch` invocation details.
- → See `samber/cc-skills-golang@golang-naming` skill for what to rename identifiers _to_.
- → See `samber/cc-skills-golang@golang-project-layout` skill for target package/directory layout.
- → See `samber/cc-skills-golang@golang-design-patterns` skill for options structs, consumer-side interfaces, and interface-dispatch patterns referenced throughout this catalog.
- → See `samber/cc-skills-golang@golang-code-style` skill for the guard-clause/early-return style rule.


## Source Reference: `golang-refactoring/references/go-tooling.md`

# Go Tooling for Refactoring

This file is the tool reference for `samber/cc-skills-golang@golang-refactoring`: every mechanical-rewrite tool worth reaching for, from the primary actuator (`gopls`) down to hand-rolled `go/analysis` fixers, ordered so you can pick the least-powerful tool that solves the problem. See [catalog.md](catalog.md) for which tool maps to which Fowler refactoring, and [workflow.md](workflow.md) for how a tool-driven step fits into the staged-PR process.

## Table of Contents

- [1. gopls — the Primary Actuator](#1-gopls--the-primary-actuator)
- [2. Bulk Mechanical Rewrite Tools](#2-bulk-mechanical-rewrite-tools)
  - [`gofmt -r` — syntactic, single-expression](#gofmt--r--syntactic-single-expression)
  - [`eg` — type-aware, example-based](#eg--type-aware-example-based)
  - [`gopatch` — statement-level, import-aware](#gopatch--statement-level-import-aware)
  - [`go/analysis` + SuggestedFixes — bespoke, testable](#goanalysis--suggestedfixes--bespoke-testable)
  - [`go fix` — the `go/analysis`-based fixer suite](#go-fix--the-goanalysis-based-fixer-suite)
  - [`dave/dst` — comment- and formatting-preserving AST edits](#davedst--comment--and-formatting-preserving-ast-edits)
  - [Always run after a bulk rewrite](#always-run-after-a-bulk-rewrite)
- [4. Structure-Discovery Tools (blast-radius mapping)](#4-structure-discovery-tools-blast-radius-mapping)
- [Cross-References](#cross-references)

## 1. gopls — the Primary Actuator

- gopls performs most of this skill's Low- and Medium-risk transforms — Rename, Inline, Extract, and the `refactor.rewrite.*` family.
- See the Risk Stratification table in [SKILL.md](../SKILL.md) and the `Tool:` line on each entry in [catalog.md](catalog.md) for which gopls action maps to which refactoring.
- The full code-action reference, CLI invocation, safety behavior, and MCP server setup belong to `samber/cc-skills-golang@golang-gopls` — this file covers the tools that skill doesn't.

## 2. Bulk Mechanical Rewrite Tools

When a change recurs across many call sites, reach for a generated rewrite tool instead of hand-editing each one. The tools below are ordered by increasing power — start at the top and move down only when the current tool's limits block the rewrite you need.

### `gofmt -r` — syntactic, single-expression

- Purely syntactic and type-unaware: it matches expression shape, not the types involved, and a rewrite is limited to a single expression.
- Wildcards are single lowercase identifiers that match any sub-expression.

```bash
gofmt -r 'bytes.Compare(a, b) == 0 -> bytes.Equal(a, b)' -w file.go
gofmt -r 'bytes.Compare(a, b) != 0 -> !bytes.Equal(a, b)' -w file.go
gofmt -s -w file.go    # -s additionally simplifies (e.g. s[a:len(s)] -> s[a:])
gofmt -l .             # list non-conforming files — useful as a CI gate
gofmt -d file.go       # show the diff without writing
```

- Because it can't see types, it cannot target "every `bytes.Compare` call on a `[]byte`, but not a look-alike function of the same name from another package" — that distinction needs `eg`.

### `eg` — type-aware, example-based

`golang.org/x/tools/cmd/eg` rewrites by example, à la Refaster: a template file declares `before`/`after` functions of identical type, each with a single-expression body.

```go
// template.go
package template

import (
	"errors"
	"fmt"
)

func before(s string) error { return fmt.Errorf("%s", s) }
func after(s string) error  { return errors.New(s) }
```

```bash
eg -t template.go -w ./...
```

- Matching is semantic, not textual — `func(x int)` in the template also matches `func(y int)` at the call site, since `eg` matches by type and structure.
- Limits: expressions only, no statements or function-literal patterns; a rewrite can't change the expression's type; imports are added but never removed (run `goimports` afterward); and duplicating a wildcard variable in the `after` template duplicates whatever side effect the matched expression had.

### `gopatch` — statement-level, import-aware

`github.com/uber-go/gopatch` operates at the statement level and tracks imports as part of the patch, so it can work on code that doesn't fully compile mid-refactor — useful for the messy in-between states of a large migration. A patch declares metavariables between `@@` markers, then a diff-like body:

```
@@
var x expression
@@
-errors.New(fmt.Sprintf(x))
+fmt.Errorf(x)
```

```bash
gopatch -p rewrite.patch ./...
gopatch -d -p rewrite.patch ./...    # dry-run — show the diff only
```

- Still beta; the project frames it as covering roughly 80% of a migration, not 100%.
- A pattern can't match an import statement in isolation — something must follow it in the pattern for a match to occur.

### `go/analysis` + SuggestedFixes — bespoke, testable

- For a rewrite too specific for the above three, write an `analysis.Analyzer`. Its `Run(pass)` walks the type-checked AST and reports `analysis.Diagnostic{SuggestedFixes: [...]}` at each match.
- Test it against `.golden` files with `analysistest.RunWithSuggestedFixes`, then ship it as a `singlechecker`/`multichecker -fix` binary, or run it through `go vet -vettool=<path>`.

### `go fix` — the `go/analysis`-based fixer suite

- As of Go 1.26, `go fix` is rewritten onto the `go/analysis` framework and has converged with `go vet` — this is where the `modernize` fixer suite lives (`rangeint`, `mapsloop`, `minmax`, `any`, `stringscut`, `omitzero`, and more). Coverage keeps shifting release to release — Go 1.27 added `atomictypes`, `embedlit`, `slicesbackward`, `unsafefuncs`, removed `fmtappendf`, and renamed `waitgroup` to `waitgroupgo`; → See `samber/cc-skills-golang@golang-modernize` skill for the idiom-by-idiom breakdown.
- On an older toolchain without this convergence, run the equivalent analyzers through `singlechecker`/`multichecker -fix` instead of `go fix`.
- The `//go:fix inline` directive marks a function or constant so that `go fix` inlines every call site into its replacement — a machine-executable way to complete a deprecation migration once the replacement exists:

```bash
go fix ./...
go run golang.org/x/tools/go/analysis/passes/inline/cmd/inline@latest -fix ./...
```

### `dave/dst` — comment- and formatting-preserving AST edits

- `go/ast` stores comments in a side table keyed by byte offset, so reordering, moving, or deleting nodes desyncs comments from the code they were attached to — the root cause of the Extract/Inline comment-loss caveat above.
- `github.com/dave/dst` (Decorated Syntax Tree) attaches comments and blank-line spacing as node-local decorations instead, so a hand-rolled AST rewrite round-trips them correctly via `decorator.Parse` / `decorator.Print`.
- `dstutil.Apply` mirrors `astutil.Apply`'s visitor API, so existing `go/ast` rewrite logic ports over directly.
- Reach for this only when a bespoke `go/analysis` fixer needs to preserve comments that `go/ast`-based rewriting would otherwise scatter.

### Always run after a bulk rewrite

```bash
goimports -w .    # organizes imports added/left dangling by gofmt -r, eg, or a hand-rolled fixer
```

```bash
deadcode ./...                     # find code orphaned by a removal-heavy refactor
deadcode -test ./...                # include test binaries — unreached public API here signals a coverage gap, not dead code
deadcode -whylive=funcName ./...    # shortest reachability path proving a function is still live
```

- `golang.org/x/tools/cmd/deadcode` builds its reachability graph with Rapid Type Analysis from `main`/`init`, so it is unsound with respect to assembly, `go:linkname`, and reflection-driven dispatch — treat a "dead" verdict as a strong hint, not a proof, on code that uses any of those.
- **Never `sed`/`perl` a structural Go change by hand.** None of these text tools have grammar awareness, so a pattern that happens to match inside a string literal or a comment gets rewritten right alongside real code.
- Always finish a bulk rewrite with `goimports`, even after a tool that claims to manage imports itself.

## 4. Structure-Discovery Tools (blast-radius mapping)

These feed the planning gate in [workflow.md](workflow.md) — map the blast radius before choosing a tool from the sections above.

| Tool | What it answers |
| --- | --- |
| `golang.org/x/tools/go/callgraph` (`rta`/`cha`/`static`/`vta` algorithms) | Who can reach this function, statically, across the whole build — algorithms trade precision for speed differently |
| gopls call hierarchy (`textDocument/prepareCallHierarchy`) | Incoming/outgoing calls for one symbol, interactively |
| `go_references` / `go_symbol_references` (gopls MCP) | Every reference to a symbol, from an agent context, without a full callgraph build |
| `go mod graph` | Module-level dependency edges — which modules require which, for blast radius that crosses module boundaries |

## Cross-References

- [catalog.md](catalog.md) — the Fowler refactoring catalog mapped to Go, with the tool from this file that mechanizes each entry.
- [workflow.md](workflow.md) — the planning gate this section's structure-discovery tools feed, and where a tool-driven step fits into the staged-PR process.


## Source Reference: `golang-refactoring/references/safety-net.md`

# The Coverage-Adaptive Safety Net

The right amount of caution before a refactor is not a fixed policy — it is gated on how well-tested the _blast radius_ already is, not on the project's global coverage number. A codebase sitting at 90% coverage overall can still have the one function you're about to touch at 0%, and a codebase at 30% overall can have your target function fully pinned by table-driven tests. Measure the code you're actually going to change, then pick the tier below.

## The Three Tiers

- **HIGH coverage on the blast radius (roughly ≥80% function coverage via `go tool cover -func`)** — refactor aggressively with tools, and trust the green bar.
  - Prefer gopls Rename/Inline/Extract, `eg`/`gofmt -r` for bulk mechanical changes, and generated `go/analysis` fixers over hand-edits.
  - Run the fast net (build/vet/test) after each step, and escalate to `-race`/`-bench` only when the step touches concurrency or a hot path.
  - Larger steps are acceptable here because a well-covered blast radius means the net catches a regression within one test run — the cost of being wrong is cheap and immediate, so there is little reason to slow down.
- **MEDIUM coverage (~40-80%)** — harden the blast radius before refactoring it, not after.
  - First measure exactly what the change touches: gopls references and call hierarchy tell you the real call graph, not the one you remember from reading the code (see the planning gate in [workflow.md](workflow.md)).
  - Add targeted table-driven or golden tests covering precisely those paths, confirm they pass against the current code, and only then refactor.
  - The step that's easy to skip and shouldn't be: re-run with `-coverprofile` afterward and check that the new tests actually exercise the lines you're about to change. A test that imports the right package but never reaches the branch you're editing gives false confidence — it looks like safety net from the outside and catches nothing.
- **LOW/ZERO coverage (<40%, or the specific touched lines are uncovered even if the package average looks fine) — Feathers mode** — write characterization (a.k.a. golden or pinning) tests _first_, capturing what the code actually does today, warts and all, before changing a single line.
  - This is deliberately not a correctness test — you are not asserting the code is right, only recording what it currently does so a refactor can be checked against it.
  - Find a seam (below) and introduce the minimum needed to make the code testable.
  - Restrict yourself to the safest, tool-verified refactorings only — gopls Rename and Inline, both behavior-preserving by construction — and avoid Extract or any cross-package move until a real net exists to check them against.
  - Prefer Sprout/Wrap (see [catalog.md](catalog.md)) to add new behavior in a new, tested function rather than editing untested code in place.
  - Running `deadcode -test` first is worth the two minutes — some of what looks like "untested code that needs a net" turns out to be exported API nothing actually calls, in which case the honest fix is deletion, not testing.

| Tier | Blast-radius coverage | Strategy | Allowed transforms |
| --- | --- | --- | --- |
| **High** | ≥80% function coverage | Refactor first, verify after each step | gopls Rename/Inline/Extract, `eg`/`gofmt -r`, generated `go/analysis` fixers |
| **Medium** | ~40-80% | Harden the touched paths, confirm green, then refactor | Same as High, once targeted tests exist and `-coverprofile` confirms they hit the touched lines |
| **Low/Zero** | <40%, or the touched lines specifically | Characterize first (Feathers mode), introduce a seam, refactor last | gopls Rename/Inline only; Sprout/Wrap for new behavior; no Extract or cross-package move until a net exists |

**Diagnose:** 1- `go test -covermode=atomic -coverpkg=./... -coverprofile=cover.out ./...` — runs the suite and produces a coverage profile scoped to the blast radius's packages 2- `go tool cover -func=cover.out` — ranks every function by coverage percentage; scan this for the specific functions you're about to touch, not the package-level average 3- `go tool cover -html=cover.out` — a visual red/green view of the exact touched lines, useful when `-func`'s percentage for a function is ambiguous about which branches are actually green

Two caveats worth internalizing before trusting any number this produces:

- **Go's coverage is statement coverage, not branch coverage** — a line inside an `if` block that ran once counts as fully covered even if the `else` never executed and even if a `switch` only ever hit one `case`. A function reporting 100% can still have an untested branch; treat the percentage as a floor on how much is exercised, not proof that the logic is correct, and read the actual branches in the code you're about to touch rather than trusting the summary.
- **`go test ./...` silently drops any package that has no `_test.go` file from the aggregate** — it isn't counted as 0%, it simply isn't in the report at all, which makes an untested package invisible instead of visibly red. Passing `-coverpkg=./...` (as in the Diagnose command above) forces every package in the module into the profile so a silently-untested dependency doesn't slip past the tier decision unnoticed.

## Seams — What to Introduce When There's No Net Yet

- A seam, in Michael Feathers's sense, is a place in the code where you can alter behavior without editing that exact spot.
- Seams are how Feathers mode gets a fake into a test without first performing the larger refactor the test is meant to protect against.
- Two seam types matter in Go:
  - An **object seam** is an interface, or a function-typed field or parameter, injected at the point of construction — a test substitutes a fake implementation through that injection point instead of exercising the real dependency. This is the seam type that matters most in Go, because interfaces are satisfied implicitly: introducing one at the point of use requires touching only the consumer, never the producer package, which means you can add a seam to legacy code without an invasive edit to whatever it depends on.
  - A **link/build-tag seam** swaps an entire implementation at build time via `//go:build` constraints; it's used far more rarely, mostly for platform- or environment-specific substitutions where an interface would be overkill.
- The enabling move for untested code with no seam yet: extract the smallest possible interface — often just one method — at the exact call site where the untested code depends on something external (a database client, the filesystem, a clock), and inject the concrete implementation through a constructor parameter instead of constructing it inline.
  - This single move does two things at once: it breaks a potential import cycle between the consumer and whatever concrete type it depended on, and it opens the door for a fake in a characterization test, without requiring any change to the producer side at all.

```go
// Before — no seam: NewReport constructs its own client, so a test
// exercising Generate has no way to substitute a fake and is stuck
// hitting a real database.
func NewReport(dsn string) *Report {
    db, _ := sql.Open("postgres", dsn)
    return &Report{db: db}
}

func (r *Report) Generate(ctx context.Context, id int) (Summary, error) {
    row := r.db.QueryRowContext(ctx, "SELECT ... WHERE id = $1", id)
    // ...
}

// After — a one-method interface extracted at the point of use;
// the concrete *sql.DB already satisfies it implicitly, so the
// producer package needs no change at all.
type rowQuerier interface {
    QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func NewReport(db rowQuerier) *Report {
    return &Report{db: db}
}

func (r *Report) Generate(ctx context.Context, id int) (Summary, error) {
    row := r.db.QueryRowContext(ctx, "SELECT ... WHERE id = $1", id)
    // ... unchanged — a characterization test can now inject a fake rowQuerier
}
```

→ See `samber/cc-skills-golang@golang-design-patterns` skill for constructor and dependency-injection patterns this move builds on, and [catalog.md](catalog.md) in this skill for the Sprout/Wrap mechanics that typically pair with a freshly introduced seam.

## Verification Command Reference

This is the fast net from the Core Loop in [SKILL.md](../SKILL.md), escalated only as far as the change actually requires:

```bash
go build ./...                              # fastest gate — compile errors
go vet ./...                                 # correctness checks the compiler doesn't do
go test ./...                                # full test suite
go test -run TestName ./pkg/...              # target one test while iterating
go test -race ./...                          # concurrency changes — see samber/cc-skills-golang@golang-testing for race-detector and testing/synctest mechanics
go test -covermode=atomic -coverpkg=./... -coverprofile=cover.out ./...
go tool cover -func=cover.out                 # per-function and total coverage, ranked
go tool cover -html=cover.out                 # visual red/green source view
go test -bench=. -benchmem -count=10 > new.txt   # capture before AND after with the same command, then:
benchstat old.txt new.txt                     # `~` means no statistically significant difference — the desired result for a behavior-preserving refactor; anything else is a signal to stop and investigate, not noise to shrug off
```

## Cross-References

- → See `samber/cc-skills-golang@golang-testing` skill for general test-writing craft, race-detector mechanics, and `testing/synctest` — this file assumes them as a baseline and only covers when a refactor's safety net needs to reach for them.
- → See `samber/cc-skills-golang@golang-benchmark` skill for interpreting a `benchstat` delta and the full profiling methodology.
- [catalog.md](catalog.md) — the Fowler refactoring catalog mapped to Go, including the Sprout/Wrap entries referenced in the Feathers-mode and seams sections above.
- [workflow.md](workflow.md) — the planning gate that measures the blast radius this file's tiers are gated on, and the human-checkpoint rule for touching untested code.


## Source Reference: `golang-refactoring/references/structural.md`

# Structural Constraints: Import Cycles, Package Boundaries, Type Moves, API Evolution

Go enforces a handful of structural rules at compile time that other languages leave to convention or linting. This file covers the load-bearing ones: why import cycles are a hard error rather than a warning, how to design a package boundary so it doesn't need to be redesigned again, the officially-blessed mechanism for moving a type across packages without breaking every caller at once, and how to evolve an exported API without a flag day.

## Table of Contents

- [Breaking Import Cycles](#breaking-import-cycles)
  - [1. Consumer-side interface (dependency inversion)](#1-consumer-side-interface-dependency-inversion)
  - [2. Extract shared types to a new/lower package](#2-extract-shared-types-to-a-newlower-package)
  - [3. `internal/` packages](#3-internal-packages)
  - [4. Mediator/bridge package](#4-mediatorbridge-package)
- [Package Boundary Design](#package-boundary-design)
  - [Splitting a god package](#splitting-a-god-package)
- [Moving Types Across Packages: Type Aliases for Gradual Code Repair](#moving-types-across-packages-type-aliases-for-gradual-code-repair)
- [Exported API Surface and Versioning](#exported-api-surface-and-versioning)
- [`init()`, Global State, and Package-Level Vars as a Refactoring Target](#init-global-state-and-package-level-vars-as-a-refactoring-target)
- [Generics — When a Refactor Toward Them Is Warranted](#generics--when-a-refactor-toward-them-is-warranted)
- [Common Mistakes](#common-mistakes)
- [Cross-References](#cross-references)

## Breaking Import Cycles

- Go compiles packages leaf-to-root in dependency order: before compiling package `X`, the compiler must have already finished compiling everything `X` imports, because it needs their compiled type information to type-check `X`.
- An import cycle — `X` imports `Y`, `Y` imports `X` (directly or transitively) — has no valid compilation order, so `go build` rejects it outright as `import cycle not allowed`. This is not a style preference; there is no fallback behavior to fall back to.

Four strategies fix a cycle, in preference order:

| # | Strategy | Call-site cost | Best when |
| --- | --- | --- | --- |
| 1 | Consumer-side interface | None — no call site changes anywhere | The consumer only calls one or two methods on the producer's type |
| 2 | Extract shared type to a leaf package | Import path changes on both sides | Both packages genuinely need the _same concrete type_, not just its behavior |
| 3 | `internal/` package | Import path changes for the shared code only | The shared code should never become part of the public API |
| 4 | Mediator/bridge package | New package, both sides delegate to it | 1–3 don't fit the shape of the coupling |

### 1. Consumer-side interface (dependency inversion)

- The idiomatic first move, and the cheapest one, because it requires zero changes at any call site anywhere in the codebase.
- If package `x` only _uses_ behavior from package `y` — it calls a method or two on `y`'s concrete type, it doesn't need the type itself — define a small interface in `x` naming just those methods.
- Go's implicit interface satisfaction means `y`'s existing type already satisfies that interface without `y` importing anything from `x` or even being aware `x`'s interface exists:

```go
// package x (consumer)
type Storer interface {
    Store(ctx context.Context, key string, val []byte) error
}

func Process(s Storer) error { /* uses s.Store, no import of package y */ }
```

```go
// package y — unchanged, already satisfies x.Storer implicitly
type Store struct{ /* ... */ }
func (s *Store) Store(ctx context.Context, key string, val []byte) error { /* ... */ }
```

- `x` no longer imports `y` at all; `y` never imported `x` to begin with.
- The cycle is gone because one direction of the dependency graph was never real — `x` never needed `y`'s concrete type, only a name for the behavior it called.

### 2. Extract shared types to a new/lower package

- Works because Go's package model is flat within a module — a nested subdirectory is still a fully distinct, independently importable package — so pulling the types both `x` and `y` need into a small new leaf package that both can import breaks the cycle by construction: the leaf package imports neither.
- Be honest about the cost: in a real codebase a single cycle can span five or more packages once you trace every type both sides share, so this is the "correct but sometimes painful" option next to the surgical, call-site-free consumer-side interface above.

### 3. `internal/` packages

- Share code between related packages without widening the public API.
- Anything rooted under an `internal/` directory is importable only by packages rooted at the parent of that `internal/` directory — this lets two sibling packages share implementation detail through a common `internal/` package without either becoming part of the module's public surface, and without pulling either sibling into the other.

### 4. Mediator/bridge package

- A last resort when 1–3 don't fit the shape of the dependency: a new package holding the shared functionality that both `x` and `y` delegate to, absorbing the coupling neither side wants to own.
- Reach for this only after confirming a consumer-side interface can't express the relationship — it usually can.

An `internal/` layout for strategy 3 looks like this — note that both `billing` and `shipping` can import `order/internal/model`, but nothing outside the `order` tree can:

```
order/
├── billing/
│   └── billing.go        // imports order/internal/model
├── shipping/
│   └── shipping.go        // imports order/internal/model
└── internal/
    └── model/
        └── order.go        // shared type, invisible outside order/
```

## Package Boundary Design

- **Accept interfaces, return structs.**
  - Accepting a narrow interface as a parameter maximizes what a caller can pass — including a test fake that implements only the one or two methods the function actually calls — without the function ever needing to import the caller's concrete types.
  - Returning a concrete struct preserves full type information at the call site, which matters because _that_ caller's own consumers get to define their own narrow interface later, on their side, without the original producer ever having had to anticipate what subset of behavior a future caller would need.
- **Define interfaces where they are consumed, not where they are implemented.** The companion rule, and the one that actually prevents cycles rather than just describing good taste.
  - A consumer package declares the interface naming only the methods it calls; the producer package never imports it, never knows it exists, and satisfies it purely because Go's interface satisfaction is structural.
  - This is exactly the mechanism in the consumer-side-interface fix above — it isn't a separate rule, it's the same rule applied proactively during design instead of reactively during a cycle break.
- **Caveat: this is a heuristic, not dogma.**
  - Don't mechanically split every struct into an interface-plus-implementation pair on the theory that it's "more testable" — a concrete struct with no interface is simpler to read, and an interface with exactly one implementation and no test-double need is pure indirection.
  - Don't return an interface from a constructor just because "it might be more flexible later" — that flexibility has a name (YAGNI) and a cost (the caller loses type information it might have wanted).
  - → See `samber/cc-skills-golang@golang-project-layout` skill for the directory/package layout conventions this section assumes, and `samber/cc-skills-golang@golang-design-patterns` skill for judging when introducing an interface is the right call versus premature abstraction.

### Splitting a god package

- Before reaching for a full package split, gopls's `refactor.extract.toNewFile` code action handles the lighter-weight case: moving a top-level declaration to a new file in the _same_ package, which is often enough to make a bloated package navigable without touching its import graph at all.
- gopls also has an experimental `source.splitPackage` code action that assigns top-level declarations to acyclic components as a starting point for an actual package split — treat its output as a draft partition to review, not a final answer, since it can't know which grouping matches the domain boundaries you actually want.

## Moving Types Across Packages: Type Aliases for Gradual Code Repair

- This is the single most load-bearing Go-specific refactoring technique, and it exists because of a problem unique to Go's type system: type identity is tied to the fully-qualified name, so `pkg2.T` is a genuinely different type from `pkg1.T` even when their underlying definitions are byte-for-byte identical.
- You cannot assign one to the other, cannot use one where the other is expected, and — unlike a moved function (re-exportable as a thin wrapper) or a moved variable/constant (re-declarable pointing at the new location) — there was no way to migrate callers gradually.
- Before Go 1.9 this blocked real large-scale refactors: moving a type meant a single atomic commit touching every call site in the module, because there was no intermediate state where both the old and new names worked.

The fix is `type A = B` — a **type alias**, not a new named type.

- It declares that `A` and `B` are the _same_ type, not merely convertible: code written against the old name and code written against the new name interoperate exactly, with zero runtime cost and no wrapper function needed anywhere.
- This was added to the language specifically, per its own design proposal, to "enable gradual code repair during large-scale refactorings, in particular moving a type from one package to another in such a way that code referring to the old name interoperates with code referring to the new name."

The migration recipe, as a fixed sequence:

```go
// Step 1 — new package: introduce the real definition in its new home.
package newpkg

type NewName struct {
    // ... real fields
}
```

```go
// Step 2 — old package: replace the original declaration with an alias,
// and mark it deprecated so tooling and IDEs surface the migration.
package oldpkg

// Deprecated: use newpkg.NewName instead.
type OldName = newpkg.NewName
```

1. Introduce the type in its new home package with its real definition.
2. In the old package, replace the original type declaration with an alias to the new one, and mark it `// Deprecated: use newpkg.NewName instead` — a doc comment recognized by tooling and editors.
3. Migrate callers to the new import path incrementally, one PR or one package at a time. Both names remain fully valid and interchangeable throughout this entire period — there is no flag day, no big-bang commit, and no window where some callers are broken while others are fixed.
4. Once nothing references the old name, delete the alias.

Go 1.24 extended type aliases to carry type parameters, so this same recipe applies unchanged when the type being moved is generic.

## Exported API Surface and Versioning

- **Deprecate before deleting.** A doc comment beginning `// Deprecated: ...` is recognized by tooling and IDEs and surfaces as a strikethrough or warning at every call site, which gives callers time to migrate before the symbol disappears — deleting an exported identifier outright breaks every downstream module at their next `go build` with no warning beforehand.
- **Prefer additive changes.** Go's own compatibility promise sets the default posture: prefer additive changes (new function, new optional field, new method) over changing an existing signature, because additive changes never break an existing caller. A change that must break existing callers is not a minor version bump — it's a new major version.
- **Semantic import versioning** is how Go expresses that: a v2+ module carries a `/vN` suffix in both its module path and every importer's import path (e.g. `example.com/mod/v2`).
  - This is what lets v1 and v2 of the same module coexist in the same build — the two are, to the toolchain, simply different packages with different import paths.
  - It's what lets callers migrate one package at a time rather than all at once, the same gradual-migration property a type alias gives you _within_ one version, now applied _across_ major versions.
  - During the transition, the v2 implementation can be written as a thin wrapper over v1 (or vice versa, whichever side holds the canonical logic) to avoid maintaining two divergent copies of the same behavior.
- **`retract` directives** mark an already-shipped defective version as unfit for use in `go.mod` — `go get` and `go list -m -u` surface the retraction to anyone who depends on it, without requiring the broken version to be deleted from the module proxy:

```
module example.com/mod

go 1.24

retract (
    v1.2.0 // published with a data-loss bug, see #123
    [v1.2.1, v1.2.3] // range retraction — a whole span of bad releases
)
```

## `init()`, Global State, and Package-Level Vars as a Refactoring Target

- `init()` ordering and mutable package-level state are a common source of hidden coupling: a caller of a function has no way to see, from the call site, that the function's behavior depends on some other package's `init()` having already run, or on a global variable some unrelated code path mutated earlier in the program's lifetime.
- That coupling doesn't show up in a signature, so it doesn't show up in a diff, and it's exactly the kind of dependency that makes a piece of code unsafe to move or test in isolation.
- The refactor is toward explicit construction: a constructor function that returns a struct, with dependencies passed in as parameters rather than reached for through a package-level variable or `init()`-populated singleton.
  - This doesn't remove the dependency — the code still needs what it needed before — it makes the dependency an explicit, visible seam in the function signature instead of an implicit one buried in the package's `init()`.
  - → See `samber/cc-skills-golang@golang-design-patterns` skill for constructor and dependency-injection patterns, and [safety-net.md](safety-net.md) in this skill for how this same seam is what a Feathers-style characterization test exploits to get coverage before a risky change.

## Generics — When a Refactor Toward Them Is Warranted

- Narrower case, briefly: introduce a type parameter only when the _logic_ is genuinely identical across types, not merely similar.
- When the _behavior_ differs per type — even by one branch — that's an interface, not a generic; a generic with a type switch inside it is usually an interface wearing a disguise.
- A practical litmus test: reach for a generic when a type parameter would eliminate a type assertion that's currently in the code, and the constraint it needs stays narrow — `comparable`, `cmp.Ordered`, or a small one-method interface.
- Write the concrete version first; refactor to generic only once the duplication is real and already committed in two or more places, not anticipated for a future third caller that may never arrive.
- As of this writing, Go has no method-level type parameters, which blocks fluent generic method chaining (`Map` returning a differently-typed receiver) as a design option — plan around that limitation rather than discovering it mid-refactor.
- Verify a generics migration the same way as any other refactor, no special-casing: `go build ./... && go vet ./...` plus the full test suite for the touched packages.

## Common Mistakes

| Mistake | Fix | Why |
| --- | --- | --- |
| Moving a type by defining `type OldName NewName` (a new named type) instead of `type OldName = NewName` | Use `=` — a real type alias | Without `=` this declares a _distinct_ type; every existing value of the old type now fails to assign to the new one, which is the exact break the alias was supposed to avoid |
| Breaking a cycle by moving the _producer's_ concrete type into the consumer's package | Define the interface in the consumer instead, leave the producer's type where it is | Moving the concrete type usually just relocates the cycle to whatever else the producer's type depends on |
| Deleting an exported symbol in the same PR that deprecates it | Deprecate first, land, wait for a release cycle, delete later | Callers outside the module have no chance to react to a deprecation notice they never saw before the symbol vanished |
| Bumping a module to v2 without adding `/v2` to the module path | Add the `/v2` suffix to both `go.mod`'s `module` line and every import path | Without the suffix, Go's module resolution can't tell the new major version apart from the old one, and existing v1 importers silently get pulled onto breaking code on their next `go get -u` |
| Reaching for a generic the first time a second, similar-looking function appears | Wait for a third real occurrence with identical logic, or an existing type assertion the generic would remove | Two occurrences are often coincidentally similar rather than logically identical; a premature generic ossifies an abstraction around a coincidence |

## Cross-References

- → See `samber/cc-skills-golang@golang-project-layout` skill for directory/package layout conventions.
- → See `samber/cc-skills-golang@golang-design-patterns` skill for when an interface is the right design choice versus premature abstraction, and for constructor/DI patterns.
- → See [catalog.md](catalog.md) in this skill for the Fowler catalog entries (Extract Interface, Change Function Declaration, Move Function) these structural moves build on.
- → See [workflow.md](workflow.md) in this skill for staging a cross-package move or package split as an ordered sequence of small PRs.


## Source Reference: `golang-refactoring/references/workflow.md`

# Refactoring Workflow — Plan, Stage, Land

- A refactor of any real size is a choreography problem before it is a coding problem.
- This file covers: how to plan the sequence, order the steps so they don't collide, stage them as small human-reviewed PRs, and persist the plan itself — in the code, not just in a conversation that will eventually run out of context — for the intermediate states that are deliberately imperfect and for the ideas that would otherwise be lost.

## Table of Contents

- [1. The Planning Gate (mandatory, before any edit)](#1-the-planning-gate-mandatory-before-any-edit)
- [2. Three Interacting Orderings](#2-three-interacting-orderings)
  - [Parallel vs. sequential — decision checklist](#parallel-vs-sequential--decision-checklist)
- [3. The Git Model](#3-the-git-model)
- [4. Parallel vs. Sequential Execution](#4-parallel-vs-sequential-execution)
- [5. The `// REFACTOR(step N): ...` Marker Convention](#5-the--refactorstep-n--marker-convention)
- [6. Workflows (`ultracode`) vs. Human-in-the-Loop](#6-workflows-ultracode-vs-human-in-the-loop)
- [7. Human Checkpoints](#7-human-checkpoints)
- [Cross-References](#cross-references)

## 1. The Planning Gate (mandatory, before any edit)

**Thinking mode:** reason as thoroughly as possible here — on Claude Code, use `ultrathink` to trigger extended thinking explicitly. A wrong ordering call does not surface as an obviously wrong plan — it surfaces later as a broken build or a conflict-riddled merge, once several PRs are already in flight. Getting the sequencing right up front is cheaper than untangling it after the fact.

- Before touching a single line of code, map the blast radius with gopls:
  - find every reference to the symbols you intend to change
  - walk the call hierarchy in both directions
  - check the package's exported API surface for anything an external module might depend on
- Workspace symbol search and `gopls codeaction` surface the mechanical options available at each site — its day-to-day mechanics (rename, browsing references, call hierarchy) are owned by the `samber/cc-skills-golang@golang-gopls` skill.

Once the blast radius is mapped, turn it into a **refactoring inventory** — one row per atomic change, so the whole refactor is visible as a single artifact before any PR exists:

| Transform | Files / callers touched | Risk | S/B |
| --- | --- | --- | --- |
| Extract `validateOrder` from `ProcessOrder` | `internal/orders/process.go` (1 file, no external callers) | Low | S |
| Rename `Client.Send` → `Client.Publish` | `pkg/client/*.go`, 14 call sites across 3 packages | Low | S |
| Break import cycle `billing` ↔ `orders` via consumer-side interface | `internal/billing/service.go`, `internal/orders/service.go` | High | S |
| Move `Invoice` type to `pkg/billing`, alias from old location | `internal/orders/invoice.go` → `pkg/billing/invoice.go`, ~9 call sites | High | S |
| Replace `Invoice.Total`'s O(n²) discount-lookup loop with a map lookup | `pkg/billing/invoice.go` | Medium | S |
| Switch `Invoice.Total` computation to Decimal instead of float64 | `pkg/billing/invoice.go` and its tests | Medium | B |

- Risk tiers match the Risk Stratification table in `SKILL.md` (Low/Medium/High).
- The **S/B** column marks each row Structural or Behavioral in Kent Beck's sense — a change that alters code shape without altering observable behavior versus a change that alters what the code does.
- **Never let one PR carry both letters.** A rename and a bug fix touching the same function are two rows, two PRs, two review postures.
- The same one-row-one-concern discipline holds even within a single letter:
  - the move and the loop-optimization rows above are both marked S, but they still earn two separate rows and two sequential PRs
  - a move is verified by gopls plus a green build/test run, while an optimization needs benchmarks (→ See `samber/cc-skills-golang@golang-benchmark` skill) and a closer read for subtle correctness changes
  - bundling them asks one reviewer to do both jobs at once and denies the move the fast review it earns on its own
  - they also touch the same file, so Ordering (b) below puts them in sequence regardless — never split a move-then-optimize pair across parallel worktrees
- The inventory is not busywork — it is the object every later ordering decision is computed from, and it is what you show the human for sign-off.

**This step ends with explicit user sign-off before any code is touched.** This is a hard gate, not a suggestion: present the inventory and the staged PR plan derived from it (see below), and wait for approval. A refactor that starts moving code before the human has seen the shape of the whole plan cannot be course-corrected cheaply — by the time a wrong assumption surfaces, several PRs may already be staged on top of it.

## 2. Three Interacting Orderings

Once the inventory is approved, three independent ordering concerns combine to produce the final sequence. Each answers a different question, and a plan that gets one right while ignoring the others still fails.

| Ordering | Question it answers | Why it matters |
| --- | --- | --- |
| **(a) Beck ordering** | Within a dependency chain, does this row change structure or behavior? | Structural first, behavioral last. `git blame` stays meaningful — the last change touching a line is the one a future reader actually needs to understand, not an incidental rename that happened to pass through. It also lets reviewers wear one hat at a time: a structural PR gets a fast, low-scrutiny pass (is this reversible? did tests stay green?), a behavioral PR gets full scrutiny (does this do the right thing?). Mixing the two forces every reviewer into both postures on every PR. |
| **(b) Conflict-avoidance ordering** | Do two rows touch the same files or the same symbols/callers? | PRs sharing files or symbols must land sequentially — one merges to the refactoring branch before the next starts — or the second PR is rebasing against a moving target for its whole review cycle. PRs that are file-disjoint can run in parallel worktrees with no coordination cost. |
| **(c) Dependency ordering** | Does this row require structural groundwork from another row first? | Breaking an import cycle, extracting a shared package, or introducing a type alias for a cross-package move are prerequisites, not peers — you cannot move a function into a package that would still form a cycle. These rows must land before anything that assumes the groundwork is already there. |

- **A workspace-wide gopls rename is a barrier.**
  - Because it rewrites every reference to a symbol across the whole tree, it necessarily touches files that any other in-flight change might also touch — there is no way to know in advance that it is file-disjoint from everything else in the inventory.
  - Schedule it alone: land every other ready PR before it starts, or hold every other PR until it lands.
  - Do not attempt to run a tree-wide rename concurrently with anything else, even a change that looks unrelated.

### Parallel vs. sequential — decision checklist

Run this checklist for every pair of inventory rows you're considering executing at the same time:

| Question | If yes |
| --- | --- |
| Do the two changes touch the same file? | Sequential |
| Do they touch the same symbol, or one's callers overlap the other's? | Sequential |
| Does one depend on structural groundwork the other lands (cycle break, extracted package, alias)? | Sequential — groundwork first |
| Is either change a workspace-wide rename? | Sequential — the rename runs alone |
| None of the above | Safe to parallelize in separate worktrees |

If any answer is yes, the two rows are sequential. Only when every answer is no is it safe to run them concurrently.

## 3. The Git Model

- This is a deliberate, explicit choice for staged refactors — not the only way to refactor, and not necessarily how every Go team runs things day to day.
- Many teams instead land small, independent PRs directly on a fast-moving trunk, treating each one as complete and shippable on its own. That works well when changes are truly independent.
- The model below is chosen here because a _staged_ refactor is not a set of independent changes — it is one coherent transformation broken into reviewable steps, and it needs a place to accumulate before the whole thing is ready to expose to `main`.
- Reviewability and a human-in-the-loop checkpoint on every step are the tradeoff being made; the cost is an extra integration branch and a final merge step.

The shape:

1. Create a long-lived `refactor/<topic>` branch off `main`, and seed it with `// REFACTOR(step N): ...` markers for the plan itself — see Step 5.
2. For each atomic change in the inventory, in the order established in Step 2, **dispatch it to a sub-agent** rather than executing it directly in the orchestrating session. The sub-agent, scoped to a fresh worktree, does the work:
   - Enter a fresh, isolated worktree.
   - Create a branch for that one change, based on the current tip of `refactor/<topic>`.
   - Apply the single change — and nothing else. If the inventory row is turning out larger than **~100–500 lines**, that's a signal it's actually two rows: split it before it grows into a diff nobody can review in one sitting.
   - Verify: `go build ./... && go vet ./... && go test ./...` (add `-race` or `benchstat`-backed `-bench` per the Risk Stratification table in `SKILL.md`).
     - A staged refactor produces many small PRs in sequence, so weigh the project's actual CI duration against the pace of the refactor: if CI is slow enough that waiting on it between steps would meaningfully stall the sequence — a few minutes is rarely worth front-loading, but a pipeline that takes much longer, repeated across many staged PRs, adds up fast — run the same checks locally first and let CI serve as the final confirmation rather than the primary feedback loop.
     - If CI is already fast, there's no need to duplicate it locally.
   - Open a **PR targeting the refactoring branch**, not `main` — ready for review, not a draft, since the whole point of staging is for the human to review and merge it promptly:

     ```bash
     gh pr create --base refactor/<topic> --title "..." --body "..."
     ```

   - The orchestrating session's own context is the scarcest resource across a long refactor — spending it on every intermediate edit, failed attempt, and tool-output while executing one row leaves less of it for tracking the other rows still ahead and for the ordering decisions in Step 2.
   - Have the sub-agent report back a short result (pass/fail, verification output, PR link) and keep that in the orchestrating session's context — not the sub-agent's full working transcript.
3. A human reviews and merges each of these small PRs into `refactor/<topic>` at their own pace.
   - Structural PRs should move fast; behavioral PRs get full scrutiny (see Beck ordering above).
   - For any PR that changes code logic rather than just its shape, load `samber/cc-skills-golang@golang-security` (and `golang-safety` for internal-correctness risk) alongside this skill before approving it, since a logic change can introduce a vulnerability or a bug that a purely mechanical refactor never could.
4. Only once every row in the inventory has landed on `refactor/<topic>` — and the TODO-marker sweep in Step 5 is clean — open the **final PR** merging `refactor/<topic>` into `main`, and open this one **as a draft**: unlike the intermediate PRs, it represents the whole completed transformation and deserves a slower, more deliberate final look before it's marked ready.

**Never merge an intermediate PR directly to `main`.** The refactoring branch is the integration point for the entire duration of the refactor; `main` only ever sees the whole, completed transformation in one final merge. An intermediate PR landing directly on `main` defeats the purpose of staging — it exposes a deliberately incomplete state (aliases still in place, shims not yet removed) to every other branch built off `main` in the meantime.

## 4. Parallel vs. Sequential Execution

- When multiple inventory rows are ready — their dependency-order prerequisites have landed, and the checklist in Step 2 says "no" on every question — launch them concurrently, one sub-agent per row, each in its own worktree, its own branch off the current tip of `refactor/<topic>`, and its own PR.
  - This is where a large refactor's wall-clock time actually shrinks: three file-disjoint structural changes reviewed at once cost the same calendar time as one — and the orchestrating session still only keeps three short results, not three full working transcripts.
- When rows overlap — same file, same symbol, or a dependency relationship — run them one at a time: land the first on `refactor/<topic>` before branching the second off the new tip.
  - Trying to parallelize overlapping rows just moves the conflict from merge time to rebase time, and a human reviewer now has to untangle a diff that mixes two unrelated changes.
- The workspace-wide-rename-is-a-barrier rule from Step 2 applies here without exception: never schedule a tree-wide rename alongside any other in-flight worktree, regardless of how unrelated the files look on paper.

## 5. The `// REFACTOR(step N): ...` Marker Convention

The marker has two jobs, and the first matters more than it looks.

- **Job 1 — surviving context loss.** A multi-step refactor eats context fast:
  - it can span many sessions, and each new session (or a different agent picking up the work) starts with a fresh, limited context window that has no memory of the planning conversation
  - a conversation is a bad place to keep a plan safe; the codebase, committed to the refactoring branch, is not
  - so right when you create `refactor/<topic>` (Step 3), before any change lands, seed it liberally with markers at every point the inventory identifies future work, an idea worth not losing, or a decision that won't be obvious from a later diff — not only at points of deliberate imperfection
  - a marker survives exactly the kind of context loss a plan that only ever existed in conversation does not
  - **Skip this for a small refactoring.** A single-PR change, or the simple mechanical sweep in Section 6, doesn't have a plan large enough to be worth losing — seeding markers there is noise, not insurance. Reserve liberal marker-seeding for staged, multi-PR refactors, where the plan is genuinely too large to trust to any one session's memory.
- **Job 2 — flagging deliberate imperfection.** A staged refactor will, by design, pass through intermediate states that are imperfect on purpose — a type alias kept around so callers can migrate one PR at a time, a shim left in place until a later step removes it, an old code path still reachable until its last caller is gone.
  - **This is fine and expected.** The risk isn't the imperfection — it's forgetting about it once the PR that introduced it has merged and attention has moved on.

Mark every such spot — a plan note or a deliberate imperfection — with a comment that names the step and the reason:

```go
// REFACTOR(step 3): remove this alias once all callers in pkg/foo migrate to bar.New (see refactor/<topic>)
```

- Each marker earns its place twice over: it tells a reviewer looking at _this_ PR that the current state is intentional, not an oversight, and it hands context forward — to whichever later step, later PR, or entirely different agent session eventually acts on it — about exactly what is pending and why.
- Without it, a shim that "temporarily" bridges old and new callers has a way of becoming permanent simply because nothing points back at it, and an idea from the planning gate has a way of vanishing the moment the session that had it ends.

The **final sweep**, run just before opening the PR that merges `refactor/<topic>` into `main`, must find zero remaining markers:

```bash
grep -rn "REFACTOR(" .
```

**Diagnose:** `grep -rn "REFACTOR(" .` — must return no results before the final merge to `main`; any hit means a planned step never landed, and the refactor is not actually done even though every individual PR merged cleanly.

## 6. Workflows (`ultracode`) vs. Human-in-the-Loop

- Claude Code's Workflow feature (`ultracode`) orchestrates multiple sub-agents across multiple stages automatically, with no human checkpoint between them.
- That is exactly the wrong shape for a staged refactor, whose entire value proposition is a human reviewing and merging each small PR _before_ the next step is allowed to build on it.
- Running a multi-step refactor through Workflows collapses the review checkpoints this whole document exists to preserve — by the time a human looks at anything, several dependent stages may have already executed on top of a decision nobody signed off on.
- Reach for Workflows/`ultracode` only when the refactor is genuinely a **single mechanical sweep in one pass** — one `gofmt -r` rule, one `eg` template, or one `modernize`-style fixer applied tree-wide, verified green by the build/vet/test loop, with nothing else in the inventory depending on it.
  - That case has no staging problem to begin with: there is exactly one step, and it either lands or it doesn't.
- For anything requiring progressive review across multiple merges — which is the common case for a real refactor — use the worktree + PR + human-review flow in Steps 3 and 4 instead, and do not reach for Workflows.

## 7. Human Checkpoints

The same triggers as `SKILL.md`'s "Pause for human sign-off before" list apply here — cross-package moves, exported-API changes, deletions, new major versions, untested code — and they're not one-time: get sign-off on each one again if it comes up mid-refactor, even after the planning gate has already been cleared once. For untested code specifically, that means sign-off on the characterization-test baseline (see [safety-net.md](safety-net.md)) before refactoring it, not after.

Structural-only PRs are reversible and low-risk by construction (Beck's separation is the whole reason they're safe to move fast on) and can be fast-reviewed. Behavioral PRs — anything that changes what the code does, not just how it's shaped — get full scrutiny every time, regardless of how small the diff looks.

## Cross-References

- [catalog.md](catalog.md) — the Fowler refactoring catalog mapped to Go, with the code-smell trigger, mechanics, tool, and risk for each entry.
- [go-tooling.md](go-tooling.md) — gopls code actions, CLI invocation, `gofmt -r`, `eg`, `gopatch`, and `go/analysis` fixers referenced throughout the inventory examples above.
- [safety-net.md](safety-net.md) — the coverage-adaptive strategy and characterization-testing recipes referenced in the Human Checkpoints section.
- [structural.md](structural.md) — import-cycle breaking, package-boundary design, and the type-alias gradual-repair mechanism referenced in the inventory example above.
- → See `samber/cc-skills-golang@golang-security` skill (and `golang-safety`) for reviewing any PR that changes code logic, per Step 3 above.

