# How work gets done

**What this is.** How work gets done with coding agents, and why that method.

It is part of the deliverable, not a preface to it. For tooling and quality gates see [`stack.md`](stack.md).

## 1. The division of labour

Measured usage data puts it at roughly 70 percent of planning decisions taken by the human and 80
percent of execution decisions taken by the agent. The predictor of success is not coding proficiency
but domain expertise: experts trigger about 12 actions per prompt against 5 for novices, verified
success runs 28 to 33 percent against 15, and when things go wrong novices abandon three times more
often.

The consequence is the whole thesis: the value is not in using an agent, it is in having the judgement
that makes one productive.

## 2. The highest-leverage rule

**Review the plan, not the diff.**

One bad line of plan produces hundreds of bad lines of code. One misunderstanding of the codebase
produces thousands. The damage hierarchy is wrong information, then missing information, then noise.

So human attention goes into the research and plan artifacts. The diff gets checked by a fresh-context
agent against that plan. This inverts the usual reflex, and it is the single change that most affects
output quality.

## 3. The per-task cycle

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

Context discipline: aim for 40 to 60 percent utilisation and compact before being forced to. Quality
degrades as the window fills.

## 4. Deep review, beyond the tests

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

## 5. Stop conditions

Discard the session and restart with a better prompt when:

- the same issue has been corrected twice
- unrequested functionality appears, however reasonable
- tests are modified or deleted to reach green
- the diff is three times the size the plan described

A clean session with a better prompt almost always beats a long session carrying failed attempts.

## 6. Written by hand, not delegated

README, the entry point, `core/srs` and `core/grading`. A reviewer opens three to five files and those
are the ones. If a file cannot be explained without rereading it, it is rewritten before merge.

## 7. Prompts worth reusing

**Framing, instead of writing the spec yourself:**

> I want to build X. Interview me in detail. Ask about technical implementation, UX, edge cases,
> concerns and trade-offs. Keep going until we have covered everything, then write a complete spec to
> SPEC.md with an explicit out-of-scope section.

**Style, the version that actually works:**

> Read `core/grading/normalize.ts` and match its structure, naming and error handling exactly.

Pointing at code beats any written description of conventions. Agents imitate local examples far
better than they apply abstract rules.

**Verification, never "make sure it passes":**

> Run `pnpm verify` and show me the full output.

**Scope review:**

> Compare this diff to the plan. Check every requirement is implemented, the listed edge cases have
> tests, and nothing outside the task's scope changed. Report gaps, not style preferences.

**Adversarial review, with the leash that matters:**

> Look for flaws. Only report what affects correctness or a stated requirement.

Without that last sentence a reviewer always finds something, even when the work is sound, and chasing
it produces exactly what we are trying to avoid: extra abstraction layers, defensive code, and tests
for cases that cannot happen.

## 8. Working with the assistant

Collaboration protocol, learned the expensive way during this project's framing.

### Short constraints that recalibrate everything

Say them early rather than correcting afterwards.

| Constraint | Effect |
|---|---|
| **decide** | Stop asking, pick, explain in one line, move. Unanswered decisions are the most expensive failure mode. |
| **sourced** | No number without a link in the same paragraph. Cite or delete. |
| **short** | The default runs long. One word halves it. |
| **draft** | Write fast and rough, we iterate. Without it, everything gets polished, which wastes effort on two thirds of the work. |
| **no research** | Work with what we already have rather than spawning agents. |
| **answer, do not act** | Opinion wanted, not modified files. |

### Non-linear discussion

**The file as shared surface**, the best form for reviewing any artifact. Read the document and leave
annotations in place where something is wrong: `<!-- ? why Postgres here -->`, `<!-- disagree, too
complex -->`. Then one message: "I annotated it." Everything gets handled in one pass, and each remark
stays attached to the exact place it concerns.

**Grouped messages** for unrelated topics: "three independent things: (1)... (2)... (3)...". Far
better than three separate messages.

**Separate sessions** for genuinely separate threads.

Messages sent mid-turn corrupt nothing, but they degrade that turn's answer, because attention splits
between tool results and the new question. If a message is self-contained, send it. If it depends on
what is currently running, let the turn close.

### What costs time

One-line-at-a-time iteration on text. Batch the objections instead: "here are my five problems with
this" resolves in two exchanges what otherwise takes fifteen.

Re-opening settled questions. When a criterion has been agreed, apply the criterion rather than asking
again. The doubt loop consumed a real share of the framing sessions and led to rejecting facts that
were true.

## 9. Cost model

Four levels, and the discipline is spending nothing where nothing needs spending.

| Level | When | Cost |
|---|---|---|
| Stop hook | every agent turn | zero tokens |
| Deterministic CI | every push | zero tokens |
| Local subagent review | before a PR | subscription |
| Cloud verified review | changes where a bug is expensive | real money per run |

**Four of the seven things people want from review should never cost a token.** Duplication and dead
code come from static analysis, conventions and best practice from the linter. Only security,
regression and algorithmic efficiency need reasoning.

Cloud verified review is reserved for auth, payments, schema migrations and session handling, once or
twice a month, with a stated reason. Its free runs are a one-time allocation, not a renewing one.

## 10. Subagents or agent teams

Subagents report to the lead only. Teammates talk to each other, self-claim from a shared task list,
and cost roughly seven times a standard session.

**Subagents** when only the result matters: multi-lens review, research, parallel work on disjoint
files. That covers almost everything here, because the four reviewers have nothing to say to each
other.

**An agent team** only when agents need to contradict each other: a bug whose cause is unknown, a
structural architecture decision. Three teammates, not five. Read-only. Explicit shutdown. Twice a
month at most.

Worktrees isolate files; subagents and teams coordinate work. They compose rather than compete.

Agent teams are experimental: no session resume, task status lags, no nested teams. Nothing critical
is built on them.

## 11. Hooks

`Stop` and `SubagentStop` are the ones that matter for solo work. `TeammateIdle` only fires inside an
agent team.

The Stop hook running typecheck and lint is the highest return in this method: thirty minutes of
setup, zero tokens, and it makes it impossible for an agent to declare done on code that does not
compile. Exit code 2 sends the error back and the agent keeps working. It needs a recursion guard,
since a hook launching a nested session would trigger its own hook forever.

Keep hooks deterministic. A hook running a linter is free and catches most agent regressions. A hook
running an agent is expensive and loops.

## 12. Why this is an artifact rather than a claim

Not "I orchestrated five agents." Anyone can launch five agents. What reads as senior:

**The guardrails live in the repository, not in someone's head.** `AGENTS.md`, `REVIEW.md`, four
reviewers, the hook, boundaries in CI. A reader sees the system rather than a description of it.

**The deterministic and probabilistic layers are explicitly separated**, and the reason is stated.

**The review protocol is adversarial and documented**, which shows the anchoring problem was
understood rather than that tools were acquired.

**The limits are named** rather than glossed.

And the part checkable in sixty seconds: the git history. If this document says structural and
behavioural changes never share a commit, `git log` will be read against it. Treat it as a contract
that will be audited. If it holds, it is more differentiating than the code.
