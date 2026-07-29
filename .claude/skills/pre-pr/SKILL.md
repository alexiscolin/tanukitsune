---
name: pre-pr
description: Runs the full pre-PR review sequence: deterministic gates, then five fresh-context reviewers in parallel, then synthesis. Use before opening any pull request.
disable-model-invocation: true
argument-hint: "[base-branch]"
allowed-tools: Bash(pnpm verify), Bash(git diff:*), Bash(git merge-base:*), Read, Write, Edit, Task, SlashCommand
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

## 3. Five reviewers, in parallel, fresh context

Spawn all five at once, and **not in the background**: synthesis in step 4 needs their results, so
they run synchronously. They do not talk to each other: they apply disjoint lenses to the same diff
and report independently. Pass each one the diff path and the task's plan or spec.

- `requirement-check`, whether the diff is what was asked for, no more and no less
- `regression-check`, behaviour that worked and now behaves differently
- `architecture-check`, boundaries, duplication against existing code, premature abstraction
- `security-check`, untrusted input, secrets, client boundary, authorisation
- `performance-check`, N+1 queries, complexity, missing pagination, sequential awaits

`requirement-check` needs the requirement more than it needs the diff, so give it the plan and the spec
first and the diff path second, in that order.

Add `docs-conformity` as a sixth **only when the documentation set has moved since it last read it**.
A run that finds the set unchanged since the previous one pays for the same reading twice. When it does
run, it reads the whole set rather than the diff, since a contradiction has two sides and only one of
them is in the change.

They are defined in `.claude/agents/`. Do not restate their instructions here; if a lens needs
changing, change the agent file so the change persists.

## 4. Synthesise

Merge every report into one list, ordered by severity, deduplicated. For each finding keep the
`file:line` citation. Drop anything without one: that was the reviewers' instruction and it applies to
the synthesis too.

Then state plainly what the reviewers did not cover, so the gap is visible rather than assumed away:
they read a diff, so they cannot see a regression whose cause lies in unchanged code, and they do not
run anything.

## 5. Record what the reviewers produced

Once each finding has been fixed or dismissed, append one line per finding to
`.claude/review-log.jsonl`:

```
{"date":"2026-07-29","branch":"feat/x","reviewer":"security-check","file":"src/a.ts","line":42,"outcome":"fixed"}
```

`outcome` is `fixed` or `dismissed`, and a finding left without one refuses the merge, since a finding
with no sort is a review that has not finished. A `dismissed` line carries a `reason` besides, and the
merge is refused without it: a dismissal with nothing said cannot be told apart from a finding nobody
answered. The commit hook writes its own findings with no `outcome` at all: those are disposed of by
setting `outcome`, and `reason` with it on a dismissal, on the line that is already there. That is the
only edit this log accepts; everything else about the file is append-only, its formatting included,
since a line rewritten in passing is a record altered with nothing recording that it was.

Unsorted findings are counted for the current branch only, so a line left waiting on another branch
does not refuse this one. A detached head names no branch and the whole log answers instead, which is
what the pull request job reads.

Then append one pass line, whether or not anything was found, naming the range the lenses read:

```
{"date":"2026-07-29","branch":"feat/x","kind":"pass","base":"9a1c2f0e","head":"3b7d4e21"}
```

`base` and `head` are real shas, from `git merge-base main HEAD` and `git rev-parse HEAD`. A pass naming
anything that does not resolve counts as no pass at all, so a placeholder left unfilled refuses the
merge rather than opening it.

This line is what `scripts/check-review-coverage.sh` reads to decide whether a commit of code has been
looked at, so omitting it refuses the pull request at `gh pr create` and again at the merge. It is also
the denominator `scripts/review-stats.sh` needs: findings alone cannot say whether a quiet lens met
clean code or ran once and never again. Without both lines the reviewers are the only part of this
repository that is asserted rather than measured.

## 6. Cleanup, then hand back

Run `/simplify` for reuse and cleanup. It is model-invocable, so it runs from here.

`/code-review` is not: it is deliberately marked so a model cannot trigger it. End by naming it rather
than pretending it ran.

For a change where a bug would be expensive, auth, payments, a schema migration or session handling,
recommend `/code-review ultra` as well and say why this change qualifies. It costs real money, so the
recommendation needs a reason, not a habit.
