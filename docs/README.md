# Start here

Map of the documentation, how to read it before writing code, and how to operate it day to day.

## 1. What exists

| Document | Answers | For |
|---|---|---|
| [`specs/v0.1.md`](specs/v0.1.md) | The only version specified in detail, with acceptance criteria | both |
| [`framing.md`](framing.md) | What we build and why, the principles, the architecture, the obligations | both |
| [`stack.md`](stack.md) | Every contested tooling choice and the argument that settled it | both |
| [`ai-engineering.md`](ai-engineering.md) | Models, prompts, structured output, evals, caching, observability, error analysis | both |
| [`decisions/`](decisions/) | Architecture decision records, append-only | both |
| [`backlog.md`](backlog.md) | Every feature considered, whether it needs a model, which version, and what was rejected with the reason | both |
| [`sources.md`](sources.md) | Every load-bearing claim, with where it comes from | humans |
| [`workflow.md`](workflow.md) | How work is done with coding agents, and why that method | humans |
| [`agent-log.md`](agent-log.md) | Dated record of where the agent was overruled | humans |

`pnpm check:docs` enforces the discipline these documents are held to, so it does not depend on
anyone remembering it.

**The audience column is load-bearing.** Only `AGENTS.md` and `CLAUDE.md` load automatically; everything
else is read on demand. The three marked "humans" describe how a person operates the project and are
pure context cost to an agent implementing a feature, so an agent does not open them unless the task is
about the documentation itself.

Agent configuration lives at the repository root: `AGENTS.md` is canonical and under 150 lines, and
`CLAUDE.md` imports it because Claude Code does not read `AGENTS.md`. Under `.claude/`: four reviewers
with disjoint lenses, the `pre-pr` skill, and a hook that blocks a turn ending on code that does not
compile.

`REVIEW.md` at the root is read by the hosted Code Review GitHub App, and by nothing else. Local
review agents do not see it, and `/code-review` explicitly skips it. It is committed because the
calibration it contains is worth having when the App is connected, not because it currently governs
anything. The local reviewers carry their own copies of the same rules.

## 2. How to read this before implementing

Thirty minutes, in this order.

**2.1 This file, in full.** It is the map. Everything else is reachable from here.

**2.2 `framing.md`, the first two sections only:** what it is, and the engineering principles. The
seven principles override every other section, including anything written later. If a section
contradicts a principle, the section is wrong.

**2.3 `specs/v0.1.md`, in full.** The only document describing what is being built right now. Read the
out-of-scope section and the acceptance criteria most carefully: they are what tell you when you are
finished, which is the hardest question on a solo project.

**2.4 `stack.md`, skimmed,** so you know what is in it. Come back when a tooling question actually
arises, not before.

The rest is read when it serves. `backlog.md` when wondering whether an idea has already been
considered. `decisions/` before proposing an architectural change.

## 3. How to operate it

**3.1 Starting a session.** Nothing is loaded by hand: `AGENTS.md` loads itself and points here. State
which slice you are attacking. If the agent starts improvising outside scope, "read
`docs/specs/v0.1.md`, out of scope section" is enough to bring it back.

**3.2 During the work.** Attention goes into the plan, not the diff. This is the one change that
matters most. Read and edit the plan by hand, then let a fresh-context reviewer check the diff against
it.

**3.3 Before every pull request.** Run `/pre-pr`. It runs the free gates, captures the diff once,
spawns the four reviewers in parallel, synthesises, and hands back by naming `/simplify` and
`/code-review`, which it cannot invoke itself.

**3.4 When an architectural decision is taken.** Write the ADR immediately, not at the end of the
project. A retroactive ADR always lies a little, because the decision is remembered and the rejected
options are not.

**3.5 When the agent is overruled.** Note it in `agent-log.md` with the date. It is the most-read page
in a repository built this way, and it cannot be reconstructed afterwards.

## 4. The rule that matters most

**Any number carrying an argument has its source in the same paragraph, or it is deleted.** Every one
of them is listed in [`sources.md`](sources.md).

On a repository whose method claims evidence over assertion, an unsourced figure is the first place a
skeptical reader pushes, and it is the cheapest thing to make bulletproof. A confident number that
turns out to be wrong costs more credibility than three good arguments earn.

The same applies to claims about the method itself. If this documentation says structural and
behavioural changes never share a commit, `git log` will be read against it.
