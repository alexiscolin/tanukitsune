# Stack decisions

**What this is.** Every contested tooling choice and the argument that settled it. Consult it when a tooling question arises, not before.

Every contested choice, with the reason it went that way for this project. Written as a reference so
the arguments do not get re-litigated.

## The stack

| Layer | Choice |
|---|---|
| Package manager | pnpm |
| Runtime | Node 22, which is the AI SDK v7 floor |
| Language | TypeScript 6, installed under its own package name |
| Framework | Next 16, App Router, React Compiler on, Cache Components off |
| Styling | Tailwind 4, `shadcn/ui` primitives, design tokens in one file |
| Kana input | `wanakana` for conversion and script detection, called from the field rather than bound to it, per [ADR 0007](decisions/0007-kana-input-in-the-field.md) |
| Local store | IndexedDB through `idb`, append-only outbox |
| Server store | Postgres through Drizzle, migrations by drizzle-kit |
| Local database | PGlite, a file-backed Postgres opened in process, nothing to install or start |
| Models | Pinned dated snapshots, batch API for the corpus, cached cascade for grading |
| Tests | Vitest in two projects, `core/` in Node with no DOM and components in jsdom through Testing Library, Playwright with axe, real Postgres, MSW for third-party HTTP only |
| Gates | ESLint 10, dependency-cruiser, knip, jscpd, `check:docs`, all in `pnpm verify` and in CI |
| Hosting | Not decided |

Those are the choices, and most of them were not contested. The ten below were, and the argument is
recorded so it does not get re-litigated.

## The ten arbitrations

| Debate | Choice | Why for us |
|---|---|---|
| TS 6 vs 7 | **TypeScript 6, installed as `npm:@typescript/typescript6`** | `typescript@latest` is now 7.x, so `"typescript": "6.0.3"` does not resolve; the 6 line ships under its own package name. TS 7 shipped without a compiler API, which breaks `typescript-eslint` (peer `<6.1.0`) and `dependency-cruiser`. Those are our two most important gates, and losing `no-floating-promises` and boundary enforcement to gain compile speed on a single app is a bad trade. **Re-evaluation trigger, not a permanent position:** typescript-eslint declaring TS 7 support, or dependency-cruiser shipping it. The ecosystem is leaving this line faster than "migrate at 7.1" implies. |
| ESLint vs oxlint / Biome | **ESLint 10 + typescript-eslint, with the Next plugins taken directly** | `eslint-plugin-react-hooks` surfaces React Compiler diagnostics and has no equivalent elsewhere, and `@next/eslint-plugin-next` carries the framework rules. Both declare ESLint 10 and both work. `eslint-config-next`, the usual way to get them, crashes the linter outright with `scopeManager.addGlobals is not a function`, and it would have pulled in two more plugins we do not want: `eslint-plugin-import`, refused by the row below, and `eslint-plugin-jsx-a11y`, which cannot run on ESLint 10 at all. Taking the two plugins directly is not a workaround, it is the arbitration we had already made, minus an aggregate that contradicted it. The Next rules are promoted to error, since half ship as warnings and an agent reports a warning as passing. oxlint carries a subset of the Next rules and `exhaustive-deps`, but its JS-plugin performance cliff falls exactly on the React Compiler plugin. Add oxlint as a pre-pass later, if lint exceeds 30 seconds. |
| dependency-cruiser vs ESLint boundary plugins | **dependency-cruiser, plus `server-only` at runtime** | dependency-cruiser is the CI gate: the only one catching all four evasion vectors including dynamic `import()`. `import 'server-only'` is the second layer and fails the bundle rather than the linter, which is what keeps a secret out of a client component even where the graph rule is satisfied. Core `no-restricted-imports` would add an editor hint with instant feedback, and is not configured: it is leaky by design, so it would be a third statement of a rule two layers already hold, and a third place it can drift. |
| `eslint-plugin-import` vs `import-x` | **Neither** | The debate does not apply: `no-restricted-paths` is already covered by dependency-cruiser. Avoiding a dependency in an unresolved ecosystem is itself a decision. |
| Pre-commit hooks | **None installed** | An agent that commits must never be blocked mid-loop, and a hook that cannot block is a hook that earns nothing. CI is the gate. If one is ever added it is advisory and exits zero, which is the Angular pattern. |
| Coverage gating | **Patch only, never a required check.** Nothing measures coverage today | `patch: 80%, threshold 5%`; `project: auto, threshold 1%`. No global threshold: deleting a well-tested module would fail an unrelated PR. Never required, because you do not want to negotiate with a coverage tool at 2am. Alternative with no tool: Vitest `coverage.thresholds` with `autoUpdate: true`, a pure ratchet with no number to pick. The numbers above are the shape the gate takes when it arrives; `vitest.config.ts` declares no `coverage` block and no CI job reads one, so they describe a decision rather than an instrument. |
| Copy-paste detection | **jscpd, loose ratchet** | 70 tokens, 8 lines, 5 percent threshold, tests and generated code excluded, `mode: weak`. The default of 50 tokens is far too sensitive for TSX, where every JSX attribute is tokens. **Never gate at zero**: it will fire on App Router scaffolding within a week and get disabled, which is worse than not having it. Our case, solo plus agents, is exactly the population where the duplication research holds. |
| Conventional Commits | **Written on both, gated in CI on the title and on every commit of the branch** | Linting every commit blocks an agent mid-loop for no gain, so nothing runs at commit time. CI checks the pull request title and every commit subject on the branch somebody wrote, both through one script so the two cannot drift. The subjects a merge tool writes verbatim are skipped by their wording rather than by parent count, so a merge whose author chose its subject stays gated. The style applies to commits as well, because a squash merge takes the commit subject when a pull request has exactly one commit: leaving the two conventions different would make a uniform history depend on a host setting rather than on what was written. |
| Accessibility gate | **axe against the rendered page, in the Playwright run. One linter, not two.** | `eslint-plugin-jsx-a11y` stops at ESLint 9, so the usual gate cannot run here. Adding Biome for those rules alone was tried and undone: a second linter is a second config, a second upgrade path and a second place a rule can live, on a repository whose own rule is never to introduce a second way to do something. axe is the better instrument anyway, since it audits the accessibility tree that was actually produced, including contrast, focus order and computed roles, none of which a source-pattern rule can see. The cost is real and it is latency rather than machine time: axe answers at the end-to-end run, a linter answers in the editor. It is paid because there is no rendered page yet, so neither instrument catches anything today, and the end-to-end suite arrives with the first one. **Revisit when** `eslint-plugin-jsx-a11y` declares ESLint 10, at which point the fast source rules fold back into the single linter and cost nothing extra. |
| App versioning | **None** | Git SHA exposed at `/api/health`. Changesets itself removed private package versioning by default in July 2026. This is an app, not a library: there is no public API to semver, so versions are deployment identifiers. |

