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
| `code-review.sh`, the commit hook | a commit whose accumulated range touches anything but markdown | one nested session and five reviewers on the subscription | the loop, once |
| Five reviewers through `/pre-pr`, six when the documentation set has moved | when a human asks | subscription | their findings are advisory, their pass record is not |
| `check-review-coverage.sh`, the coverage gate | `gh pr create`, and every pull request | zero tokens | the pull request, and the merge |
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

`pnpm verify` is `gate` plus `check:review`, `build`, `test`, `knip` and `dupes`. `build` is the only gate that
evaluates server modules. `test:e2e` sits outside both and runs in its own CI job, because it needs a
browser and a database.

| Command | Tool | Catches |
|---|---|---|
| `typecheck` | `tsc6` | type errors, under `strict` and `noUncheckedIndexedAccess` |
| `lint` | ESLint with type information | floating promises, `any`, stale hook dependencies, volume tripwires |
| `arch` | dependency-cruiser, then `check-boundaries.sh` | layer violations, and whether the rules still fire |
| `check:docs` | `check-docs.sh` | documentation discipline, enumerated below |
| `check:review` | `check-review-coverage-probe.sh` | whether the coverage gate still refuses what it claims to |
| `build` | Next | anything only the server compilation sees |
| `test` | Vitest | logic in `core/`, six tests over three modules |
| `knip` | knip | unused exports, files and dependencies |
| `dupes` | jscpd | literal copy-paste, 70 tokens and 8 lines at weak mode |

## The four hooks

All four are registered in `.claude/settings.json`. Two fire on `Stop`, when the agent finishes a turn;
one fires on `PostToolUse`, after a shell command; one on `PreToolUse`, before one. Exit code 2 is the
only code the tool treats as a refusal; exit 1 is ignored.

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
| `mkdir` on `.claude/.conformity-running`, atomic, holding the pid | a second pass starting on a state the first is still reading, since the marker is only written minutes later when that first pass returns. A lock whose pid is gone is a corpse and is cleared: a pass killed on the hook timeout never runs its trap, and the lock it leaves would otherwise disable the reviewer permanently and in silence |
| `TANUKITSUNE_NESTED_REVIEW`, an exported variable | the nested non-interactive session running this same hook again, which `stop_hook_active` cannot prevent because it is scoped to one process. One name for both nested sessions, since `verify.sh` has to recognise either of them and two names would drift |
| the digest taken again after the reading | a pass reporting findings about text the agent edited while it read, which is dropped instead |

**`.claude/hooks/code-review.sh`** fires on `PostToolUse` when `HEAD` has moved since the previous
shell call, asks `scripts/check-review-coverage.sh` what is still unread, and runs the five code lenses
over it in a nested session. Three things shape it. The trigger is the commit rather than a turn
boundary, because a commit is a deliberate unit and a turn is not. The range is accumulated rather than
per-commit, since a red test read without its implementation is a reading of half a slice. And markdown
is excluded, because `docs-conformity` already owns it, which is a rule with no path list to drift out
of date.

It answers the coverage question by calling the same script the two gates call, rather than deciding it
a second way, so a range this hook stays quiet about cannot be one the merge refuses.

It carries the same four guards as the documentation hook, over `.claude/.review-running` and the
range rather than the digest, and registers with `asyncRewake` so five lenses are not held inside a
hook timeout. Two conditions are its own. Output that does not parse as the expected JSON records no
pass, since marking a range read on the strength of an unreadable answer is the failure this hook
exists to remove. And findings are written without an outcome, so detection is automatic while
disposal stays a decision the gates keep demanding.

One nested session rather than five: a single lock, a single recursion guard, and the five lenses share
one reading of the diff instead of each fetching it. They still run as separate agents inside it, since
disjoint fresh contexts are the whole reason there are five.

**`.claude/hooks/pre-pr-gate.sh`** fires on `PreToolUse` when the command names `gh pr create`, and
runs `scripts/check-review-coverage.sh`. A range of code no pass has recorded reading, or a finding
left without an outcome, refuses the tool call, so the pull request is never opened rather than opened
and then found wanting. Recognising the command by its text is affordable only because a miss falls
through to the pull request job, which runs the same script and refuses the merge.

## The coverage gate

