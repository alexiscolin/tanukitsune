# Working with coding agents: a course

**What this is.** A complete treatment of agent-assisted engineering from the human side: the mental
model, the loop, how to phrase things, how to keep control, how to review, what it costs, and what the
evidence supports. Written to be learned from once and consulted afterwards.

[`workflow.md`](workflow.md) is how this project applies it. [`ai-engineering.md`](ai-engineering.md)
covers the model-facing engineering. This document is the general version and explains why each rule
exists rather than only stating it.

---

# Part I. The mental model

## 1. What actually changed

Writing code stopped being the bottleneck. That is the entire change, and almost every mistake in this
field comes from not following it through.

If producing code is cheap, the scarce resources become what was always downstream of it: deciding
what to build, verifying it is correct, and understanding it well enough to maintain it. Organisations
that adopted agents seriously report the same displacement: the bottleneck moved to verification,
review and security rather than disappearing.

Three consequences, none of them obvious.

**Cheap code makes discarding code rational.** A wrong implementation used to be expensive enough that
you repaired it. Restarting from a better prompt is now usually faster, which is why the stop
conditions in Part IV are thresholds rather than suggestions.

**Cheap code makes reading the bottleneck.** You can generate far more than you can review, and any
practice that outruns your review capacity produces unreviewed code. Model-written code merged without
review carries measurably more defects than human code; the same code under mandatory review carries
fewer. Review is not overhead attached to the technique. It is what makes the technique work.

**Cheap code makes judgement the scarce input**, which is the next section.

## 2. The division of labour

Measured across real usage: humans take roughly 70 percent of **planning** decisions, agents take
roughly 80 percent of **execution** decisions.

That is a description of what happens when it goes well, not a policy. When it goes badly, the split
inverted: someone let the agent decide what to build, or spent their own attention on formatting
instead of design.

You own: the problem being solved, what is out of scope, the interfaces, the definition of done, and
whether the result is acceptable. The agent owns: which files in what order, implementation mechanics,
and searching unfamiliar code.

## 3. Why expertise predicts success, and typing speed does not

The strongest predictor of good results is **domain expertise**, not coding proficiency. Experts
trigger about 12 actions per prompt against 5 for novices; verified success runs 28 to 33 percent
against 15; and when things go wrong, novices abandon about three times more often.

The mechanism is plain. An expert recognises a wrong answer immediately, gives a correction containing
the missing constraint, and knows which of five plausible approaches survives contact with the rest of
the system. A novice cannot separate plausible from correct, so every iteration is a coin flip.

The uncomfortable corollary: **expertise is task-specific.** A senior engineer asking their first
question about an unfamiliar runtime is, for that question, a novice. This is where the most confident
mistakes happen, because the interaction feels equally fluent in both cases.

Outside your expertise, compensate: demand evidence rather than accepting assertions, verify
externally rather than trusting explanations, and shrink each step so a wrong answer is cheap.

---

# Part II. The loop

## 4. Explore, plan, implement, verify

The canonical cycle, with one separation that matters: **plan in a mode that cannot write.** Reading
the plan is the review; editing the plan is the intervention.

Skip the ceremony when it is not warranted. If you could describe the change in one sentence, make the
change. Planning earns its cost when a change spans several files, when the approach is uncertain, or
when the code is unfamiliar.

## 5. The leverage point: review the plan, not the diff

**One bad line of plan produces hundreds of bad lines of code. One misunderstanding of the codebase
produces thousands.**

The damage hierarchy is wrong information, then missing information, then noise. Wrong information
propagates; missing information causes a detour; noise costs a little quality.

So the highest-value artifact to read is the one furthest upstream: the research summary, then the
plan. By the time it is a diff, the decisions are made and you are inspecting consequences.

This inverts the usual instinct, which is to skim the plan and scrutinise the code. Do the opposite.
Read the plan like a design document. Then have a **fresh-context agent** check the diff against it,
because that part is mechanical and you are the expensive resource.

## 6. Context is a resource, and it degrades

Quality falls as the window fills, gradually rather than at a cliff, which is worse because there is
no signal.

Target 40 to 60 percent utilisation and compact deliberately. Compaction is lossy: at 95 percent you
lose whatever the compactor judged unimportant, which is not necessarily what you judged unimportant.

