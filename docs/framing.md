# What we build, and why

Product thesis, principles, architecture. For the feature inventory see [`backlog.md`](backlog.md),
for what is being built right now see [`specs/v0.1.md`](specs/v0.1.md), for tooling and gates see
[`stack.md`](stack.md), for how work gets done see [`workflow.md`](workflow.md).

## The thesis

A WaniKani client for non-English speakers, French first.

WaniKani teaches kanji through mnemonics built on English sound association. For a French speaker that
forces a double translation, and the mnemonics themselves stop working, because "uchi sounds like
OUCH" only lands if you think in English. Translating them does not fix it. They have to be
regenerated in the target language with that language's own sounds, which no algorithm does and no
machine translation solves. That is the reason this product needs a model at all.

Second thesis: WaniKani schedules every learner on the same fixed intervals. FSRS models difficulty,
stability and retrievability per card per person. It has shipped in Anki since 23.10, October 2023, as
an **opt-in** scheduler, still opt-in today, and it beats SM-2 on prediction accuracy across a public
benchmark of roughly 350M reviews from 10,000 users.

The widely repeated "20 to 30 percent fewer reviews" figure is a **simulation result, not a
measurement**: the FSRS wiki was amended in February 2026 to say so, and the public benchmark measures
prediction accuracy only, never review counts. So we do not repeat it. We measure it, on our own data,
and publish the number. That is a more interesting project than citing the claim.

*WaniKani in your language, scheduled on your memory.*

## Engineering principles

These override every other section. When a later section conflicts with one of these, the principle
wins and the section is wrong.

1. **KISS.** The simplest thing that passes the tests ships. Clever is a defect.
2. **YAGNI.** Build what the current version needs. No hooks for imagined futures.
3. **Rule of three.** Duplicate twice before extracting. Premature abstraction costs more than
   duplication.
4. **Make invalid states unrepresentable.** Discriminated unions and parsing at the boundary, not
   defensive checks everywhere. This is the direct counter to how agents write code.
5. **Fail loudly.** No catch that logs and continues. Errors propagate to a boundary that can decide.
6. **One reason to change per module.** If a file needs two sentences to describe, it is two files.
7. **Delete before you add.** Every version removes something.

## Scope, in one paragraph

v0.1 is single user, levels 1 to 10, the French corpus, the review flow offline, the judge without its
model tier, `review_events` from the first answer, and a demo mode needing no account. Everything else
comes after real users exist. The detail is in [`specs/v0.1.md`](specs/v0.1.md); the full inventory
including what was rejected and why is in [`backlog.md`](backlog.md).

Permanently out: replacing WaniKani, storing their content, charging for it, an A2A endpoint, a native
app.

## What WaniKani actually gives us

Three facts that shape the architecture and are expensive to discover late.

**No review history since April 2023.** `GET /reviews` returns an empty array and `POST /reviews`
returns an unpersisted review whose id is always zero. **We are the system of record.** Everything
FSRS needs, every statistic, every comparison against their fixed intervals exists only if we capture
it. See [ADR 0005](decisions/0005-system-of-record-for-reviews.md).

**Subscription gating is our job.** Free accounts are granted three levels, paid sixty, and reads are
not server-filtered while writes are. A free user's token returns the whole corpus and hiding what
they are not entitled to falls to us.

**Submission is not idempotent**, there is no idempotency key, and the rate limit is sixty requests
per minute per token shared between reads and writes.

## Architecture

```
core/       pure, no I/O, fully unit tested
data/       WaniKani client, corpus, db
ai/         prompts, clients, evals
app/        Next routes, thin shells
ui/         components
```

Four enforced rules, no more:

- `core/` imports nothing from the other layers
- `core/` may declare ports, never import an implementation
- `ui/` does not import `data/` or `ai/`
- no cycles

The ports rule exists for one concrete reason: the judge cascade runs pure tiers and a model tier, so
it belongs to no layer as stated. Without inversion the first real feature forces a lint exception and
the boundary gate is discredited in week one. So `core/grading` defines `JudgePort` and a pure
`runCascade(input, port)`, `ai/` implements it, `app/` wires them.

**Async Server Components cannot be unit tested**, per the official Next.js position, which recommends
end-to-end coverage instead. So every data fetch lives in a plain function that is unit tested
directly, and the component is a shell that awaits it. A test constraint that produces the better
structure anyway.

**KnowledgeSource**: WaniKani is one implementation of an interface rather than a dependency. Items,
review state, submit results. This is the one abstraction that exists before its third use, because it
is also the answer to "what happens if the API disappears."

### Offline reconciliation, the actual hard problem

This is the difficult part of the product, and it is a frontend problem rather than an AI one.

Forty answers given on a train. Meanwhile WaniKani's own SRS has moved, possibly from another client.
FSRS has its own opinion about intervals. Submission is not idempotent. Two devices can both be
offline and both sync.

- The review queue is a durable append-only log with client-generated IDs, not a mutable list. Sync
  replays the log, and replaying twice must be safe.