The five lenses are demanded by a hook and spawned by a human, so whether they ran is a fact about a
branch rather than a property of the tooling. `scripts/check-review-coverage.sh` decides that fact, and
it calls no model.

It walks every commit between the merge base and `HEAD`, skips those touching nothing but markdown and
the review log itself, and requires each of the rest to fall inside a range some pass recorded. Ranges
come from the pass lines in `.claude/review-log.jsonl`; a commit is inside one when it is reachable
from the head that pass read and not from where that reading started.

Skipping the log is what makes the gate satisfiable at all: recording a pass is itself a commit, so a
gate that counted it would refuse every branch it had just approved.

A pass naming a sha that does not resolve, after a rebase or from a template nobody filled in, counts
as no pass at all rather than as a pass covering half a range. Both halves are checked, since trusting
the head alone would let an unresolved base cover the whole branch.

It proves that a range was submitted and that nothing was left pending. It does not prove the lenses
read well: the log is written by the party under review, so what is checkable is its existence and its
coverage, not its honesty. `pnpm check:review` runs a probe that builds throwaway repositories and
expects a verdict for each case, and exercises the `gh pr create` pattern besides, since a coverage
gate that accepts everything is indistinguishable from a branch that was read.

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

The first five are run by the commit hook and by `/pre-pr`, which declares `disable-model-invocation`
so a model cannot trigger the skill itself. The hook reads the accumulated range at each commit; the
skill reads the whole branch before the pull request, which is the grain `requirement-check` needs,
since a slice judged before it is finished reports as missing the work its next commit carries. `docs-conformity` joins them only when the digest of the documentation set differs from the
marker at `.claude/.conformity-reviewed`, since an equal digest means this exact state has already been
read. It is also the only one that runs unprompted, from the hook above, on the same condition.

## Measurement

`.claude/review-log.jsonl` records two kinds of line. One per finding: date, branch, lens, file, line,
and whether it was fixed or dismissed. One per pass, carrying `kind` set to `pass` and the range that
pass read, written whether or not anything was found.

A finding the commit hook wrote carries no outcome, and acquires one by having the field set on the
line already in the log. That is the only edit this file accepts; every other write appends.

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

## The four CI jobs

Defined in `.github/workflows/verify.yml`. Every action is pinned to a commit SHA, since a mutable tag
is a third party's decision about what runs here. The workflow holds `contents: read` and nothing more,
needs no secret, and costs nothing beyond runner minutes.

| Job | Runs on | Does |
|---|---|---|
| `verify` | push to main, pull request | `pnpm verify`, then checks the build left `tsconfig.json` alone |
| `e2e` | push to main, pull request | Playwright with the axe audit, against the production build and a server Postgres |
| `review` | pull request | `check-review-coverage.sh`, over the head commit rather than the merge commit |
| `subjects` | pull request | the title, every commit subject on the branch, and a description carrying the plan |

`e2e` runs against a server Postgres rather than the file-backed local one, so the driver that runs in
production is the driver a merge is gated on.

## What is not covered

- The reviewers read a diff, so a regression whose cause lies in unchanged code is invisible to them.
- The five code lenses are demanded at each commit of code, but the demand is one forced continuation, not a loop until they have run.
- No model runs at merge. `check:docs` still gates it, so the mechanical rules hold, but a change
  pushed from a machine without the `Stop` hook reaches a pull request whose documents no model has
  read against each other.
- Three of the five boundary rules have no probe.
- Commits made directly on `main` are reviewed by nothing: the commit hook computes its range from the
  merge base, which on `main` collapses to `HEAD`.
- No dependency advisory check runs anywhere, although `security-check` delegates advisories to one.
- A path matching no route segment at all, such as `/foo`, renders the framework's implicit root
  layout, which owns no `<html lang>` and pulls no stylesheet, so it fails WCAG 2.0 A on
  `html-has-lang`. `/de` is not that case: it matches `[locale]`, renders inside that layout and calls
  `notFound()`, which is why the axe audit passes on it. Closing the real one needs a root layout
  owning `<html>`, which `[locale]/layout.tsx` owns today in order to vary `lang` per locale, so it is
  a restructure rather than a redirect.
- Nothing measures the quality of a plan, which `workflow.md` names as where attention matters most.
- The conformity reviewer reads the whole documentation set on every pass, so its cost grows with the
  documentation rather than with the change.