Three habits follow. **One task per session**, clearing between unrelated tasks, because a session
that fixed a bug then reviewed a PR carries two irrelevant contexts into the third job. **Delegate
searching**, since exploration is the most context-expensive activity and the least valuable to keep.
And **keep artifacts rather than conversation**, because a plan written to a file survives a reset and
a plan that lives only in the exchange does not.

## 7. Interfaces before implementations

Write and commit types, schemas and signatures first, with no bodies. Then tests against those
signatures. Then let implementation fill the bodies under an explicit constraint: **contracts do not
change.** A contract change is a re-plan, not an implementation detail.

This is the most effective structural technique available, for two reasons.

It **prevents duplication before it happens.** An agent that finds an existing contract uses it. An
agent that finds none invents a parallel helper, which is the mechanism behind measured duplication
growth.

It **turns the type system into a scope boundary.** An agent can argue with a written instruction. It
cannot argue with a compile error.

## 8. Task sizing

Well sized: describable in one sentence, not doable in one line, roughly five files or fewer, one
testable behaviour, finishable before context is half full.

Too large is the common failure, visible as a diff several times the planned size, and it is among the
top reasons agent-authored changes get rejected in practice.

Too small is real and less discussed: decomposing past coherence loses the context that made the task
tractable, and you end up integrating fragments that do not fit.

Prefer **vertical slices** over horizontal layers. One slice delivers a user-visible increment plus
its tests, rather than all the types, then all the handlers, then all the interface.

---

# Part III. Communication

## 9. How to phrase an instruction

**Imperative beats descriptive.** "Use pnpm, not npm" beats "we generally prefer pnpm". The second is
a preference to weigh; the first is a constraint to follow.

**Point at code, not at prose.** "Read `core/grading/normalize.ts` and match its structure, naming and
error handling" beats any paragraph describing conventions. Agents imitate local examples far more
reliably than they apply abstract rules. This is the highest-return phrasing change available, and it
is why a consistent repository stays consistent while a mixed one drifts further.

**Say what to do, not what to avoid.** Long prohibition lists dilute the instruction that matters, and
current models follow positive instruction better than negative. When something must be forbidden,
prefer a mechanism that makes it impossible over a sentence asking for restraint.

**State the constraint, not the symptom.** "Fix the flaky test" gives nothing. "The test assumes a
monotonic clock and it is not, line 40" gives everything.

## 10. Short constraints

One word each, said early. They recalibrate the exchange and cost nothing.

| Say | Effect | Use when |
|---|---|---|
| **decide** | It picks, explains in one line, proceeds | The question is legitimately yours but you have no preference. Silence on a decision is the most expensive failure mode available |
| **sourced** | No number without a link in the same paragraph | Anything that will be published or argued from |
| **short** | Halves the output | Almost always. The default runs long |
| **draft** | Fast and rough, iterate after | Work you expect to rewrite |
| **no research** | Use what is here, do not spawn agents | Time-boxed, or the answer is already in the repository |
| **answer, do not act** | Opinion, not modified files | You are thinking out loud |
| **plan first** | No edits until a plan exists | Anything spanning more than a couple of files |
| **show me** | The command output, not a claim about it | Always, for anything claimed to pass |

## 11. Terse, not cryptic

Dropping politeness, hedging and preamble genuinely reduces cost and improves adherence. Dropping
constraint does not.

**Good terse:** "use pnpm not npm" · "match `core/grading/normalize.ts`" · "one file, no abstractions"
· "failing test first" · "no new deps".

**False economy:** "fix auth", when you meant "the session cookie is not cleared on logout, see
`auth/session.ts`". An ambiguous instruction costs a wrong implementation plus the round trip to
discover it, orders of magnitude more than the words saved.

The rule: **terse about manners, precise about constraints.** A word whose removal changes the output
is not a saving; a word whose removal changes only the tone is.

## 12. Prompt patterns worth memorising

**Frame a feature without writing the spec yourself.**
> Interview me in detail about X. Ask about technical implementation, UX, edge cases, concerns and
> trade-offs. Keep going until we have covered everything, then write a complete spec with an explicit
> out-of-scope section.