## TypeScript config

On, and worth the friction:

`strict`, written explicitly and never left to the default: the first `next build` rewrites
`tsconfig.json` and sets `strict` to `false` when it does not find it, which passes every gate while
turning off the setting the rest of them depend on · `noUncheckedIndexedAccess`, the highest-value
non-default flag because
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
- **The binary is `tsc6`, not `tsc`.** The 6 line ships under its own package name and keeps its own
  command, so every script, editor setting and CI step that says `tsc` silently runs nothing, or runs a
  different compiler that happens to be on the path.

Nothing else is worth listing. The rest of the strict family is on by default in TS 6,
`moduleResolution` is fixed by the bundler, and `skipLibCheck` stays on, because turning it off fails
the build on a third-party declaration nobody here can fix.

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
120, `max-depth` 4, `max-params` 4. Set them loose as tripwires, not as design guidance, and turn the
two line-count limits off in test files, where a long table of cases is the point. The other three
cost nothing to keep on.

Plus `no-console` for debugging leftovers.

Use `recommendedTypeChecked`, not `strictTypeChecked`: typescript-eslint's own docs gate the strict
preset on team proficiency and declare it unstable under semver.

Skip the AI-slop plugins entirely. `eslint-plugin-ai-guard` has under a thousand weekly downloads.
Shipping one signals credulity, not currency.

## React and Next

App Router, React Compiler on, Cache Components off. The compiler changes how components are written
more than it changes what they do, which is why the React hooks plugin carries more weight here than in
a normal project. The caching mode stays off because the one resource worth caching is served as an
immutable versioned URL instead, which is argued in [`framing.md`](framing.md).

