# Stack decisions

Every contested choice, with the reason it went that way for this project. Written as a reference so
the arguments do not get re-litigated.

## The nine arbitrations

| Debate | Choice | Why for us |
|---|---|---|
| TS 6 vs 7 | **TypeScript 6, installed as `npm:@typescript/typescript6`** | `typescript@latest` is now 7.x, so `"typescript": "6.0.3"` does not resolve; the 6 line ships under its own package name. TS 7 shipped without a compiler API, which breaks `typescript-eslint` (peer `<6.1.0`) and `dependency-cruiser`. Those are our two most important gates, and losing `no-floating-promises` and boundary enforcement to gain compile speed on a single app is a bad trade. **Re-evaluation trigger, not a permanent position:** typescript-eslint declaring TS 7 support, or dependency-cruiser shipping it. The ecosystem is leaving this line faster than "migrate at 7.1" implies. |
| ESLint vs oxlint / Biome | **ESLint 10 + typescript-eslint** | `eslint-config-next` bundles `eslint-plugin-react-hooks@7`, which surfaces React Compiler diagnostics. No equivalent elsewhere. oxlint has 23 Next rules and `exhaustive-deps`, but its JS-plugin performance cliff falls exactly on the React Compiler plugin. Add oxlint as a pre-pass later, if lint exceeds 30 seconds. |
| dependency-cruiser vs ESLint boundary plugins | **Both, distinct roles** | dependency-cruiser is the CI gate: the only one catching all four evasion vectors including dynamic `import()`. Core `no-restricted-imports` is the editor hint, instant feedback, leaky by design. `import 'server-only'` is the third layer and fails the bundle rather than the linter. |
| `eslint-plugin-import` vs `import-x` | **Neither** | The debate does not apply: `no-restricted-paths` is already covered by dependency-cruiser. Avoiding a dependency in an unresolved ecosystem is itself a decision. |
| Pre-commit hooks | **Advisory only, formatter, `exit 0`** | The Angular pattern. An agent that commits must never be blocked mid-loop. CI is the gate. |
| Coverage gating | **Patch only, never a required check** | `patch: 80%, threshold 5%`; `project: auto, threshold 1%`. No global threshold: deleting a well-tested module would fail an unrelated PR. Never required, because you do not want to negotiate with a coverage tool at 2am. Alternative with no tool: Vitest `coverage.thresholds` with `autoUpdate: true`, a pure ratchet with no number to pick. |
| Copy-paste detection | **jscpd, loose ratchet** | 70 tokens, 8 lines, 5 percent threshold, tests and generated code excluded, `mode: weak`. The default of 50 tokens is far too sensitive for TSX, where every JSX attribute is tokens. Sonar's widely deployed default is 100 tokens, 10 lines, 3 percent on new code only. **Never gate at zero**: it will fire on App Router scaffolding within a week and get disabled, which is worse than not having it. Our case, solo plus agents, is exactly the population where the duplication research holds. |
| Conventional Commits | **PR title lint only** | We squash merge, so linting every commit is theatre and it blocks agents. |
| App versioning | **None** | Git SHA exposed at `/api/health`. Changesets itself removed private package versioning by default in July 2026. This is an app, not a library: there is no public API to semver, so versions are deployment identifiers. |

## TypeScript config

On, and worth the friction:

`strict` (default in TS 6) · `noUncheckedIndexedAccess`, the highest-value non-default flag because
agents index arrays and env without guarding · `noUnusedLocals` and `noUnusedParameters`, which target
orphaned imports directly · `noImplicitOverride`, `noImplicitReturns`,
`noFallthroughCasesInSwitch`, all near free · `verbatimModuleSyntax`, which forces `import type` and
prevents a type import surviving into the runtime bundle, a security property here rather than a style
one · `erasableSyntaxOnly`, which bans enums and namespaces, the TS constructs agents reach for out of
habit · `isolatedModules`, required by the bundler anyway.

Off, deliberately:

`exactOptionalPropertyTypes`, because the React ecosystem never absorbed it. Every
`<C prop={maybeUndefined} />` errors unless the library types `prop?: T | undefined`, and there are
long-standing open issues against MUI, Headless UI and React Aria. `@tsconfig/strictest` enables it
and Total TypeScript declines to recommend it; the ecosystem followed the second.
`noPropertyAccessFromIndexSignature`, mostly aesthetic once env is parsed through a schema.

Three settings that fail silently if forgotten:

- `"types": ["node"]` is required. TS 6 no longer auto-discovers.
- `paths` are written `"./src/*"`. TS 7 removes `baseUrl`, and boundary tooling that resolves `@/`
  through it **fails open** when resolution breaks, meaning the gate silently passes.
- `next lint` was removed in Next 16 and `next build` no longer lints, so CI calls `eslint` directly.

The senior move is not maximalism: a hand-written config with a comment explaining the two flags left
off reads better than a strictest preset with three overrides.

## ESLint rules that actually catch agent output

Ranked by value:

**`no-floating-promises`** is first. Agents write `db.insert(...)` without `await` constantly: silent
data loss with passing tests. Type-aware, and it alone justifies the `projectService` cost.
**`no-misused-promises`** is the same root cause in another shape, `onClick={async () => …}`.
**`no-explicit-any`** as an error, because agents reach for `any` the moment a type gets hard.
**`no-unnecessary-condition`** flags defensive `if (x)` on a non-nullable `x`, the signature of an
agent that did not trust its own types. **`switch-exhaustiveness-check`** catches the union member
added without the matching arm. **`react-hooks/exhaustive-deps` promoted to error**, because it ships
as a warning and agents ignore warnings while producing stale-closure bugs that pass every test.

Then the volume limits, which almost nobody enables and which catch the real failure mode, an agent
writing 300 lines instead of decomposing: `complexity` 15, `max-lines` 400, `max-lines-per-function`
120, `max-depth` 4, `max-params` 4. Set them loose as tripwires, not as design guidance, and turn them
off in test files.

Plus `no-console` for debugging leftovers.

Use `recommendedTypeChecked`, not `strictTypeChecked`: typescript-eslint's own docs gate the strict
preset on team proficiency and declare it unstable under semver.

Skip the AI-slop plugins entirely. `eslint-plugin-ai-guard` has under a thousand weekly downloads.
Shipping one signals credulity, not currency.

## Two conflicts to resolve before the first commit

**The accessibility gate as specified will not run.** `eslint-plugin-jsx-a11y` last shipped in October
2024, its peer range stops at ESLint 9, and its ESLint 10 support issue is open. We committed to
ESLint 10. Either pin ESLint 9, contradicting the reason we chose 10, or run Biome for the
accessibility rules and keep ESLint solely for the React hooks plugin, which does declare 10. The
second is the better trade and needs deciding rather than discovering.

**Node and the AI SDK disagree.** The AI SDK is at v7, ESM-only, requiring Node 22, while Next's own
floor is Node 20.9. Pin Node 22 or the corpus generator breaks. The v7 migration also renamed `system`
to `instructions` and moved telemetry to a separate package.

## To verify rather than assert

`knip` is believed to have no handling for `"use server"`, which would make it report every Server
Action as an unused export. This was not confirmed against its documentation. Check it before writing
the exclusion into a gate, and delete this paragraph either way.