The out-of-scope section is the anti-drift primitive. Without a stated negative boundary an agent
optimises toward helpfulness, which is how scope grows.

**Set style by example.**
> Read `path/to/nearest/file.ts` and match its structure, naming and error handling exactly.

**Demand evidence.**
> Run `pnpm verify` and show me the full output.

Never "make sure the tests pass". An agent stops when work *looks* done, and without a checkable gate
that is the only signal it has.

**Check scope against the plan.**
> Compare this diff to the plan. Check every requirement is implemented, the listed edge cases have
> tests, and nothing outside the task's scope changed. Report gaps, not style preferences.

**Adversarial review, with the leash.**
> Look for flaws. Only report what affects correctness or a stated requirement.

That final clause is not optional. A reviewer asked to find problems finds some even when the work is
sound, and chasing manufactured findings produces exactly the extra abstraction, defensive code and
impossible-case tests you were avoiding.

**Comprehension check, before you have to defend it.**
> Give me a complete linear walkthrough of this module, in the order a reader should understand it.

If the walkthrough does not make sense to you, the code is not yours yet.

## 13. Non-linear conversation

**Annotate the file.** For reviewing any artifact, leave comments in place as you read:

```
<!-- ? why Postgres here -->
<!-- disagree, too complex -->
<!-- TODO verify this number -->
```

Then one message: "I annotated it." Everything is handled in one pass and each remark stays attached
to the place it concerns. This is the best form for document review and it costs nothing: you react as
you read, with no round trips.

**Group unrelated topics** into one numbered message. Three separate messages produce three partial
answers; one structured message produces one complete answer.

**Separate sessions for separate threads.** Interleaving two projects pollutes both.

Messages sent while work is running corrupt nothing, but they degrade that turn's answer, because
attention splits between the running work and the new question. Self-contained: send it. Dependent on
what is running: let the turn close.

## 14. Getting an honest answer rather than an agreeable one

An assistant has a real bias toward agreement. It shows up as adopting your framing before evaluating
it, finding merit in your suggestion because you made it, and softening a disagreement into a
qualified yes.

**Instructing it away works weakly.** "Be critical" produces performed criticism: objections
manufactured to satisfy the instruction, which is the same failure mode as a reviewer that invents
findings. "Never just agree with me" is worse, because it produces contrarianism, which is agreement
wearing a different coat. In both cases you still cannot distinguish the response from judgement.

What works is structural.

**Fresh context is the main lever.** An assistant that watched you argue for something is anchored on
it. One that receives the artifact without knowing who wrote it or what you think evaluates the
artifact. In practice this catches an order of magnitude more than any instruction: false claims,
broken mechanisms, and internal contradictions that survived every self-review.

**Do not reveal your preference in the question.** "Is X a good idea here?" invites agreement. "Three
strongest arguments against X, three for, then which wins and why" invites analysis.

**Ask for the mechanism, not the verdict.** "What breaks first?" beats "is this good?". A verdict is
an opinion; a mechanism is checkable.

**Ask for the cost of being wrong**, not the probability of being right. "If this choice is wrong,
what does it cost and when do I find out?" leaves the register of approval entirely.

**Require the citation.** An agreement that has to point at a file and line, or a source, becomes
verifiable. This is the same rule as section 38, applied to conversation.

**Separate proposing from evaluating.** Whoever proposed an option should not be the one scoring it.
That applies to you as much as to the assistant.

The instruction is still worth giving, and it costs one line. Just do not mistake it for the control.

## 15. What costs you time

- **One line at a time.** Batching objections resolves in two exchanges what otherwise takes fifteen.
- **Re-opening settled questions.** Once a criterion is agreed, apply it rather than asking again.
- **Unanswered decisions.** When asked to choose, choose or say "decide".
- **Polishing throwaway work.** One word prevents it.
- **Asking for reassurance.** A doubt already answered by a stated criterion is one you can resolve
  yourself.

---

# Part IV. Control

## 16. Stop conditions

Discard the session and restart with a better prompt when any of these appear. Do not push through:
each signals that the context is now working against you.

**The same issue corrected twice.** The context is polluted with failed approaches and every
subsequent attempt is conditioned on them. A clean session with a better prompt, incorporating what
you learned, almost always wins.