- Server state wins on conflict. FSRS scheduling is ours and is recomputed from the log, so it never
  needs merging.
- An uncertain failure is resolved by re-reading the assignment state, never by resubmitting blind.
  A 422 means drop and resync rather than retry.
- Storage limits are handled explicitly. Safari deletes an origin's storage after seven days without
  interaction, all at once, so corpus and assignments are treated as refetchable caches and
  `review_events` is backed up server-side, because it is the only local state that cannot be
  reconstructed.
- Multi-tab is a week-one case, not an edge case. A single sync leader elected through the Web Locks
  API.

## Where AI is used, and where it is refused

**Refused, with the cheaper answer named.** FSRS for scheduling, rules for conjugation, statistics for
notification timing, Tesseract in the browser for OCR, data for JLPT and stroke order, retrieval from
an open corpus for example sentences, a tagged Postgres column rather than a vector store, and
deterministic validation rather than trusting a model to obey a constraint. The README lists these and
says why. Knowing where not to use a model is the point of the project.

**Generated once, shared, amortised.** French meanings, nuances, mnemonics, theme tags, contrastive
notes. Same output for every user, so generated once through the batch API, halving cost and stacking
with prompt caching. The job is idempotent, resumable, keyed by subject ID, written incrementally.
Budget three runs, because the prompt changes after reviewing the first sample. Quality gate is
acceptance sampling on a stratified subset, not regression.

**Live and cached.** Only the judge.

## The judge

The highest risk feature: a wrong verdict is user visible, cached, and erodes trust.

Cascade, escalating only when the cheaper tier cannot decide: exact match on normalised input, then
fuzzy matching, then the model.

- Output is a closed enum plus a short reason. Never a numeric score.
- The judge model comes from a different family than the corpus generator, because self-preference
  bias is measurable at 4 to 8 points on equivalent content.
- It receives the reference answer and a tight rubric. Reference-based grading is far more reliable
  than open-ended.
- It has no tools, so injection cannot cause lateral movement or exfiltration. It **can** cause
  verdict poisoning, because the cache is keyed by item and answer rather than by user: a payload
  winning a `correct` verdict is then served to everyone typing the same string. Mitigated by
  filtering answer strings before they become cacheable and by promoting to the shared cache only
  after several distinct users produce the same input.
- Cache key includes judge model, prompt version **and corpus version**, since the judge grades
  against corpus references and regenerating them invalidates every verdict. Versions stored in the
  row so verdicts stay auditable.
- User-specific verdicts never enter the shared cache. WaniKani lets users add meaning synonyms that
  count as correct, so any verdict influenced by them is personal.

**French needs specific care in the fuzzy tier.** A generic edit distance accepts semantically
opposite answers: `poisson` and `poison`, `dessus` and `dessous`, `tache` and `tâche`, `sur` and
`sûr`. A curated minimal-pair list bypasses fuzzy matching and requires an exact answer. Without it
the tier actively teaches the wrong thing, which is worse than rejecting a correct one.

**Calibration**, which is what makes this credible rather than a demo: 150 to 250 hand-labelled cases
oversampling the hard middle; humans label first using the rubric the judge will see, so rubric
ambiguity surfaces as human disagreement; Cohen's kappa against human majority with a bar at 0.70,
plus Gwet's AC1 because most answers are correct and imbalance depresses kappa; false accept and false
reject measured separately, because **never punish a correct answer** is a product rule and the two
errors are not equivalent.

## Obligations, and schema decisions that are cheap now

Six items. Each is a column, a config line or a single page. None is a feature. They are here because
retrofitting any of them means a migration or a legal problem.

**Generated content is marked.** The EU AI Act transparency article applies from 2 August 2026, and
the corpus is synthetic text produced by a system we put into service under our own name. So
`generated_by` on every corpus row, a visible marker, and a machine-readable one.

**The judge cache never stores raw user text.** Key on the normalised answer, discard the original.

**Eval datasets are synthetic or consented, and say which.** They live in git in a public repo.

**Corpus rows are keyed by item and locale.** The product is named for language; a second one must not
be a migration.

**Models are pinned to dated snapshots**, and the model ID is stored on corpus rows as well as
verdicts. Retirement invalidates both the cache and the calibration, since the kappa was measured
against a model that no longer exists. Migration means replaying the calibration set on the candidate,
not swapping a string.

**Spend is capped** per user and globally.

## The feedback the design already produces

v0.1 ships self-grade and undo. Every override is a human disagreeing with the judge, on exactly the
hard middle the calibration set spends labellers trying to oversample by hand, produced free and
continuously.

So v0.1 stores it: input, verdict, judge version, override. Feeding it back into the eval set comes
later and needs consent. Capturing it does not, and it cannot be recovered retroactively.

Same reasoning for the corpus: acceptance sampling ships a known bad tail by design, so there is a
report path on every generated item from day one. Otherwise a wrong mnemonic reaches every user and
nothing ever finds it.
