# Start here

Map of the documentation, how to read it before writing code, and how to operate it day to day.

## 1. What exists

| Document | Answers | Audience |
|---|---|---|
| [`specs/v0.1.md`](specs/v0.1.md) | The only version specified in detail, with acceptance criteria | both |
| [`framing.md`](framing.md) | What we build and why, the principles, the architecture, the obligations | both |
| [`stack.md`](stack.md) | The stack, every contested tooling choice, and the argument that settled it | both |
| [`ai-engineering.md`](ai-engineering.md) | Models, prompts, structured output, evals, caching, observability, error analysis | both |
| [`workflow.md`](workflow.md) | The process every change goes through, and why `.claude/` is configured as it is | both |
| [`decisions/`](decisions/) | Architecture decision records, append-only | both |
| [`backlog.md`](backlog.md) | Every feature considered, whether it needs a model, which version, and what was rejected with the reason | both |
| [`sources.md`](sources.md) | Every load-bearing claim, with where it comes from | humans |
| [`agent-log.md`](agent-log.md) | Dated record of where the agent was overruled | humans |

**The audience column is load-bearing.** Only `AGENTS.md` and `CLAUDE.md` load automatically;
everything else is opened on demand, by whoever needs it. The two marked "humans" describe how a person
operates the project and are pure context cost to an agent implementing a feature, so an agent does not
open them unless the task is about the documentation itself.

`pnpm check:docs` enforces the discipline these documents are held to, so it does not depend on anyone
remembering it. It runs inside `pnpm verify`, which a human runs before a pull request and which CI
runs on pushes to main and on pull requests. The `Stop` hook at the end of every agent turn runs
`pnpm gate`, which is typecheck, lint, the boundary check and `check:docs`: the full suite needs a
database and a browser, and a hook killed on its timeout blocks nothing while appearing to guard
everything. `check:docs` belongs in the fast gate because a session that changes only documentation
never reaches the slow one.

## 2. How to read this before implementing

In this order.

**2.1 This file, in full.** It is the map. Everything else is reachable from here.

**2.2 `framing.md`, from the top through the service worker section.** The seven principles override
every other section, including anything written later; if a section contradicts a principle, the
section is wrong. The architecture block is not optional reading: offline reconciliation, mutation
transport, local state and the service worker carry rules an implementer cannot work without, and
`AGENTS.md` points into them. Styling and locales can wait until the first component.

**2.3 `specs/v0.1.md`, in full.** The only document describing what is being built right now. Read the
out-of-scope section and the acceptance criteria most carefully: they are what tell you when you are
finished, which is the hardest question on a solo project. It is not a decision record and it is not
append-only. It is the current contract, and it is updated in the same pull request as any change that
invalidates it, never afterwards.

**2.4 `stack.md`, skimmed,** so you know what is in it. Come back when a tooling question actually
arises, not before.

The rest is read when it serves. `backlog.md` when wondering whether an idea has already been
considered. `decisions/` before proposing an architectural change.

## 3. The agent configuration

Agent configuration lives at the repository root: `AGENTS.md` is canonical and under 150 lines, and
`CLAUDE.md` imports it because Claude Code does not read `AGENTS.md`. Under `.claude/`: four reviewers
with disjoint lenses, a fifth that reads documentation against itself and runs only when a diff
touches markdown, the `pre-pr` skill, a hook that blocks a turn ending on code that does not compile,
and a second that reads the documentation with the conformity reviewer whenever its digest moves.
Alongside them, `review-log.jsonl` records what each lens found and whether it survived, which
`scripts/review-stats.sh` reports.

`REVIEW.md` at the root is the calibration for the hosted Code Review GitHub App, which reads it and
posts on pull requests. Nothing else reads it: the local reviewers hold the same evidence bar in their
own files, and `/code-review` explicitly skips it. It is committed so the App behaves correctly the
day it is connected, not because it governs anything today.

## 4. How to operate it

**4.1 Starting a session.** Nothing is loaded by hand: `AGENTS.md` loads itself and points here. State
which slice you are attacking. If the agent starts improvising outside scope, "read
`docs/specs/v0.1.md`, out of scope section" is enough to bring it back.

**4.2 During the work.** Attention goes into the plan, not the diff. This is the one change that
matters most. Read and edit the plan by hand, then let a fresh-context reviewer check the diff against
it.

**4.3 Before every pull request.** Run `/pre-pr` yourself. It is deliberately not automatic: the skill
declares `disable-model-invocation`, so an agent cannot trigger it, and nothing runs at commit time at
all, so an agent is never blocked mid-loop. It runs the free gates, captures the diff once, spawns the
reviewers in parallel, synthesises, runs `/simplify`, and hands back by naming `/code-review`, which
is marked so a model cannot invoke it.

**4.4 When an architectural decision is taken.** Write the ADR immediately, not at the end of the
project. A retroactive ADR always lies a little, because the decision is remembered and the rejected
options are not.

**4.5 When the agent is overruled.** Note it in `agent-log.md` with the date. It is the most-read page
in a repository built this way, and it cannot be reconstructed afterwards.

## 5. The rule that matters most

**Any number carrying an argument has its source in the same paragraph, or it is deleted.** Every one
of them is listed in [`sources.md`](sources.md).

On a repository whose method claims evidence over assertion, an unsourced figure is the first place a
skeptical reader pushes, and it is the cheapest thing to make bulletproof. A confident number that
turns out to be wrong costs more credibility than three good arguments earn.

The same applies to claims about the method itself. If this documentation says structural and
behavioural changes never share a commit, `git log` will be read against it.