**Unrequested functionality**, however reasonable. This is scope drift at its source and it is where
dead code comes from.

**Tests modified or deleted to reach green.** The most serious signal on the list. The countermeasure
is structural: commit the failing test as its own step, before implementation, so it cannot be quietly
rewritten.

**The diff is three times the planned size.** Do not review eleven files when the plan said three.
Re-plan.

## 17. Verification

The governing sentence: **an agent stops when the work looks done, and without a check it can run,
"looks done" is the only signal available.** Provide one, or you are the verification loop.

Four levels, increasing in setup cost: in the prompt ("run the tests after implementing"); in the
session (a separate evaluator re-checking each turn); deterministic (a hook that blocks the turn until
a script passes, costing zero tokens and always firing); and a second opinion (a fresh-context agent
trying to refute the result).

In all four: **ask for evidence rather than assertion.** The command and its output, not a summary of
what the output presumably was.

## 18. What never to delegate

The README and the entry point. The core domain model. Anything a reviewer opens in the first five
minutes. The final call on any architectural decision.

The test is an interview: someone will ask why a line exists. If a file cannot be explained without
rereading it, rewrite it before merging. Shipping code you cannot defend is the one failure mode no
tooling protects against.

---

# Part V. Review

## 19. Why the author is the worst reviewer

An agent that just wrote code is anchored on its intent rather than its output. It reviews the plan it
had, not the diff it made.

The consequence is precise: **three review passes by the same agent are worth almost nothing.** What
works is a fresh context, which cannot see the reasoning that produced the code and therefore
evaluates the code.

This is also why review must not continue the implementation conversation. Same window, same
anchoring.

## 20. Disjoint lenses

Do not ask one reviewer to find everything; you get a shallow pass over each concern. Give each
reviewer one question: regression (does anything that worked behave differently, and was that asked
for), architecture (boundaries, duplication against existing code, abstractions with fewer than three
call sites), security (untrusted input, secrets, authorisation, the client boundary), performance
(queries in loops, complexity changes, missing pagination, sequential awaits).

Then three rules that make the output usable.

**An evidence bar.** A claim about behaviour requires a file and line citation; an inference from a
name is not a finding. Without this, half the report is speculation you must disprove.

**Read-only tools.** A reviewer that can edit will fix rather than report, and the finding is lost.

**Permission to find nothing.** State explicitly that finding nothing is valid. Otherwise the reviewer
manufactures findings to appear useful and you spend the afternoon rejecting them.

## 21. Deterministic first, probabilistic second

Never pay a model for what a linter does.

Of the things people want from review, roughly four in seven cost nothing: duplication, dead code,
convention adherence and standard best practice all come from static analysis. Only security,
regression and algorithmic efficiency genuinely require reasoning.

So: free checks first, model review only on what survives. And the separation is a policy as well as
an order. **Deterministic gates block a merge; model review is advisory.** Being able to explain why
the probabilistic layer never blocks is a stronger signal than any configuration.

---

# Part VI. Scale and cost

## 22. Subagents or a team

A **subagent** reports to the parent and has its own context window. A **teammate** talks to other
teammates and self-claims from a shared task list, at roughly seven times the cost of a standard
session.

Subagents when only the result matters: multi-lens review, research, parallel work on non-overlapping
files. This covers almost everything.

A team only when agents must **contradict each other**: a bug whose cause is unknown and where
competing hypotheses need refuting, or an architectural decision where you want to see the
disagreement. Three, not five. Read-only where possible. Explicit shutdown, because an idle teammate
still consumes.

The failure to avoid: parallel agents editing the same files. Sequencing two tasks costs less than
debugging a merge that silently changed behaviour.

## 23. The cost ladder

| Level | When | Cost |
|---|---|---|
| A hook running typecheck and lint | every turn | zero tokens |
| Deterministic CI | every push | zero tokens |
| Local subagent review | before a pull request | subscription |
| Cloud verified review | changes where a bug is expensive | real money per run |

Cloud verified review earns its price on authentication, payments, schema migrations and session
handling. It does not earn it as a habit, and reserving it with a stated reason is itself the
judgement being demonstrated.

## 24. Hooks

