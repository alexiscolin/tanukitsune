# What we build, and why

**What this is.** The product thesis, the engineering principles, and the architecture. Read the first two sections before writing any code; the principles override every other document.

For the feature inventory see [`backlog.md`](backlog.md),
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
stability and retrievability per card per person. It has shipped in
[Anki since 23.10](https://github.com/ankitects/anki/releases/tag/23.10), October 2023, as an
**opt-in** scheduler, [still opt-in today](https://github.com/ankitects/anki/issues/3616), and it
beats SM-2 on prediction accuracy across a
[public benchmark](https://github.com/open-spaced-repetition/srs-benchmark) of roughly 350M reviews
from 10,000 users.

The widely repeated "20 to 30 percent fewer reviews" figure is a **simulation result, not a
measurement**: the [FSRS wiki](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS)
was amended in February 2026 to say so, and the benchmark measures prediction accuracy only, never
review counts. So we do not repeat it. We measure it, on our own data, and publish the number. That is
a more interesting project than citing the claim.

Every load-bearing claim in this documentation is listed with its source in
[`sources.md`](sources.md).

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
returns an unpersisted review whose id is always zero, per the
[API reference](https://docs.api.wanikani.com/20170710/). **We are the system of record.** Everything
FSRS needs, every statistic, every comparison against their fixed intervals exists only if we capture
it. See [ADR 0005](decisions/0005-system-of-record-for-reviews.md).

**Subscription gating is our job.** Free accounts are granted three levels, paid sixty, and reads are
not server-filtered while writes are. A free user's token returns the whole corpus and hiding what
they are not entitled to falls to us.

**Submission is not idempotent**, there is no idempotency key, and the rate limit is
[sixty requests per minute per token](https://community.wanikani.com/t/32851) shared between reads and
writes.

## Architecture

**This is a client-side application with a server attached, not a server-rendered one.** The
distinction decides most of what follows.

The corpus, the judge and the demo deck are genuinely server-shaped: shared, cacheable, generated
once. The review loop, which is the product, is not. It reads from IndexedDB, writes to a durable
local queue, and syncs to a third-party API. Browser-only APIs force it into client components by
rule, so server components buy it nothing.

The consequence, decided rather than discovered: **the review session is a single client-rendered
route, not a sequence of framework navigations.** That collapses the service worker's hardest problem,
since it then caches one document plus static assets rather than negotiating between HTML and
server-component payloads for the same URL. It also removes an entire class of bug from the routing
model's state preservation, whose effects re-run on every hide and reveal and would silently disturb a
timed loop.

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
- **An uncertain failure is resolved by re-reading the assignment state, never by resubmitting.** A
  422 means drop and resync rather than retry. This rule has no exception: submission has no
  idempotency key and the response carries an id that is always zero, so there is nothing to
  deduplicate against. A blind retry on a lost acknowledgement advances the SRS stage twice and
  silently corrupts the user's progression.
- Storage limits are handled explicitly. Safari deletes an origin's storage after seven days without
  interaction, all at once, so corpus and assignments are treated as refetchable caches and
  `review_events` is backed up server-side, because it is the only local state that cannot be
  reconstructed. Installing to the home screen exempts the app from that cap, and requesting
  persistence does too.
- **An installed web app has its own storage partition, isolated from the browser's.** A user who
  reviews in Safari, accumulates a queue, then installs, opens the installed app to an empty database.
  So the queue is flushed before the install prompt appears, and if it cannot be, the prompt says so.
- **Background Sync does not exist on iOS and never has**, so the flush is an in-page paced drain
  triggered on reconnect and on visibility change. Treating the browser's sync event as anything other
  than a bonus on Chromium would promise behaviour the platform cannot deliver.
- Multi-tab is a week-one case, not an edge case. A single sync leader elected through the Web Locks
  API.
- The flush is a route handler taking a batch, not a server action. Server actions dispatch
  sequentially from the client, their identifiers rotate on deploy so a queued call from a stale
  client becomes unresumable, and an offline-first client is by definition a stale client.

### Rendering and caching

The framework's caching is opt-in and, once enabled, becomes a build-time constraint rather than a
tuning knob: uncached data accessed outside a suspense boundary fails the build.

Enabled. The corpus is the textbook case, since it is identical for every user, keyed by item and
locale, and invalidated only by a corpus version. Cached with a tag per locale and an indefinite
lifetime, expired explicitly after a regeneration so the change is visible immediately rather than
eventually. On a serverless host the cache must be the durable variant, because in-memory does not
survive between invocations.

The private, browser-memory cache scope is not used: it is experimental and reads request-time inputs
we do not have.

Enabling this also changes navigation semantics, since routes are hidden rather than unmounted and
effects re-run on every reveal. That is one more reason the review session is a single client route:
it opts the part of the product that would suffer out of the mechanism entirely.

### Mutation transport

**The queue flush is a route handler taking a batch. Server actions are for forms only.**

Server actions dispatch one at a time per client, so forty queued answers become forty serialised
round trips. Their identifiers rotate on deploy, and a client that has been offline is by definition
running an old build, so a queued call becomes unresumable rather than merely slow. They also carry a
body size limit and an opaque payload a service worker cannot inspect or replay.

Server actions remain correct for the genuinely form-shaped mutations: reporting a bad mnemonic,
submitting a self-grade override, changing a setting. Those get progressive enhancement and pending
state for free, which is the reason the mechanism exists.

Derived work after a write, such as recomputing scheduling state or telemetry, runs after the response
is sent. The durable review event itself does not: it is the system of record and is written inside
the request.

### The server and client boundary

This is the boundary that leaks secrets, and it is not the same as the module boundaries above.

`data/` is a data access layer in the strict sense: server-only, performing its own authorisation,
returning minimal shapes rather than rows. Only it reads the environment. A fifth enforced rule
follows from this: **`ui/` may not import a module that imports `server-only`**, which the dependency
graph can check because type-only imports are already visible to it.

Two rules that matter from the moment a second user exists, and are cheaper to hold from the start.
A page-level authorisation check does not extend to the mutations defined on that page, so every
mutation re-verifies. And schema validation checks shape, not ownership: a well-formed identifier can
still name a row belonging to someone else, so identity comes from the session and lookups are scoped
by it rather than trusting an identifier from the client.

Return values from server mutations are serialised to the client, so they are constrained the same way
any other response would be.

### Errors

Expected failures are return values, not exceptions. A wrong answer, a rejected submission, a
malformed corpus entry: all of these are outcomes the caller handles, and modelling them as thrown
errors both loses type information and takes down a segment, since a throw inside a transition reaches
the nearest boundary.

Unexpected failures propagate, per the fail-loudly principle. Route boundaries handle segment
failures, and a component-level boundary wraps the judge cascade and the flush, because neither should
take down a page.

Error boundaries do not catch failures in event handlers or asynchronous code, and the typing loop is
entirely event handlers. Those need explicit handling at the call site or they vanish silently.

The global error page renders without application styles, so a dark-first product shows a light error
page unless the boundary applies the theme itself.

### Local state

An append-only outbox in the browser's database, exposed to the interface through the standard
external-store subscription, with ordinary component state for ephemeral interface concerns. One
dependency for the database wrapper. No state library.

Three stores: subjects and assignments as caches of server truth, replaced wholesale and never merged,
and the outbox, appended with client-generated identifiers so a duplicate throws rather than silently
overwriting. Status is the only mutable field on an entry; the answer payload is never touched.

The flush is strictly serial and oldest first, because scheduling is order dependent, paced from the
rate-limit headers rather than a fixed sleep since reads and writes share one budget, and holds a
single-flusher lock so two tabs cannot double-send. It runs in the page rather than the service
worker.

This is the transactional outbox pattern, whose usual mitigation for at-least-once delivery is an
idempotent consumer. That mitigation is unavailable here, which is why an ambiguous outcome is
resolved by reading back the assignment state rather than by retrying.

### The service worker

Hand-written, not generated by a plugin. The established plugin has not shipped since 2022 and cannot
run under the current bundler; its successor has an open crash in exactly the combination this project
would use, and is maintained by one person who does not use the host we deploy to.

The caching surface is small enough that this is not a sacrifice: one application shell, the static
assets, and nothing else, precisely because the review session is a single client route rather than a
series of navigations. Requests are discriminated on headers rather than URL, since the same address
serves different representations.

Update timing matters more than it usually does: activating a new worker mid-session is visible in a
timed loop, so a waiting worker is held until the session ends or the application is backgrounded.

Deployment skew protection returns a 404 to clients pinned to an expired build, and an offline-first
client is a long-lived one, so its maximum age is raised well beyond the deploy cadence and a 404 on a
static asset is treated as a signal to purge and reload.

### Styling

Utility-first for tokens, module-scoped stylesheets for component internals, no runtime CSS-in-JS. The
bundler decides this: a custom bundler configuration now fails the build, module-scoped stylesheets
are native, and the main compile-to-CSS alternative ships only a plugin for the previous bundler.

Design tokens live in one file in the community standard format, compiled into custom properties.
Anything intended to animate is registered as a typed custom property, since an unregistered one
cannot be interpolated.

Theme switching is a small inline script that sets both the theme attribute and the colour scheme in
the same tick. The second is what prevents form controls, scrollbars and the page background from
flashing, and it is the part most implementations omit.

Accessibility primitives come from a library; visual design, tokens, variants and the component API do
not. What a primitive library provides is specification compliance, focus management and screen reader
behaviour that no automated test catches. Rebuilding that is not building a design system, it is
rebuilding a specification.

### Routing and locales

The route tree carries a locale segment from the first commit, even while only one locale exists. It
changes the service worker scope, the manifest entry point and every route's identity, so adding it
later is a restructure rather than a feature.

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
