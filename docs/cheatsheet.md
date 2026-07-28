# Cheatsheet: working with a coding agent

**What this is.** A quick reference for the human side of the loop: what to say, when to stop, what to
verify, what never to delegate. Read once, then keep it open. The reasoning behind these rules is in
[`workflow.md`](workflow.md); this file is the condensed operational version.

---

## 1. The one rule that outranks the rest

**Review the plan, not the diff.**

One bad line of plan becomes hundreds of bad lines of code. One misunderstanding of the codebase
becomes thousands. Attention spent on a plan is worth an order of magnitude more than the same
attention spent on a diff.

Corollary: the diff gets reviewed too, but by a fresh-context agent, not by you.

---

## 2. Short constraints. Say them early.

One word each. They recalibrate everything downstream and they cost nothing.

| Say | Get |
|---|---|
| **decide** | It picks, explains in one line, moves on. Use it when a question is genuinely yours but you have no preference. |
| **sourced** | No number without a link in the same paragraph. Cite or delete. |
| **short** | Halves the output. The default runs long. |
| **draft** | Fast and rough, iterate after. Without it everything gets polished, which wastes effort on most work. |
| **no research** | Work with what we have, do not spawn agents. |
| **answer, do not act** | Opinion wanted, not modified files. |
| **plan first** | No edits until a plan exists and you have read it. |
| **show me** | Output of the command, not a claim about the command. |

---

## 3. Terse, not cryptic

Dropping politeness, hedging and preamble genuinely reduces cost and improves adherence. Dropping
constraint does not.

**Good terse:** "use pnpm not npm", "match core/grading/normalize.ts", "one file, no abstractions",
"tests first".

**False economy:** "fix auth" when you mean "the session cookie is not cleared on logout, see
`auth/session.ts`". An ambiguous prompt costs a full wrong implementation, which is orders of
magnitude more than the words you saved.

The rule: **be terse about manners, precise about constraints.** Imperative beats descriptive.
"Use X" beats "we generally prefer X". A missing word that changes the output is not a saving.

---

## 4. Prompts worth reusing

**Frame a feature, without writing the spec yourself:**
> Interview me in detail about X. Technical implementation, UX, edge cases, trade-offs. Keep going
> until we have covered everything, then write a spec with an explicit out-of-scope section.

**Set style, the only version that works:**
> Read `path/to/nearest/file.ts` and match its structure, naming and error handling exactly.

Pointing at code beats any written description of conventions.

**Verify, never "make sure it passes":**
> Run `pnpm verify` and show me the full output.

**Check scope:**
> Compare this diff to the plan. Every requirement implemented, edge cases tested, nothing outside
> scope changed. Report gaps, not style preferences.

**Adversarial review, with the leash:**
> Look for flaws. Only report what affects correctness or a stated requirement.

That last clause is not optional. Without it a reviewer always finds something, and chasing it
produces defensive code, unnecessary abstraction and tests for impossible cases.

---

## 5. Stop conditions

Discard the session and restart with a better prompt when any of these appear. Do not push through.

- The same issue has been corrected **twice**
- **Unrequested functionality** appears, however reasonable it looks
- **Tests were modified or deleted** to reach green
- The diff is **three times** the size the plan described

A clean session with a better prompt almost always beats a long session carrying failed attempts.

---

## 6. Non-linear conversation

**Annotate the file.** For reviewing any document, leave comments in place as you read:

```
<!-- ? why Postgres here -->
<!-- disagree, too complex -->
<!-- TODO verify this number -->
```

Then one message: "I annotated it." Everything gets handled in one pass, and each remark stays
attached to the exact place it concerns. This is the best form for artifact review and it costs you
nothing.

**Group unrelated topics** into one message: "three independent things: (1)… (2)… (3)…". Far better
than three messages.

**Separate sessions** for genuinely separate threads.

Messages sent mid-turn corrupt nothing, but they degrade that turn's answer, because attention splits
between tool results and the new question. Self-contained message: send it. Depends on what is
running: let the turn close.

---

## 7. What costs you time

- **One line at a time.** Batch objections: "five problems with this" resolves in two exchanges what
  otherwise takes fifteen.