The highest-return setup available: a hook that runs typecheck and lint when a turn tries to end and
blocks it if either fails. Thirty minutes to write, zero tokens to run, and it makes it structurally
impossible to declare success on code that does not compile.

Two details that are easy to get wrong. It needs a **recursion guard**, or a hook that launches
anything which itself ends a turn will loop. And the error output must actually reach the agent: if a
blocking exit surfaces only one stream and the script writes to the other, the hook blocks the turn
while withholding the information needed to unblock it, and the agent guesses in a loop.

Keep hooks deterministic. A hook that runs a linter is free and catches most regressions. A hook that
runs a model is expensive and unpredictable.

---

# Part VII. Building AI products, not just with AI

Everything above is about using agents to build software. This part is about the discipline when the
model is *in* the product. The detailed project-specific version is in
[`ai-engineering.md`](ai-engineering.md).

## 25. The first question is always where not to use one

The distinguishing habit of the role is refusing the model where something cheaper is correct. A
scheduling algorithm, a rules engine, a data table, an aggregation, a retrieval from an open corpus: each
of these beats a model on accuracy, latency and cost simultaneously.

Write the refusals down with the cheaper thing named. It is the fastest way to distinguish yourself
from someone who wraps everything in a model, and hiring processes in this market are saturated with
the latter.

## 26. Generated once versus generated per interaction

The economic question that decides an AI product's viability: **is this output the same for every
user?**

If yes, generate it once, share it, and the marginal cost per new user approaches zero. Batch pricing
roughly halves it again, and a cached shared prefix reduces it further. Budget several full runs,
because the first sample is always mediocre and the prompt changes after reading it.

If no, it is a live cost per interaction and needs a cascade in front of it, a cache behind it, and a
spend cap around it.

Getting this split right matters more than any model choice.

## 27. Cascades before models

Put the cheapest deterministic tier first, escalate only when it cannot decide. Exact match, then
fuzzy match, then a model. On classification-shaped tasks this resolves most traffic before any model
call.

That is simultaneously the cost story and the reliability story, and it is why the cascade design
matters far more than which model sits at the end of it.

## 28. Structured output, and why parsing is not the hard part

Use the provider's native structured-output path with a schema, and keep schemas **flat and shallow**:
deep nesting is the most common cause of structured-output failure, and some providers do not support
recursion at all. Constraints like minimum and maximum length are frequently dropped before reaching
the model, so they are validation on the way back rather than instruction on the way out.

Hand-written parsing is no longer needed, but **a parse failure is a first-class outcome**: typed,
logged, counted, never silently coerced to null.

And a refusal is not an exception. Newer models return a safety decline as a successful response with
a distinct stop reason, so code reading the first content block unconditionally breaks.

## 29. Verify, do not trust the constraint

When you need a model to obey a rule, do not ask it to obey and hope. Generate, then check
deterministically, then regenerate on failure with the validation error fed back.

This is stronger than prompting for compliance, it is measurable, and the retry-count distribution
becomes a free quality metric for that surface.

## 30. Evals

Tiered and hybrid: deterministic assertions wherever a property is checkable, model grading only where
judgement is genuinely required, human review for the small fraction either layer flags.

**Start at five to ten cases**, not five hundred. A golden set grows from production failures: every
bug report becomes a case. That habit is the highest-leverage one available here.

**Stratify toward the hard middle.** A set that is ninety percent obvious will report ninety-five
percent accuracy and teach nothing.

**Two sets, not one.** A stratified diagnostic set for finding failure modes, and a representative set
for the headline number, because stratifying engineers away the class balance the headline needs.

**Datasets live in version control next to the prompts.** A prompt change and a dataset change in the
same commit is a review flag, because that is how a suite gets fitted to a prompt rather than
measuring it.

**A score that only ever rises is a suite being overfitted.** Track dataset growth alongside it.

## 31. Judging with a model, and calibrating the judge

Where a model grades output, four rules separate a measurement from a demo.

**Closed output space.** An enum plus a short reason, never a numeric score. Score scales are where
calibration drift bites hardest and where agreement collapses.

**Different model family than the generator.** A model rates its own family's output measurably higher
on equivalent content.

**Reference-based, not open-ended.** Give the judge the correct answer and a tight rubric.

