# Verification

**What this is.** The inventory of what checks this repository: what runs, when, what it catches and
what it costs. It carries no argument. Every reason a mechanism is shaped the way it is lives in
[`workflow.md`](workflow.md), and the two do not repeat each other.

The governing rule everything below arranges itself around is stated and argued in
[`workflow.md`](workflow.md).

## The layers, in cost order

| Layer | Runs | Cost | Blocks |
|---|---|---|---|
| `verify.sh`, the compile hook | end of every turn | zero tokens | the turn, once |
| `pnpm verify` | before a pull request, and in CI | zero tokens | the merge |
| Five reviewers through `/pre-pr`, six when the branch touches markdown | when a human asks | subscription | their findings are advisory, their pass record is not |
| `check-review-coverage.sh`, the coverage gate | every pull request | zero tokens | the merge |
| `/code-review ultra` | human decision, expensive changes | metered | nothing, advisory |
| A manual pass on one physical iPhone and one physical Android | before each release | a person's time | the release, by agreement, since nothing mechanical can hold it |

**No model runs in CI, and no model runs on its own anywhere.** A reviewer in CI would be metered for
a reading the subscription already covers locally, so every model pass goes through `/pre-pr`, once,
when someone asks for it. What CI gates is therefore entirely deterministic, which still includes
`check:docs`: the mechanical documentation rules run at merge inside `pnpm verify`.

What keeps the semantic reading from being optional is the coverage gate rather than a hook. It runs
as a required check, so a branch reaches the merge button with a pass on record or it does not reach
it. The consequence that remains is that a pass is a record somebody wrote, not a proof a model ran:
the gate refuses a merge nobody reviewed, and cannot refuse one somebody only claimed to.

## The commands

`pnpm gate` is `typecheck`, `check:docs`, `arch` and `lint`, in that order because `&&` stops at the
first failure and the four cost 0.9, 0.9, 1.2 and 4.0 seconds: a boundary or documentation failure is
reported in about two seconds rather than after the type-aware lint has run. Seven seconds in all, no
database, which is what makes it usable from a hook that runs at every turn.

`pnpm verify` is `gate` plus `check:review`, `check:tests`, `build`, `test`, `knip` and `dupes`. `build`
is the only gate that evaluates server modules. `test:e2e` sits outside both and runs in its own CI job,
because it needs a browser and a database.

| Command | Tool | Catches |
|---|---|---|
| `typecheck` | `tsc6` | type errors, under `strict` and `noUncheckedIndexedAccess` |
| `lint` | ESLint with type information | floating promises, `any`, stale hook dependencies, volume tripwires, and a marker naming work the backlog should hold |
| `arch` | dependency-cruiser, then `check-boundaries.sh` | layer violations, and whether the rules still fire |
| `check:docs` | `check-docs.sh` | documentation discipline, enumerated below |
| `check:review` | `check-review-coverage-probe.sh` | whether the coverage gate still refuses what it claims to |
| `check:tests` | `check-test-strength-probe.sh` | whether the test strength gate still refuses a lost assertion, which a `Test-weakened:` trailer may declare, and a disabled, focused or conditional unit test, which nothing declares |
| `build` | Next | anything only the server compilation sees |
| `test` | Vitest | logic in `core/` in Node, and a component's own behaviour in jsdom |
| `knip` | knip | unused exports, files and dependencies |
| `dupes` | jscpd | literal copy-paste, 70 tokens and 8 lines at weak mode |

## The one hook

**`.claude/hooks/verify.sh`** is registered in `.claude/settings.json`, on `Stop`, when the agent
finishes a turn. It runs `pnpm gate` and refuses the end of the turn when it fails, and refuses it the
same way when it cannot run at all: a missing `package.json`, a `pnpm` absent from the hook's own
PATH, or the project directory going away mid-turn, each naming itself. A hook that passed and a hook
that never ran are otherwise the same observation. The interpreter resolves the script under
`CLAUDE_PROJECT_DIR` before its first line runs, so a directory that was never reachable ends the turn
at 126 or 127 and no hook can see it. Exit code 2 is the only code the tool treats as a refusal; exit
1 is ignored. It reads the `stop_hook_active` field the tool places in its own JSON input and exits
when that field is set, since a hook that blocks without reading it wedges the session shut. That
field is matched without `jq`, which `check:review` does require: this guard bounds every refusal
above, and the PATH thin enough to lose `pnpm` loses a packaged `jq` with it, so reading it through
one would drop the bound in the environment that needs it. The consequence is that the guarantee is
one forced continuation, not a loop until compliance.

