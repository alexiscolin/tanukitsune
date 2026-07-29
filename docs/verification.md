# Verification

**What this is.** The inventory of what checks this repository: what runs, when, what it catches and
what it costs. It carries no argument. Every reason a mechanism is shaped the way it is lives in
[`workflow.md`](workflow.md), and the two do not repeat each other.

The governing rule, argued there: deterministic first, cheapest first, and the probabilistic layer
never blocks a merge on its own judgement except where nothing deterministic can see the problem.

## The layers, in cost order

| Layer | Runs | Cost | Blocks |
|---|---|---|---|
| `verify.sh`, the compile hook | end of every turn | zero tokens | the turn, once |
| `docs-conformity.sh`, the documentation hook | end of a turn where markdown moved | one Sonnet pass per documentation state | the turn, once |
| `pnpm verify` | before a pull request, and in CI | zero tokens | the merge |
| Four reviewers through `/pre-pr`, five when the documentation set has moved | when a human asks | subscription | nothing, advisory |
| `/code-review ultra` | human decision, expensive changes | metered | nothing, advisory |

**No model runs in CI, and that is a cost decision with a stated consequence.** The documentation
reviewer would have read the same set the `Stop` hook had already read minutes earlier, at a metered
price, so it runs once, locally, where the subscription already covers it. What CI gates is therefore
entirely deterministic, which still includes `check:docs`: the mechanical documentation rules run at
merge inside `pnpm verify`. Only the semantic reading, the part no script can perform, depends on a
turn having happened on a machine with the hook installed.

## The commands

`pnpm gate` is `typecheck`, `lint`, `arch` and `check:docs`. Seconds, no database, which is what makes
it usable from a hook that runs at every turn.

`pnpm verify` is `gate` plus `build`, `test`, `knip` and `dupes`. `build` is the only gate that
evaluates server modules. `test:e2e` sits outside both and runs in its own CI job, because it needs a
browser and a database.

| Command | Tool | Catches |
|---|---|---|
| `typecheck` | `tsc6` | type errors, under `strict` and `noUncheckedIndexedAccess` |
| `lint` | ESLint with type information | floating promises, `any`, stale hook dependencies, volume tripwires |
| `arch` | dependency-cruiser, then `check-boundaries.sh` | layer violations, and whether the rules still fire |
| `check:docs` | `check-docs.sh` | documentation discipline, enumerated below |
| `build` | Next | anything only the server compilation sees |
| `test` | Vitest | logic in `core/`, six tests over three modules |
| `knip` | knip | unused exports, files and dependencies |
| `dupes` | jscpd | literal copy-paste, 70 tokens and 8 lines at weak mode |

## The two Stop hooks

Both are registered in `.claude/settings.json` and run when the agent finishes a turn. Exit code 2 is
the only code the tool treats as a refusal; exit 1 is ignored.

**`.claude/hooks/verify.sh`** runs `pnpm gate` and refuses the end of the turn when it fails. It reads
the `stop_hook_active` field the tool places in its own JSON input and exits when that field is set,
since a hook that blocks without reading it wedges the session shut. The consequence is that the
guarantee is one forced continuation, not a loop until compliance.

**`.claude/hooks/docs-conformity.sh`** digests the content of every `.md` file describing this system,
which is every tracked and untracked one except the two human-facing documents under `docs/` and
everything under `info/`, plus `info/workflow-explique.md` added back by name because it describes the
system rather than the person and git never lists it. It compares that digest to a gitignored marker at
`.claude/.conformity-reviewed`. When the two differ it reads the set with the `docs-conformity`
reviewer and records the state it reviewed. It is registered with `asyncRewake`, so it runs detached
and wakes the agent only when it has findings.

Four guards, each against a different failure:

| Guard | Stops |
|---|---|
| the content digest | a model pass on every turn rather than on every documentation state |
| `mkdir` on `.claude/.conformity-running`, atomic | a second pass starting on a state the first is still reading, since the marker is only written minutes later when that first pass returns |
| `TANUKITSUNE_CONFORMITY_RUNNING`, an exported variable | the nested non-interactive session running this same hook again, which `stop_hook_active` cannot prevent because it is scoped to one process |
| the digest taken again after the reading | a pass reporting findings about text the agent edited while it read, which is dropped instead |

