---
name: pre-pr
description: Runs the full pre-PR review sequence: deterministic gates, then four fresh-context reviewers in parallel, then synthesis. Use before opening any pull request.
disable-model-invocation: true
argument-hint: "[base-branch]"
allowed-tools: Bash(pnpm verify), Bash(git diff:*), Bash(git merge-base:*), Write, Task, SlashCommand
---

# Pre-PR review

Runs everything that must happen before a pull request is opened, in cost order: free checks first,
reasoning last.

## 1. Deterministic gates, zero tokens

Run `pnpm verify`. If anything fails, stop and report. There is no point paying for reasoning about
code that does not compile, and every finding a linter can produce is a finding a reviewer should not
waste attention on.

Report the actual output. Do not summarise a pass you did not see.

## 2. Capture the diff once

Write the diff against the base branch to a file, and pass every reviewer the **path**, not the
content. Four prompts each carrying an 800-line diff costs four times the diff in tokens, and the
reviewers all have `Read`.

Nobody reviews the whole repository.

If the diff exceeds roughly 800 lines, say so and recommend splitting the PR before reviewing. A
review of an oversized diff produces shallow findings and false confidence.

## 3. Four reviewers, in parallel, fresh context

Spawn all four at once, and **not in the background**: synthesis in step 4 needs their results, so
they run synchronously. They do not talk to each other: they apply disjoint lenses to the same diff
and report independently. Pass each one the diff path and the task's plan or spec.

- `regression-check`, behaviour that worked and now behaves differently
- `architecture-check`, boundaries, duplication against existing code, premature abstraction
- `security-check`, untrusted input, secrets, client boundary, authorisation
- `performance-check`, N+1 queries, complexity, missing pagination, sequential awaits

Add `docs-conformity` as a fifth when the diff touches any `.md` file. It reads the changed documents
against the rest of the set rather than against the diff, so it needs the paths that changed and not
the diff file.

They are defined in `.claude/agents/`. Do not restate their instructions here; if a lens needs
changing, change the agent file so the change persists.

## 4. Synthesise

Merge the four reports into one list, ordered by severity, deduplicated. For each finding keep the
`file:line` citation. Drop anything without one: that was the reviewers' instruction and it applies to
the synthesis too.

Then state plainly what the reviewers did not cover, so the gap is visible rather than assumed away:
they read a diff, so they cannot see a regression whose cause lies in unchanged code, and they do not
run anything.

## 5. Cleanup, then hand back

Run `/simplify` for reuse and cleanup. It is model-invocable, so it runs from here.

`/code-review` is not: it is deliberately marked so a model cannot trigger it. End by naming it rather
than pretending it ran.

For a change where a bug would be expensive, auth, payments, a schema migration or session handling,
recommend `/code-review ultra` as well and say why this change qualifies. It costs real money, so the
recommendation needs a reason, not a habit.
