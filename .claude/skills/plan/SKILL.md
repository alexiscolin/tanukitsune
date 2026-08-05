---
name: plan
description: Turns a goal into the plan step 3 of docs/workflow.md asks for: slices, the files each touches, the interfaces it commits, its verification, the acceptance criteria it closes, and every stop it contains. Use before writing any code for a new piece of work.
argument-hint: "[the goal]"
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git diff:*)
---

# Plan

`docs/workflow.md` names two steps before any code: a spec by interview with an explicit out-of-scope
section, then a plan naming files, interfaces and per-phase verification, edited by hand. This is the
tool for both.

**Nothing forces it.** `/pre-pr` is unavoidable because a required check refuses the merge without a
pass on record; this one runs because the reader asks for it. What CI holds at the other end is that
the description is not empty, which catches a plan nobody wrote and not a plan the work outgrew.

Write no code here. The output is text the reader edits, and it ends up in the pull request
description, which is where `docs/workflow.md` puts the plan and nowhere else: it is working material
rather than a description of the system, so a committed plan is a document that will contradict the
code later. Do not write it to a file in the repository.

## 1. Read the goal, and interview only if it is thin

A goal names the state the reader wants true, how they will know it is, and what they will give up to
have it sooner. Everything else is theirs to rule on rather than to write.

Ask only for what is missing, once, and no more than three questions. A goal that already carries its
three parts goes straight to step 2, and a survey where a sentence would do is what makes a reader
stop stating goals at all.

## 2. Place it against what ships

Read the acceptance criteria and the out-of-scope section of `docs/specs/v0.1.md`, and name which
criteria the goal closes. **A goal matching no criterion is a finding, not a detail**: it is either out
of scope, and adding it is a scope violation rather than initiative, or it is a criterion the spec
lacks. Both are the reader's call, and both are cheaper before the plan than after the diff.

Read `docs/framing.md` only where the goal touches a mechanism it decides, and `docs/decisions/` when
the goal argues with one.

## 3. Cut it into slices

One slice is one behaviour, about five files, one pull request, per `docs/workflow.md`. A goal worth
stating usually holds two or three. Order them so each leaves the product in a state the reader can
use, and so the one that cannot be undone comes last rather than first.

For each slice, name: what changes for the reader, the files it is expected to touch, the interfaces
it commits, how each phase is verified, and which acceptance criteria it closes. The file list is what
`AGENTS.md`'s "the diff is growing past what the plan described" is read against, by the reader and by
`requirement-check` at review time. Nothing computes that comparison, so the list is what makes the
stop possible rather than what makes it fire.

## 4. Gather the stops

Read `AGENTS.md`'s stop-and-ask list against each slice and name every stop it contains: a frozen
interface, a token or an authorisation check, behaviour an existing test covers, a dependency, an
abstraction under three call sites. **The reader rules on all of them here, in one pass.**

A stop raised mid-flight is legitimate only for what the plan could not foresee. A session that keeps
interrupting the reader for decisions a plan could have gathered is one that skipped this step.

## 5. Say what it leaves out

Name what the goal does not buy and what the plan deliberately postpones, with where each is recorded.
A plan whose out-of-scope section is empty has not been read carefully enough, and it is the section
the reader corrects most.

## 6. Hand it back

Give the plan and stop. The reader edits it by hand and rules once. Only then does the work start, and
the first commit of a slice is the failing test, not the implementation.
