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
8. Fresh-context review, section 4.
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

Three standing rules the reviews enforce and the gates back up:

- **No duplication.** Before writing a helper, find the existing one. Rule of three governs
  extraction, not tolerance: the third occurrence gets refactored, it does not get copied.
- **No dead code.** No unused export, parameter, file or dependency. Nothing kept just in case.
- **No silent regression.** A change that alters existing behaviour says so in the commit, or it was
  not intentional and gets reverted.

`/simplify` and `/code-review` cannot be model-invoked reliably, so `/pre-pr` ends by naming them.

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

It runs `pnpm gate`, which is typecheck, lint and the boundary check, and deliberately not
`pnpm verify`. The full suite needs a database and browser runs, which do not fit a hook timeout, and a
hook killed on timeout blocks nothing while appearing to guard everything. The rest is caught by
`/pre-pr` and by CI, where there is time for it.

A `PreToolUse` hook refuses any read, write or shell command touching `info/`. The rule is in
`AGENTS.md`, and a rule an agent can only remember is one it forgets on the fiftieth turn without
anyone noticing which turn.

Keep hooks deterministic. A hook running a linter is free and catches most agent regressions. A hook
running an agent is expensive and loops.

