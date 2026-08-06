# How this project is built

**What this is.** The process every change goes through, and why the agent configuration in `.claude/`
is shaped the way it is. Each section explains something present in this repository. For the inventory
of what each check actually runs and costs, see [`verification.md`](verification.md).

The general engineering standard this derives from is not part of the project.

**The governing rule, from which the rest follows: deterministic first, cheapest first, and the
probabilistic layer never blocks a merge on its own judgement except where nothing deterministic can
see the problem.** A linter does not argue and costs nothing; a model argues and costs money. So every
defect is caught by the cheapest mechanism that can see it, and the next layer up is reached for only
where the one below is blind. Where a model does run, what it produces is a finding for someone to
answer, not a verdict that closes a branch by itself.

## 1. The per-task cycle

1. Fresh session. One task per session, clear between unrelated tasks.
2. Spec by interview rather than by writing it yourself, with an explicit out-of-scope section.
3. Fresh session. Research through subagents so the searching does not pollute the parent context,
   then a plan naming files, interfaces and per-phase verification, which `/plan` produces from a
   goal. Edit that plan by hand.
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

So `/pre-pr` runs the free gates first, captures the diff once, and spawns the reviewers in parallel.
Which lenses exist and which model each one runs on is in
[`verification.md`](verification.md#the-six-reviewers). What matters here is the bar they share: a
claim about behaviour needs a `file:line` citation, an inference from a name is not a finding, and
finding nothing is a valid result stated in one line. A reviewer asked to find problems will find them
whether or not they exist, and chasing those produces exactly the defensive code this project avoids.

One of them reads documentation rather than code, because `check-docs.sh` proves a link resolves and a
count holds, and nothing deterministic can prove that two documents describing the same rule still
agree. That frontier is the only place a model earns a place inside the loop.

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

`AGENTS.md` lists what makes an agent stop and ask. This is the other half: what the answer usually is.

Discarding the session and restarting with a better prompt beats continuing, when the same issue has
been corrected twice, when unrequested functionality has appeared however reasonable, when a test was
modified to reach green, or when the diff is several times what the plan described.

A clean session with a better prompt almost always beats a long session carrying failed attempts. The
agent stops and asks because it cannot make that call; the answer is nearly always to restart.

## 4. Written by hand, not delegated

README, the entry point, `core/srs` and `core/grading`. A reviewer opens three to five files and those
are the ones. If a file cannot be explained without rereading it, it is rewritten before merge.

## 5. Hooks

Of the events the tool offers, `Stop` is the one that carries weight for solo work. `PostToolUse` fires
after every shell command and `PreToolUse` before one, a grain that describes a tool call rather than
an intention, which leaves it good for a check costing nothing and, where the call names its own
destination, for refusing that one. Two are registered there: one names what an edit reaches and
refuses none of them, the other refuses a command carrying the WaniKani API as its destination.
`SubagentStop` fires per reviewer, which nothing here needs, and `TeammateIdle` only fires inside an
agent team.

The compile hook is the highest return in this method: thirty minutes of setup, zero tokens, and it
refuses the end of a turn on code that does not compile. What it runs, and what bounds that refusal to
one forced continuation, is in [`verification.md`](verification.md#the-hooks). The arguments behind it
are here.

**An event is not an intention, and a hook that has to guess which one it is looking at is not a
guard.** A hook can see that a shell command ran; it cannot see that the command was about to open a
pull request without recognising it from its text, and that text carries quoting, heredocs, aliases,
environment prefixes and newlines that are separators. Every one of those is a way to match what should
have been ignored or to ignore what should have matched, and each fix moves the failure rather than
removing it. A host is the narrow exception, the text being the destination itself rather than a sign
of an intention, and refusing one is still a fence rather than a guard: what walks around it is named
where it is registered. Where the question is a property of the branch instead, a required check
answers it exactly: whether a pass is on record does not depend on parsing anything.

**The fast gate is what a hook can afford, and that decides its contents.** `pnpm gate` runs from a
hook because it needs no database and finishes in seconds. `pnpm verify` does not, because a hook
killed on its timeout blocks nothing while appearing to guard everything. `check:docs` sits in the fast
one rather than only in the slow one because a documentation-only session never reaches the slow one,
which is exactly the session where documentation rules are the only rules that apply.

**`pnpm test` stays out of the gate for a different reason, and speed is not it.** The unit suite is
pure and finishes in well under a second, so it would fit. It is excluded because the failing test is
committed before the implementation: a hook running the suite would refuse the end of every turn for
the whole of the red phase, which is a deliberate and correct state. That exclusion expires on its own
terms rather than on a timing one, since the first test needing a database could not run from a hook
anyway.

**Finding a contradiction at the pull request rather than in the turn that made it has a price, and
the price is accepted.** A contradiction surfaced at review time can sit in documents belonging to an
earlier slice, so fixing it grows the diff past what the plan described, and leaving it ships it. The
turn boundary would catch it sooner, at the cost of reading the whole documentation set again every
time a document moves, which in a session that edits documentation is most turns. The slice pays the
larger fix rather than the session paying the repeated reading.

`info/` carries no hook, because the requirement is that it must not reach the remote and `.gitignore`
is the whole of that. What `AGENTS.md` adds is a matter of judgement rather than of access: nothing
there is read unprompted, and nothing there is evidence for a claim about this repository. A hook
refusing every path that names the directory would enforce a stricter rule than the one wanted, and
would refuse a search pattern that merely mentions it.

**No hook spends a model pass, and the reason is that a trigger nobody chose spends without a budget.**
A hook running a linter is free and catches most agent regressions, so it belongs on an event. A hook
running a model is neither free nor bounded, and the events available are coarser than the work: the
closest thing to a commit an event can see is `HEAD` moving, which a rebase, a reset or a checkout does
too, each time arming a nested session and five reviewers over a range that has grown back to the whole
branch. Two such hooks fire over the same change without knowing about each other. The bill arrives
without anyone having asked for the reading.

**So the reviewers run once per pull request, through `/pre-pr`, when somebody asks.** The pull request
is the grain the lenses want anyway: the failing test committed before the implementation is half a
slice, and reading it alone produces findings about work that has not happened yet. `requirement-check`
in particular cannot judge a slice that is not finished.

**`change-walkthrough` runs in that same batch, and it is not a lens.** What it describes, and in which
sections, is stated once in `.claude/agents/change-walkthrough.md`; restating it here is how the two
drift. It reports no defect, writes nothing, and appends no line to the
review log, so it changes nothing about what a pass records or what the coverage gate counts. It rides
along with the lenses because it reads the same diff, and it earns its place on the one question the
diff cannot answer on its own: where a new symbol is plugged in, or whether anything calls it yet. It
is absent from [`verification.md`](verification.md) on purpose: that document carries what refuses a
merge, and a description refuses nothing.

**What replaces the automatic trigger is the merge button, not a reminder.** Reaching a pull request
with unread code stops depending on anyone remembering, because `check-review-coverage.sh` runs as a
required check and refuses the merge until a pass is on record. The demand moves from a hook that
interrupts to a gate that will not open, which costs nothing until it fires and cannot fire twice.