The review session is a single client-rendered route rather than a sequence of framework navigations,
so the App Router serves the corpus, the demo and the surrounding pages while the product's main loop
uses almost none of it. That is decided, not discovered, and argued in [`framing.md`](framing.md).

Server Actions are for forms. The queue flush is a route handler taking a batch.

## Styling

Tailwind 4 for everything visual, `shadcn/ui` for accessible primitives copied into `ui/` as source,
module-scoped stylesheets only for keyframes and stateful visual logic. Design tokens in one file in
the community standard format, compiled to custom properties. No runtime CSS-in-JS.

The reason utilities win here is that an agent writes them: naming CSS classes is where agent output
duplicates and drifts, and a visual change spanning a component and a stylesheet doubles the places to
get it wrong. Components are added the moment they are first imported, never in bulk, or `knip` and
`jscpd` start reporting noise on files nobody chose.

`shadcn/ui` changed its default primitive base once. Which one it installs is verified at install time
and recorded here, not assumed.

## Data

Postgres, reached only from `data/`, which is server-only and does its own authorisation. Migrations
are checked in and forward-only.

**Locally it is PGlite**, which is PostgreSQL compiled to WebAssembly and reports itself as such. It is
a directory in the working tree, opened in process: nothing to install, nothing to start, no daemon
left running. That is what lets "Postgres is never mocked" hold on a machine where nothing was present
beforehand, since PGlite is the engine rather than a stand-in for it.

It is pre-1.0 and single-connection, so **CI runs the same suite against a server Postgres**, where a
service container costs nothing. Fast locally, identical to production where it gates a merge. The
alternative that ran official binaries, `embedded-postgres`, was tried and is broken on macOS arm64,
and has published prereleases exclusively for years. [ADR 0006](decisions/0006-drizzle-and-a-file-backed-local-postgres.md)
carries the argument.

IndexedDB through `idb`, which is a promise wrapper over the native API and nothing more. Dexie is the
other candidate and it is a query layer with its own schema and migration model, which duplicates the
one Drizzle already provides on the server and adds a second way to describe a store. Four stores: subjects, assignments and corpus rows as caches
of server truth replaced wholesale, and the outbox appended with client-generated identifiers. No state
library.

Drizzle is the query layer and drizzle-kit writes the migrations: the schema is TypeScript, which is
what an agent reads before writing a query, and migrations are SQL files reviewed as a diff. No runtime
engine, no generation step between the source and the database.

## Ops

**The host is an owed decision, not a settled one, and nothing technical separates the candidates.**
Deployment skew protection is a paid feature wherever it exists, so the documentation does not rely on
it: the service worker handles a 404 on a hashed asset by purging and reloading, which is the mechanism
regardless of host. The framework's caching is off, so no adapter has to keep up with it. What is left
is price and operating comfort, which is a better basis for the decision than a feature nobody would
have used twice.

What the host must provide either way: a CDN that honours immutable responses, a preview deployment per
pull request with its own database branch, and a free tier whose terms allow a product that will never
charge, which [ADR 0004](decisions/0004-free-forever.md) guarantees. Nothing beyond that, which is why
the choice comes down to price.

**The v0.1 topology is single user with a public demo, and those two facts do not sit together by
default.** The author's token lives in the server environment, and the same deployment serves a demo
that anyone can reach. So the flush route and the backup route authenticate with a shared secret read
from that same environment, checked inside each handler rather than in a matcher, and the demo path
reaches neither. No route on the public deployment reads the WaniKani token, and that is an acceptance
criterion rather than an intention.

Secrets live in the host environment, are read by `data/` and by the corpus generator only, and never
at build time. Model spend is capped per user and globally, as configuration rather than as a code
change. What gets traced, evaluated and alerted on is in [`ai-engineering.md`](ai-engineering.md).

## The Node floor

**Node and the AI SDK disagree, and the higher floor wins.** The AI SDK is at v7, ESM-only, requiring
Node 22, while Next's own floor is Node 20.9. `engines` and `.nvmrc` both say 22.12.0, because the
corpus generator breaks below it and a floor that only one of the two files carries is a floor that
holds on one machine. The v7 migration also renamed `system` to `instructions` and moved telemetry to
a separate package.

## Unverified

`knip` may have no handling for `"use server"`, which would make it report every Server Action as an
unused export. Verify against its documentation before relying on an exclusion rule.