- **Re-opening settled questions.** Once a criterion is agreed, apply the criterion instead of asking
  again.
- **Unanswered decisions.** When asked to choose, either choose or say "decide". Silence costs turns.
- **Polishing throwaway work.** Say "draft" and it stops.

---

## 8. Never delegate

Written by hand, always:

- The README and the project's entry point
- The core domain model
- Anything a reviewer opens in the first five minutes
- The final call on any architectural decision

If a file cannot be explained without rereading it, rewrite it before merging. The test is an
interview: someone will ask why a line exists.

---

## 9. Verification, always

An agent stops when the work **looks** done. Without a machine-checkable gate, "looks done" is the
only signal available and you become the verification loop.

- Ask for evidence, not assertions
- The `Stop` hook runs typecheck and lint on every turn, for zero tokens. It is the highest-return
  thing in the setup.
- Deterministic gates block; model review is advisory
- Four of the seven things people want from review should cost no tokens at all: duplication, dead
  code, conventions, best practice. Only security, regression and algorithmic efficiency need
  reasoning.

---

## 10. Subagents or a team

**Subagents** when only the result matters: multi-lens review, research, parallel work on disjoint
files. This covers almost everything.

**An agent team** only when agents must contradict each other: a bug whose cause is unknown, a
structural architecture decision. Three, read-only, explicit shutdown. Roughly twice a month.

A team costs about seven times a standard session. That number decides it, not preference.

---

## 11. Cost ladder

| Level | When | Cost |
|---|---|---|
| Stop hook | every turn | zero |
| Deterministic CI | every push | zero |
| Local subagent review | before a PR | subscription |
| Cloud verified review | auth, payments, migrations, sessions | real money, once or twice a month |

---

## 12. Documents state what is true, never how they got there

Banned in any document, comment or commit body: references to an earlier draft, to a review or audit,
to what was previously wrong, to a conversation.

**The test:** would this sentence make sense to someone who joined today and has no idea the project
had a yesterday? If not, delete it or move it.

Provenance has two legitimate homes: `agent-log.md` and the decision records. Nowhere else.

Same rule as code comments: a comment explains a constraint, never the history of the change that
introduced it.

---

## 13. ADR front matter

Every decision that depends on the state of the ecosystem carries its own expiry:

```yaml
---
status: accepted
date: 2026-07-28
revisit-when: typescript-eslint declares support for TypeScript 7
revisit-where: https://typescript-eslint.io/users/dependency-versions
---
```

A version pin, a workaround for an upstream gap, or a choice made because something was not ready yet
is debt the moment its reason expires. Debt with no trigger is invisible debt. Naming the condition
and the page turns it into a scheduled decision.

Write the ADR **when the decision is taken**, never at the end of a project. A retroactive one always
lies a little, because the decision is remembered and the rejected options are not.

---

## 14. Numbers

**Any number carrying an argument has its source in the same paragraph, or it is deleted.**

This applies to everything published: documentation, README, LinkedIn, an interview answer. One wrong
figure costs more credibility than three good arguments earn, and a reader sharp enough to appreciate
the good parts is exactly the one who checks.

Corollary: prefer a smaller verifiable number to a larger unverifiable one. Round down, never up.

---

## 15. The interview version

When asked how you use AI, the failure mode is enthusiasm. What reads as senior:

- **Lead with the division of labour.** You own planning and verification; the agent owns execution.
- **Name what you refused.** Where a model was considered and rejected, and the cheaper thing used
  instead. Nothing separates you faster from someone who wraps everything in a model.
- **Show the system, not the habits.** Guardrails in the repository: instruction files, review agents
  with an evidence bar, a hook that blocks on non-compiling code, boundaries enforced in CI.
- **Separate deterministic from probabilistic**, and say why the probabilistic layer never blocks.
- **Name the limits.** What does not work is what makes the rest credible.
- **Have one concrete override ready.** A specific case where you rejected what the agent proposed,
  and why. This is the single most convincing thing you can say and it cannot be improvised.

The number worth knowing: model-written code merged **without** review runs measurably higher defect
rates; the same code **with** mandatory human review runs lower defect rates than purely human code.
The variable is the protocol, not the tool.