It calls no model, and nothing else is registered. Why an event is the wrong place both for a model pass
and for a question about intent: [`workflow.md`](workflow.md#5-hooks).

## The coverage gate

The five lenses are spawned by a human, so whether they ran is a fact about a branch rather than a
property of the tooling. `scripts/check-review-coverage.sh` decides that fact, it calls no model, and
it is the only thing standing between unread code and the merge button.

It walks every commit between the merge base and `HEAD`, skips those touching nothing but prose and the
review log itself, and requires each of the rest to fall inside a range some pass recorded. Prose is any
markdown except the files that instruct: `AGENTS.md`, `CLAUDE.md`, `REVIEW.md` at any depth and anything
markdown under `.claude/`. Those are read, since a file able to tell a later session what it may do, or
tell a lens what to look for, must not be the one file no lens has to see. Ranges
come from the pass lines in `.claude/review-log.jsonl`; a commit is inside one when it is reachable
from the head that pass read and not from where that reading started.

Skipping the log is what makes the gate satisfiable at all: recording a pass is itself a commit, so a
gate that counted it would refuse every branch it had just approved.

Unsorted findings are counted for the current branch only. One log serves every branch, so a finding
left waiting elsewhere is not this branch's merge to refuse, and counting it would let one stale line
refuse every branch at once. A detached head names no branch, and the whole log answers instead, which
is the state the pull request job runs in and the reading that has to hold.

A pass naming a sha that does not resolve, after a rebase or from a template nobody filled in, counts
as no pass at all rather than as a pass covering half a range. Both halves are checked, since trusting
the head alone would let an unresolved base cover the whole branch.

It proves that a range was submitted and that nothing was left pending. It does not prove the lenses
read well: the log is written by the party under review, so what is checkable is its existence and its
coverage, not its honesty. `pnpm check:review` runs a probe that builds a throwaway repository per case
and expects a verdict for each, since a coverage gate that accepts everything is indistinguishable from
a branch that was read.

Two things it does not reach. A commit made directly on `main` has no merge base to range from and no
pull request to refuse, so it is covered by a branch protection rule or by nothing; the gate is honest
about answering `no commits over main` rather than pretending. And a range the lenses read badly passes
exactly as a range they read well.

## The six reviewers

Defined in `.claude/agents/`, each restricted to `Read`, `Grep` and `Glob` so they report rather than
fix, and each held to the evidence bar stated in [`workflow.md`](workflow.md).

| Reviewer | Lens | Model | Why that tier |
|---|---|---|---|
| `requirement-check` | work nobody asked for, work asked for and missing, intent that drifted | opus | a miss costs the whole slice |
| `regression-check` | behaviour that worked and changed unasked | opus | a miss costs data |
| `security-check` | untrusted input, secrets, secret comparison, cache poisoning, replay safety | opus | a miss costs data |
| `architecture-check` | boundaries, logic repeating an existing function, premature abstraction | sonnet | a miss costs legibility |
| `performance-check` | N+1 queries, complexity, sequential awaits | sonnet | a miss costs latency |
| `docs-conformity` | documents that no longer agree with each other or with the code | sonnet | a miss costs trust |

`requirement-check` is the only lens that reads intent. It is given the requirement before the diff and
in that order, since reading the diff first anchors it on what exists and it then reconstructs a
requirement that fits. The other four code lenses judge how the work was done; this one judges whether
it was the work.

All six are run through `/pre-pr`, which declares `disable-model-invocation` so a model cannot trigger
the skill itself. It reads the branch before the pull request, which is the grain `requirement-check`
needs, since a slice judged before it is finished reports as missing the work its next commit carries.
`docs-conformity` joins the other five only when the branch touches markdown, which the branch diff
answers: a branch that changed no document cannot have introduced a disagreement between documents.

## Measurement

`.claude/review-log.jsonl` records two kinds of line. One per finding: date, branch, lens, file, line,
and whether it was fixed or dismissed. One per pass, carrying `kind` set to `pass` and the range that
pass read, written whether or not anything was found.

A finding is recorded without an outcome, and acquires one by having the fields set on the line
already in the log. `fixed` stands alone. `dismissed` carries a `reason`, and the gate refuses
without it, since a dismissal with nothing said is the one disposal a log cannot tell apart from a
finding nobody answered. Both fields are set in that one edit, which is the only edit this file accepts.
Every other write appends, formatting included: a line rewritten in passing is a record altered with
nothing recording that it was.

`scripts/review-stats.sh` reports what each lens yields and how much of it survives, and the pass lines
are its denominator: findings alone cannot separate a lens that met clean code from one that ran once
and never again. The coverage gate reads those same lines, so one record serves both the measurement
and the gate. Why the reviewers are measured rather than trusted is in [`workflow.md`](workflow.md).

## What `check-docs.sh` enforces

Mechanically, so the rules do not depend on anyone remembering them.

| Check | Fails on |
|---|---|
| Provenance | a document narrating its own revision history rather than stating what is true |
| Audience | a document addressing someone assessing the author rather than someone using the project |
| Register | a document that reads as material to memorise rather than as an authored standard |
| Typography | an em dash or an emoji, in any markdown outside `info/` and `scripts/`, plus `info/workflow-explique.md` named back in because `AGENTS.md` holds it to the same agreement |
| Budget | `AGENTS.md` over 150 lines, which `docs/README.md` claims it stays under |
| Map | a document under `docs/` absent from the table in `docs/README.md` |
| Links | a relative link resolving to nothing |
| Anchors | a link anchor matching no heading in the file it points at, or a target climbing out of the tree |
| Paths | a path named inside backticks, carrying a directory, that is not there |
| Hooks | a script in `.claude/hooks/` that `settings.json` does not register, or a registration whose file is absent |
| Sources | an entry in `sources.md` with no link |
| Debt | a decision record that pins a version without declaring a revisit trigger |

The exact expressions each check matches are in the script. They are not repeated here, because a
document reproducing them is a document the script then refuses.

## The boundary probes

`scripts/check-boundaries.sh` writes three modules, two of them violating a rule, requires the named
rule to refuse each, and removes them. Two of the five rules in `.dependency-cruiser.js` are covered:
the reachability rule and the `server-only` rule. Those two are covered because a rule written against
a bare package name matches nothing once the package resolves inside `node_modules`, and an
adjacency-only rule misses `ui` reaching `data` through `app`. The other three are asserted rather than
proven, which is the state the first two were in.

The rule name is read rather than the exit code. A probe trips more than one rule, so a gate reading
the exit code alone stays green when the rule the probe is named for is deleted and a sibling stands
in for it. The `data/` probe also reaches through a hop under `src/app/` rather than importing
`data/` directly, since a one-hop probe leaves `reachable` unexercised on both rules.

It also asserts that `tsconfig.json` excludes the probe prefix and that `eslint.config.js` ignores
it, rather than trusting both. A probe lives under the path its rule matches on, so it is inside what
`tsc` enumerates and what `eslint .` walks; without the two exclusions a typecheck or a lint running
beside this script fails on a file it has since removed, and the hook runs `pnpm gate` at the end of
every turn. Renaming a probe would leave both patterns matching nothing, which is why the script
checks them instead of assuming them.

## The four CI jobs

Defined in `.github/workflows/verify.yml`. Every action is pinned to a commit SHA, since a mutable tag
is a third party's decision about what runs here. The workflow holds `contents: read` and nothing more,
needs no secret, and costs nothing beyond runner minutes.

| Job | Runs on | Does |
|---|---|---|
| `verify` | push to main, pull request | `pnpm verify`, then checks the build left `tsconfig.json` alone |
| `e2e` | push to main, pull request | Playwright with the axe audit, against the production build and a server Postgres |
| `review` | pull request | `check-review-coverage.sh` and `check-test-strength.sh`, over the head commit rather than the merge commit. A test file may lose assertions when a commit in the range says so in a `Test-weakened:` trailer naming it. A disabled, focused or conditional test is refused outright, and only in `*.test.*`: a conditional guard belongs in an e2e spec, which the check does not read |
| `subjects` | pull request | the title, every commit subject on the branch, and a description carrying the plan |

`e2e` runs against a server Postgres rather than the file-backed local one, so the driver that runs in
production is the driver a merge is gated on.

All four are required checks on `main`, and administrators are not exempt, so a red job is a closed
merge button rather than a warning. `review` among them is what makes the model passes unavoidable
without any of them running unprompted.

## What is not covered

- The reviewers read a diff, so a regression whose cause lies in unchanged code is invisible to them.
- A pass line is a record somebody wrote, not evidence a model ran. The gate refuses a merge nobody
  reviewed; it cannot refuse one somebody only claimed to have reviewed.
- No model runs at merge. `check:docs` still gates it, so the mechanical rules hold, but whether the
  documents were read against each other depends on `docs-conformity` having been asked for.
- Three of the five boundary rules have no probe, and one of the two covered is covered halfway: the
  probe reaches `data/`, so narrowing the rule's target from `src/(data|ai)/` to `src/data/` would
  still pass. Closing it needs a probe under `src/ai/`, which lands with the first `ai/` module.
- Commits made directly on `main` are reviewed by nothing: the gate computes its range from the merge
  base, which on `main` collapses to `HEAD`.
- No dependency advisory check runs anywhere, although `security-check` delegates advisories to one.
- A path matching no route segment at all, such as `/foo/bar`, renders the framework's implicit root
  layout, which owns no `<html lang>` and pulls no stylesheet, so it fails WCAG 2.0 A on
  `html-has-lang`. A single segment is not that case: `/foo` matches `[locale]` exactly as `/de` does,
  renders inside that layout and calls `notFound()`, which is why the axe audit passes on it. Closing the real one needs a root layout
  owning `<html>`, which `[locale]/layout.tsx` owns today in order to vary `lang` per locale, so it is
  a restructure rather than a redirect.
- No automated driver produces a real conversion, so the component test covers synthetic composition
  events and the behaviour on a device is covered by the manual pass alone, dated in
  [`agent-log.md`](agent-log.md) with the devices and the operating system versions.
- Nothing runs `pnpm bootstrap`. CI installs with a frozen lockfile and sets `DATABASE_URL`, so the
  file-backed branch of the migration configuration, which is the one a fresh clone takes, executes on
  a developer's machine alone. The rule that decides it is unit tested; the path through the script is
  not, and the acceptance criterion it serves is checked by a person running the two commands.
- Nothing measures the quality of a plan, which `workflow.md` names as where attention matters most.
- The conformity reviewer reads the whole documentation set on every pass, so its cost grows with the
  documentation rather than with the change.
