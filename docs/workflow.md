# How this project is built

**What this is.** The process every change goes through, and why the agent configuration in `.claude/`
is shaped the way it is. Each section explains something present in this repository.

The general engineering standard this derives from is not part of the project.

## 1. The per-task cycle

1. Fresh session. One task per session, clear between unrelated tasks.
2. Spec by interview rather than by writing it yourself, with an explicit out-of-scope section.
3. Fresh session. Research through subagents so the searching does not pollute the parent context,
   then a plan naming files, interfaces and per-phase verification. Edit that plan by hand.
4. Interfaces committed first. Bodies get filled, contracts do not change. A contract change is a
   re-plan, not an implementation detail.
5. Failing test committed before the implementation, so it cannot be edited away afterwards.
6. One task is one vertical slice: about five files, one behaviour, one PR, finished before context
   passes half full.
7. The agent shows evidence. It does not assert that something passes.
8. Fresh-context review, section 2.
9. Cleanup as its own commit: narration comments removed, single-use abstractions collapsed, dead
   exports deleted, naming unified.
10. Structural and behavioural changes never share a commit.

**The plan lives in the pull request description**, and nowhere else. It is where the attention goes,
so it needs to be visible and reviewable, and it is working material rather than a description of the
system, so it must not become a committed document that later contradicts the code. What survives a
merged plan is the decision record and the agent log.

Context discipline: aim for 40 to 60 percent utilisation and compact before being forced to. Quality
degrades as the window fills.

## 2. Deep review, beyond the tests

Tests prove the code does what the test says. They do not catch duplication, dead code, a regression
in a feature nobody wrote a test for, a leaked boundary, or a security hole.

The governing principle: **the agent that wrote the code is the worst reviewer of it.** It is anchored
on its intent rather than on what it produced. Three passes by the same agent are worth almost
nothing; what works is fresh contexts with disjoint lenses.

So `/pre-pr` runs the free gates first, captures the diff once, and spawns four reviewers in parallel:
regression, architecture, security, performance. They are defined in `.claude/agents/`, each restricted
to read-only tools so they report rather than "fix", each held to the same evidence bar: a claim about
behaviour needs a `file:line` citation, an inference from a name is not a finding, and finding nothing
is a valid result stated in one line.

A fifth, documentation conformity, joins them when the diff touches markdown. `check-docs.sh` proves a
link resolves and a count against `AGENTS.md` holds, and it cannot prove that two documents describing
the same rule still agree. Nothing in `pnpm verify` can, which is why that one is a reviewer rather
than a script.

Three standing rules the reviews enforce and the gates back up:

- **No duplication.** Before writing a helper, find the existing one. Rule of three governs
  extraction, not tolerance: the third occurrence gets refactored, it does not get copied.
- **No dead code.** No unused export, parameter, file or dependency. Nothing kept just in case.
- **No silent regression.** A change that alters existing behaviour says so in the commit, or it was
  not intentional and gets reverted.

**The reviewers are measured, not trusted.** Every finding is appended to `.claude/review-log.jsonl`
with the lens that produced it and whether it was fixed or dismissed, and `scripts/review-stats.sh`
reports what each lens yields and how much of it survives. A reviewer that reports nothing is
otherwise indistinguishable from a reviewer that is broken, and this repository holds its own product
to measuring exactly that kind of disagreement.

`/pre-pr` runs `/simplify` itself. `/code-review` is marked so a model cannot invoke it, so `/pre-pr`
ends by naming it rather than pretending it ran.

## 3. Stop conditions

Discard the session and restart with a better prompt when:

- the same issue has been corrected twice
- unrequested functionality appears, however reasonable
- tests are modified or deleted to reach green
- the diff is three times the size the plan described

A clean session with a better prompt almost always beats a long session carrying failed attempts.

## 4. Written by hand, not delegated

README, the entry point, `core/srs` and `core/grading`. A reviewer opens three to five files and those
are the ones. If a file cannot be explained without rereading it, it is rewritten before merge.

## 5. Hooks

`Stop` and `SubagentStop` are the ones that matter for solo work. `TeammateIdle` only fires inside an
agent team.

The Stop hook is the highest return in this method: thirty minutes of setup, zero tokens, and it makes
it impossible for an agent to declare done on code that does not compile. Exit code 2 sends the error
back and the agent keeps working. It needs a recursion guard, since a hook launching a nested session
would trigger its own hook forever.

It runs `pnpm gate`, which is typecheck, lint, the boundary check and `check:docs`, and deliberately
not `pnpm verify`. The full suite needs a database and browser runs, which do not fit a hook timeout,
and a hook killed on timeout blocks nothing while appearing to guard everything. The rest is caught by
`/pre-pr` and by CI, where there is time for it.

`check:docs` is in the fast gate rather than only in the slow one because a documentation-only session
never runs the slow one, which is exactly the session where the documentation rules are the only rules
that apply.

A second `Stop` hook digests the documentation set, compares it against a gitignored marker, and when
the two differ reads the set with `docs-conformity` before recording the state it reviewed. It is
registered with `asyncRewake`, so it runs detached and wakes the agent only when it has something to
say. The trigger is mechanical because it can be; the reading is not, because no script can tell
whether two documents still agree.

Two things make it safe to run a model from a hook here. The digest means it fires once per
documentation state rather than once per turn, and an exported variable stops the nested session from
running the same hook again, which is what `stop_hook_active` cannot do across processes.

**Catching it at the turn rather than at the pull request is the whole point.** A contradiction found
at review time lives in documents belonging to some other slice, so fixing it means a diff that grew
past what the plan described, and leaving it means shipping it. Found in the turn that created it, it
is fixed inside the slice that owes it.

`info/` carries no hook, because the requirement is that it must not reach the remote and `.gitignore`
is the whole of that. What `AGENTS.md` adds is a matter of judgement rather than of access: nothing
there is read unprompted, and nothing there is evidence for a claim about this repository. A hook
refusing every path that names the directory would enforce a stricter rule than the one wanted, and
would refuse a search pattern that merely mentions it.

Keep the trigger deterministic even where the work is not. A hook running a linter is free and catches
most agent regressions. A hook running a model is neither free nor bounded, so it earns its place only
behind a deterministic filter that decides whether it runs at all, detached so it costs no waiting, and
guarded so it cannot invoke itself.