## The five reviewers

Defined in `.claude/agents/`, each restricted to `Read`, `Grep` and `Glob` so they report rather than
fix, and each held to the evidence bar stated in [`workflow.md`](workflow.md).

| Reviewer | Lens | Model | Why that tier |
|---|---|---|---|
| `regression-check` | behaviour that worked and changed unasked | opus | a miss costs data |
| `security-check` | untrusted input, secrets, client boundary, authorisation | opus | a miss costs data |
| `architecture-check` | boundaries, logic repeating an existing function, premature abstraction | sonnet | a miss costs legibility |
| `performance-check` | N+1 queries, complexity, sequential awaits | sonnet | a miss costs latency |
| `docs-conformity` | documents that no longer agree with each other or with the code | sonnet | a miss costs trust |

The first four are spawned by `/pre-pr`, which declares `disable-model-invocation` so a model cannot
trigger it. `docs-conformity` joins them only when the digest of the documentation set differs from the
marker at `.claude/.conformity-reviewed`, since an equal digest means this exact state has already been
read. It is also the only one that runs unprompted, from the hook above, on the same condition.

## Measurement

`.claude/review-log.jsonl` records one line per finding: date, branch, lens, file, line, and whether it
was fixed or dismissed. `scripts/review-stats.sh` reports what each lens yields and how much of it
survives. Why the reviewers are measured rather than trusted is in [`workflow.md`](workflow.md).

## What `check-docs.sh` enforces

Mechanically, so the rules do not depend on anyone remembering them.

| Check | Fails on |
|---|---|
| Provenance | a document narrating its own revision history rather than stating what is true |
| Audience | a document addressing someone assessing the author rather than someone using the project |
| Register | a document that reads as material to memorise rather than as an authored standard |
| Typography | an em dash or an emoji, anywhere in any markdown |
| Budget | `AGENTS.md` over 150 lines, which `docs/README.md` claims it stays under |
| Map | a document under `docs/` absent from the table in `docs/README.md` |
| Links | a relative link resolving to nothing |
| Sources | an entry in `sources.md` with no link |
| Debt | a decision record that pins a version without declaring a revisit trigger |

The exact expressions each check matches are in the script. They are not repeated here, because a
document reproducing them is a document the script then refuses.

## The boundary probes

`scripts/check-boundaries.sh` writes two modules into `src/ui/` that violate a rule, requires a
violation for each, and removes them. Two of the five rules in `.dependency-cruiser.js` are covered:
the reachability rule and the `server-only` rule. Those two are covered because a rule written against
a bare package name matches nothing once the package resolves inside `node_modules`, and an
adjacency-only rule misses `ui` reaching `data` through `app`. The other three are asserted rather than
proven, which is the state the first two were in.

## The three CI jobs

Defined in `.github/workflows/verify.yml`. Every action is pinned to a commit SHA, since a mutable tag
is a third party's decision about what runs here. The workflow holds `contents: read` and nothing more,
needs no secret, and costs nothing beyond runner minutes.

| Job | Runs on | Does |
|---|---|---|
| `verify` | push to main, pull request | `pnpm verify`, then checks the build left `tsconfig.json` alone |
| `e2e` | push to main, pull request | Playwright with the axe audit, against the production build and a server Postgres |
| `subjects` | pull request | the title, every commit subject on the branch, and a description carrying the plan |

`e2e` runs against a server Postgres rather than the file-backed local one, so the driver that runs in
production is the driver a merge is gated on.

## What is not covered

- The reviewers read a diff, so a regression whose cause lies in unchanged code is invisible to them.
- Four of the five reviewers run only when a human asks.
- No model runs at merge. `check:docs` still gates it, so the mechanical rules hold, but a change
  pushed from a machine without the `Stop` hook reaches a pull request whose documents no model has
  read against each other.
- Three of the five boundary rules have no probe.
- Nothing measures the quality of a plan, which `workflow.md` names as where attention matters most.
- The conformity reviewer reads the whole documentation set on every pass, so its cost grows with the
  documentation rather than with the change.