**Calibrate against humans.** Have people label first, using the exact rubric the judge will see, so
rubric ambiguity surfaces as disagreement between humans rather than as a mysterious score later.
Label blind to the judge's output and freeze labels before tuning. Then measure agreement with a
chance-corrected statistic rather than raw accuracy, because raw agreement inflates badly under class
imbalance: a judge that always says pass, on data that is ninety percent pass, scores ninety percent
agreement and near-zero real discrimination. Under heavy imbalance report a paradox-resistant
statistic alongside and say why.

**Measure the two error directions separately.** They are almost never equally costly, and a single
accuracy figure hides the one that matters.

## 32. Cost engineering

Three caching mechanisms, commonly confused.

**Exact-match caching** of results, keyed by normalised input plus every version that affects the
output: model, prompt, and any content the answer depends on. Usually the largest win.

**Provider prefix caching**, which is invalidated by any byte change anywhere in the prefix. No
timestamps, no unsorted structures, no varying tool list inside the cached region. The minimum
cacheable size is model-dependent and fails silently, so verify against the reported cache-read count
rather than assuming.

**Semantic caching**, which trades accuracy for cost and is unacceptable whenever the cached value
*is* a correctness judgement. Two near-identical strings can have opposite correct answers.

And one accounting trap: the reported input token count is often only the uncached remainder, so a
cost dashboard that reads it alone under-reports once caching is on.

Track two numbers: cost per active user per day, and marginal cost per interaction. The second decides
whether the product is viable.

## 33. Observability and drift

Emit spans with the user, the feature, the prompt version, the model identifier and full token usage
including cache fields. Compute cost server-side from a versioned price table in code rather than
trusting a vendor dashboard.

**Do not build dashboards on emerging semantic-convention attribute names** while they are unstable;
normalise into an internal schema at ingest.

Alert on escalation rate, parse-failure rate, refusal rate, retry distribution, latency and cache hit
rate. Those double as the drift monitor: a judge calibrated once would otherwise never be measured
again, and a model version change silently shifts what its scores mean.

## 34. Guardrails that are architectural, not declarative

Prompt injection is not solved, acknowledged by every major provider. Instructions telling a model to
ignore instructions are hygiene, not defence.

What works is structural: a constrained output space, no tools where untrusted text flows,
deterministic validation of anything produced, and never rendering model output as markup. A component
with no tools and a closed enum output cannot exfiltrate or act, and that is a real property you can
state precisely rather than a control you hope holds.

## 35. The feedback loop most products throw away

Any place a user corrects the system is a labelled human disagreement, produced free and continuously,
drawn from exactly the hard distribution a calibration set struggles to sample by hand.

Capture it from day one: the input, the system's answer, the correction, and the version of everything
involved. Feeding it back needs consent and can wait. Capturing it cannot, because it is not
recoverable retroactively.

---

# Part VIII. Artifacts

## 36. Documents state what is true, never how they got there

A document describes the current state of a system. It never narrates its own revision history.

Banned in any document, comment or commit body: references to an earlier draft, to a review or audit,
to what was previously wrong, or to the conversation that produced the text.

**The test:** would this sentence make sense to someone who joined today and has no idea the project
had a yesterday? If not, delete it or move it.

Provenance has two legitimate homes: a dated agent log, and decision records. Both exist precisely so
it can be removed from everywhere else without being lost.

## 37. Comments

Default to none. Write one only when deleting it would lose information not recoverable from the code:
why this approach rather than the obvious one, a non-obvious constraint, a workaround with its
upstream link, a regex or non-obvious algorithm, a deliberate deviation from convention.

Never a comment restating the line below it. Never section banners or step scaffolding. Never
documentation on a private, self-evident function. Uniform comment density across every file is itself
a signal of machine authorship, because humans comment unevenly.

## 38. Decision records, and expiry

Write the record **when the decision is taken.** A retroactive one always lies slightly, because the
decision is remembered and the rejected options are not.

One per decision that was expensive to reverse or that a reader will second-guess. Roughly a dozen on
a solo project; forty is ceremony. Append-only: superseding means a new file and a status change on
the old one, never an edit.

**Any decision depending on the state of the ecosystem carries its own expiry:**

```yaml
---
status: accepted
date: 2026-07-28
revisit-when: typescript-eslint declares support for TypeScript 7
revisit-where: https://typescript-eslint.io/users/dependency-versions
---
```

A version pin, a workaround for an upstream gap, or a choice made because something was not ready
becomes debt the moment its reason expires. Debt with no trigger is invisible. Naming the condition
and the page converts it into a scheduled decision.

## 39. Numbers

**Any number carrying an argument has its source in the same paragraph, or it is deleted.**

This applies equally to documentation, a README, a public post and an interview answer. One wrong
figure costs more credibility than three good arguments earn, and the reader sharp enough to
appreciate the arguments is exactly the one who checks the figure.

Two corollaries. **Round down, never up:** a smaller verifiable number beats a larger unverifiable
one. And **prefer a figure you produced:** a measurement from your own system, however modest, is
worth more than a benchmark you are repeating.

## 40. The agent log

A dated record of where you overruled the agent and why, written as it happens.

It cannot be reconstructed afterwards, which is the entire reason to start it on day one. For anyone
reading your work later it is the most-read page in the repository, because it is the only place that
demonstrates judgement rather than describing it.

---

# Part IX. The evidence

## 41. What the research supports

**Review is the variable.** Model-written code merged without review runs measurably higher defect
rates; the same code under mandatory human review runs lower defect rates than purely human code. This
reframes everything: the technique is not inherently better or worse, the protocol decides which.

**Throughput and instability rise together.** Higher adoption increases delivery speed and change
failure rate at once, with no observed reduction in friction or burnout.

**Structural quality has not followed speed.** Duplication rose and refactoring fell across a large
longitudinal sample, and security pass rates for generated code have been flat across successive
measurement rounds. Speed improved; structure did not. That gap is the space a serious engineer
occupies.

**One famous result was withdrawn.** The widely cited finding that experienced developers were 19
percent slower with AI while believing they were faster was retired by its own authors in early 2026
and revised toward a speedup on current tooling. Citing it as current is a tell.

## 42. What is genuinely contested

Say these as contested, because they are, and because knowing which is which is the skill.

Whether duplication is rising: one large longitudinal dataset says yes, another multi-project study
finds no trend, and they probably measure reviewed and unreviewed populations respectively, which is
itself the interesting finding. Whether agent teams justify their cost outside genuinely parallel
work. Adoption depth of newer agent protocols, where organisation counts are vendor-published and
"supported by" is not "used in production by".

Treat any specific performance multiplier for one tool over another as unverified until measured on
your own workload. That query space is dominated by content recycling invented figures.

## 43. Answering "how do you use AI" in an interview

The failure mode is enthusiasm. The prevailing hiring view is explicit: **fluency is a green flag,
dependency is a red flag.** So the answer demonstrates judgement, not tooling.

Lead with the division of labour: you own planning and verification, the agent owns execution.

**Name what you refused.** Where a model was considered and rejected, and the cheaper deterministic
thing used instead.

**Show the system, not the habits.** Guardrails living in the repository: instruction files, reviewers
with an evidence bar, a hook blocking on non-compiling code, boundaries enforced in CI. A reader can
inspect a system; they cannot inspect a description of your discipline.

**Separate deterministic from probabilistic**, and explain why the probabilistic layer never blocks a
merge.

**Name the limits.** What does not work is what makes the rest credible.

**Have one concrete override ready.** A specific case where you rejected what the agent proposed, and
why. The single most convincing thing available, and it cannot be improvised well, which is why
section 39 exists.

## 44. The one-paragraph version

Writing code got cheap, so the scarce resources became deciding what to build, verifying what was
built, and understanding the result. You keep planning and verification; you delegate execution. You
read plans rather than diffs, because a bad plan line costs a hundred bad code lines. You never let an
agent stop on "looks done". You review with fresh contexts and disjoint lenses, because the author is
the worst reviewer of its own work. You pay nothing for what a linter can catch. When the model is in
the product, you start by asking where not to use one, you separate what is generated once from what
runs per interaction, you verify output rather than trusting a constraint, and you measure the judge
against humans before believing it. And you write down what you overruled, because that record is the
only durable evidence the judgement was yours.
