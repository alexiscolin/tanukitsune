# What we build, and why

**What this is.** The product thesis, the engineering principles, and the architecture. Read everything up to and including the service worker before writing any code; the principles override every other document.

For the feature inventory see [`backlog.md`](backlog.md),
for what is being built right now see [`specs/v0.1.md`](specs/v0.1.md), for tooling and gates see
[`stack.md`](stack.md), for how work gets done see [`workflow.md`](workflow.md).

## The thesis

A kanji curriculum where a model does the work an algorithm cannot: it writes the curriculum,
grades what the learner meant, finds the pairs they confuse, chooses what to present next, and answers
questions. French is the first locale, not the product.

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

**Where the model earns its place.** Both theses point at the same gap: one curriculum, applied
identically to everyone, in one language, with no memory of what happened. Five surfaces follow from
it, and no others. They share four model choices, which is why
[`ai-engineering.md`](ai-engineering.md) counts four.

**It writes the content layer**, meanings, nuances, mnemonics and thematic tags across the item set,
generated once through the batch API and shared, so a user costs nothing at the margin and a locale
costs one more run. **It grades free text**, because an answer that means the right thing in the wrong
words is the failure that makes people quit, and that is not a string comparison problem. **It finds
the pairs a learner systematically confuses** in their own error history, which is possible only
because `review_events` exists. **It chooses which item to present and in which format**, while when to
present it stays arithmetic. And **it answers open questions** from a retrieved grammar corpus rather
than inventing.

Each arrives in its own version with its own guardrails, which is why they are listed separately in
[`backlog.md`](backlog.md) rather than shipped as one capability.

Everything else that looks like it wants a model has a cheaper answer that is also more correct, and
each refusal is recorded with its reason. The refusals outnumber the uses, which is the design rather
than an accident.

Every load-bearing claim in this documentation is listed with its source in
[`sources.md`](sources.md).

*Generated in your language, graded on your meaning, paced by your memory.*

## Engineering principles

These override every other section. When a later section conflicts with one of these, the principle
wins and the section is wrong.

1. **KISS.** The simplest thing that passes the tests ships. Clever is a defect.
2. **YAGNI.** Build what the current version needs. No hooks for imagined futures.
3. **Rule of three.** Duplicate twice before extracting. Premature abstraction costs more than
   duplication. It governs extraction, not tolerance: the third occurrence gets refactored rather than
   copied, and `jscpd` is the tripwire.
4. **Make invalid states unrepresentable.** Discriminated unions and parsing at the boundary, not
   defensive checks everywhere. This is the direct counter to how agents write code.
5. **Fail loudly.** No catch that logs and continues. Errors propagate to a boundary that can decide.
6. **One reason to change per module.** If a file needs two sentences to describe, it is two files.
7. **Delete before you add.** Every version removes something. No unused export, parameter, file or
   dependency survives a merge, and `knip` is the gate.

## Scope, in one paragraph

v0.1 is single user, levels 1 to 10, the French corpus, the review flow offline, the judge without its
model tier, `review_events` from the first answer, and a demo mode needing no account. Everything else
comes after real users exist. The detail is in [`specs/v0.1.md`](specs/v0.1.md); the full inventory
including what was rejected and why is in [`backlog.md`](backlog.md).

Without the model tier the judge still works: exact match decides, then fuzzy matching decides, and
anything neither can resolve goes to self-grade with the item card shown. Never an automatic failure.
The rule that a correct answer is never punished holds from the first version, and in v0.1 the honest
way to hold it is to ask the user. The port that the model tier will implement exists from the start,
so adding it later does not touch the cascade.

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
they are not entitled to falls to us. This is their subscription, not ours: Tanukitsune is free either way,
per [ADR 0004](decisions/0004-free-forever.md), and the obligation is only to not show a user content
their own WaniKani plan does not include.

**Submission is not idempotent**, there is no idempotency key, and the rate limit is
[sixty requests per minute per token](https://community.wanikani.com/t/32851) shared between reads and
writes. Sending the same answer twice advances the SRS stage twice, and the response cannot tell a
duplicate from a first submission because the id it returns is always zero. Both facts have
consequences that run through the whole client, and they are worked out under offline reconciliation.

## Architecture

**This is a client-side application with a server attached, not a server-rendered one.** The
distinction decides most of what follows.

The corpus, the judge and the demo deck are genuinely server-shaped: shared, cacheable, generated
once. The review loop, which is the product, is not. It reads from IndexedDB, writes to a durable
local queue, and syncs to a third-party API. Browser-only APIs force it into client components by
rule, so server components buy it nothing.

**So it is an installable web app, and the data lives in two places on purpose.** Postgres is where the
corpus is generated, shared and cached across users, and where `review_events` is backed up. IndexedDB
holds everything the review loop touches with no network: the cached subjects and assignments, a local
copy of the corpus rows for the locale in use, and the outbox of answers. The corpus is in both, and
deliberately so, since the item card has to appear on a wrong answer offline; the local copy is a cache
replaced wholesale on a corpus version bump, not a second source of truth. The test for where a piece
of data belongs is whether losing it costs a download or costs the data itself.

The consequence, decided rather than discovered: **the review session is a single client-rendered
route, not a sequence of framework navigations.** That collapses the service worker's hardest problem,
since it then caches one document plus static assets rather than negotiating between HTML and
server-component payloads for the same URL. It also removes an entire class of bug from the routing
model's state preservation, whose effects re-run on every hide and reveal and would silently disturb a
timed loop.

```
core/       pure, no I/O, fully unit tested
data/       WaniKani client, corpus, db
ai/         clients and port implementations, prompts in ai/prompts/ as typed
            modules with a version constant, eval sets in ai/evals/ beside the
            prompt they measure
app/        Next routes, thin shells
ui/         components
```

Five rules, all enforced by `pnpm arch`, two of them proven to fire rather than assumed:

- `core/` imports nothing from the other layers, and may declare ports but never import an
  implementation
- `ui/` does not reach `data/` or `ai/`, by any number of hops
- `ui/` does not reach a module that imports `server-only`, which is the rule that keeps secrets out
  of the client and is stated again with the server boundary below
- no cycles
- no orphans: a module with no dependents and no dependencies was committed too early

The reachability matters more than it reads. An adjacency-only rule lets `ui/` reach `data/` through
`app/` in one extra hop, and a rule written against a bare package name matches nothing at all once
the package resolves inside `node_modules`. Both were true here, so `scripts/check-boundaries.sh`
writes a probe for each, expects a violation, and fails the gate if either passes.

The ports rule exists for one concrete reason, and it is worth spelling out, because grading is the
first feature that tests the layout.

Grading an answer runs in stages. The early ones are pure: normalise the input and compare it to the
reference, then compare it loosely with accent folding, article tolerance and edit distance. That is
arithmetic over strings, with no network and no configuration, so it belongs in `core/`. The last stage
asks a model, which means an HTTP client, a key and a cache, all of which belong in `ai/`. One
algorithm, spanning two layers, and `core/` is forbidden from importing `ai/`.

Inverting the dependency is what keeps the rule honest rather than negotiable. `core/grading` declares
the interface it needs, `JudgePort`, and a pure `runCascade(input, port)` that walks the stages and
reaches for the port only when the cheap ones cannot decide. `ai/` implements the port. `app/` wires
the two at the edge. `core/` never learns that a model exists, the cascade is unit tested by passing a
fake port, and no lint exception is required. Without this the very first feature forces one, and a
boundary gate that has already been excepted once stops being a gate.

**Async Server Components cannot be unit tested**, per the official Next.js position, which recommends
end-to-end coverage instead. So every data fetch lives in a plain function that is unit tested
directly, and the component is a shell that awaits it. There is no workaround to find: this is the
framework's own position, and end-to-end coverage is what it recommends in place of unit tests. A test
constraint that produces the better structure anyway.

**KnowledgeSource**: WaniKani is one implementation of an interface rather than a dependency. Three
operations, ships in v0.1 as the shape of `data/wanikani`: list subjects and assignments, submit an
answer, read an assignment back.

Two abstractions exist before their third use, and they are the only two. `JudgePort` exists because
the `core/` boundary rule makes the cascade otherwise unimplementable, and `KnowledgeSource` because
the whole product rests on one third-party API whose disappearance would otherwise be a rewrite rather
than a second implementation. Both are exceptions to the rule of three, argued here rather than
assumed, and a third one is a stop-and-ask.

### Offline reconciliation, the actual hard problem

This is the difficult part of the product, and it is a frontend problem rather than an AI one.

Forty answers given on a train. Meanwhile WaniKani's own SRS has moved, possibly from another client.
FSRS has its own opinion about intervals. Submission is not idempotent. Two devices can both be
offline and both sync.

**FSRS never writes to WaniKani, and the two are not competing.** Every answer is submitted exactly as
given, and the SRS stage that comes back is theirs and is not contested: they remain the system of
record for their own progression, which is what keeps the account correct in the official app and in
every other client. FSRS is ours, recomputed from `review_events`, and it decides two things. Which of
the items WaniKani has already made available to present first, and whether to offer extra practice on
an item their fixed interval has not scheduled yet. That practice is graded and stored locally and is
never submitted. So the two never disagree about state, only about priority, and priority is a
presentation concern. The gap between the two opinions is exactly what v0.2 measures and publishes, and
it exists only because both are recorded from the first answer. The decision record is written when
v0.2 opens; the schema that makes it possible ships in v0.1.

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
  persistence does too. Concretely: request persistence at first use, read the boolean it returns
  rather than assuming it was granted, and say so in the interface when it is refused instead of
  failing silently a week later.
- **An installed web app has its own storage partition, isolated from the browser's.** A user who
  reviews in Safari, accumulates a queue, then installs, opens the installed app to an empty database.
  Where an install event exists, the prompt is gated on a drained queue. On iOS it does not: installing
  happens through the Share sheet with nothing observable, so prevention is impossible there and the
  handling is recovery instead. A first run in standalone mode with an empty outbox rehydrates from the
  server-side backup and tells the user plainly that the browser tab may still hold answers that were
  never sent.
- **Background Sync does not exist on iOS and never has**, so the flush is an in-page paced drain
  triggered on reconnect and on visibility change. Treating the browser's sync event as anything other
  than a bonus on Chromium would promise behaviour the platform cannot deliver.
- Multi-tab is a week-one case, not an edge case. A single sync leader elected through the Web Locks
  API.
- The flush is a route handler taking a batch, not a server action, for the reasons given under
  mutation transport below.
- **Time comes from the device, and a device clock can be wrong.** `answered_at` is recorded locally
  because it is the only clock available offline, and the server stamps its own receipt time beside it.
  An implausible interval is then detectable rather than silently feeding FSRS a fabricated one.
- **An answer can arrive for an item WaniKani no longer considers due**, because another client
  reviewed it while this one was offline. That is a drop, not an error: the event keeps its outcome in
  our history, marked as not applied upstream, since our history is the record and theirs is not.
- **An answer that is not durably written is not accepted.** The write to the outbox is awaited before
  the interface advances, so a quota failure surfaces as a refusal on that card rather than as an
  answer the user believes was counted.

### Rendering and caching

**The framework's opt-in caching is off.** Enabling it constrains the whole application, since uncached
data read outside a suspense boundary fails the build, and it changes navigation semantics so that
effects re-run on every reveal, which a timed review loop cannot afford. It would buy tag invalidation
on one resource, and that resource has a better answer.

**The corpus is delivered as immutable chunks, one per locale and level, addressed by a hash of their
content.** A regeneration that changes nothing changes no URL, so nobody re-downloads; a corrected item
invalidates one level rather than the corpus; and a user fetches the levels they have reached rather
than all sixty. A small manifest, served with an ETag and no caching, maps each level to its current
hash, and the client fetches only what it does not already hold.

An immutable resource cannot be stale, at any layer. The same version travels through the CDN, the
service worker and IndexedDB, where a server-side cache tag reaches none of them. Publication order is
the only rule to hold: chunks first, then the manifest. A rollback is a republished manifest, not a
purge.

The chunks are public, carry no authorisation, and stop reaching the database after the first request
per edge, so the most requested surface in the product has nothing to protect and nothing to overload.

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

**Reads cross the same boundary as writes.** The token is server-side, so the browser never talks to
WaniKani directly and an in-page loop would never see an upstream response header. Subject and
assignment fetches go through the same server proxy as the flush, and that proxy returns the upstream
remaining and reset values to the client. That is what makes pacing from the rate limit possible at
all: one budget of sixty per minute covers reads and writes, so a draining backlog and a refresh
compete, and the client can only arbitrate between them if it is told what is left.

### The server and client boundary

This is the boundary that leaks secrets, and it is not the same as the module boundaries above.

`data/` is a data access layer in the strict sense: server-only, performing its own authorisation,
returning minimal shapes rather than rows. Only it reads the environment. The third of the five rules
above follows from this: **`ui/` may not import a module that imports `server-only`**, which the
dependency graph can check because type-only imports are already visible to it.

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
dependency for the database wrapper, `idb`, which wraps the native API in promises and stops there.
No state library.

Four stores: subjects, assignments and corpus rows as caches of server truth, replaced wholesale and
never merged, the corpus keyed by subject and locale and warmed alongside the assignment prefetch so
the item card never waits on a network; and the outbox, appended with client-generated identifiers so
a duplicate throws rather than silently overwriting.

After an entry is appended, exactly three fields are writable: `synced_at`, `applied_upstream`, and
`srs_stage_after`, which cannot exist before the flush because the stage comes back in WaniKani's
response and is never computed locally. The answer payload and the verdict are never touched.

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
assets, and the corpus chunks, which need no strategy of their own because an immutable URL is cached
on sight and never revalidated. Nothing else, precisely because the review session is a single client
route rather than a series of navigations.

Update timing matters more than it usually does: activating a new worker mid-session is visible in a
timed loop, so a waiting worker is held until the session ends or the application is backgrounded.

Deployment skew is handled by the worker itself rather than by a host feature. An offline-first client
is a long-lived one, so it will request a hashed asset from a build that no longer exists, and a 404 on
a hashed asset is treated as a signal to purge every cache, unregister, and reload once. That path is
tested as its own case rather than assumed, because it is the only thing standing between a stale
client and a blank screen. Where a host also offers to hold old builds, it shortens the window but does
not replace the mechanism.

### Styling and components

**Tailwind for everything visual, `shadcn/ui` for the accessible primitives, module-scoped stylesheets
only where a component has real visual logic.** No runtime CSS-in-JS: the bundler settles that, since a
custom bundler configuration now fails the build and the main compile-to-CSS alternative ships only a
plugin for the previous bundler.

Utilities over authored class names is decided here by who writes the code. Naming CSS classes is where
an agent produces duplication and an inconsistent vocabulary, and a visual change spanning a component
file and a stylesheet is two places to get it wrong instead of one. Keyframes and genuinely stateful
visual logic still go in a module-scoped stylesheet, which is the exception rather than a second way to
do the same thing.

`shadcn/ui` is not a component library in the usual sense: its command copies source files into `ui/`,
so there is no package whose API can drift from what an agent remembers, and every component is
readable and editable in place. **Components are added at the moment they are first imported, never in
bulk.** That is the existing rule against committing a file nothing imports, and it is also what keeps
`knip` and `jscpd` meaningful instead of drowning them in thirty unused variants. Which primitive base
the generator installs is verified at install time and recorded in [`stack.md`](stack.md), because that
base has changed once already.

Design tokens live in one place, the theme block of the single stylesheet, which the bundler compiles
to custom properties. No second format and no build step between the two: an interchange format would
emit variables the utility layer then has to redeclare, which is two sources for one value. Anything
intended to animate is registered as a typed custom property, since an unregistered one cannot be
interpolated.

Theme switching is a small inline script that sets both the theme attribute and the colour scheme in
the same tick. The second is what prevents form controls, scrollbars and the page background from
flashing, and it is the part most implementations omit.

What the primitives provide is specification compliance, focus management and screen reader behaviour
that no automated test catches. Visual design, tokens, variants and the component API stay ours.
Rebuilding the first is not building a design system, it is rebuilding a specification.

### Routing and locales

The route tree carries a locale segment from the first commit, even while only one locale exists. It
changes the service worker scope, the manifest entry point and every route's identity, so adding it
later is a restructure rather than a feature.

## Where AI is used, and where it is refused

**Refused, with the cheaper answer named.** FSRS for scheduling, rules for conjugation, statistics for
notification timing, Tesseract in the browser for OCR, data for JLPT and stroke order, retrieval from
an open corpus for example sentences, a tagged Postgres column rather than a vector store, a filtered
query for situational study, and deterministic validation rather than trusting a model to obey a
constraint. The README enumerates the same nine. Knowing where not to use a model is the point of the project.

**Generated once, shared, amortised.** French meanings, nuances, mnemonics, theme tags, contrastive
notes. Same output for every user, so generated once through the batch API, halving cost and stacking
with prompt caching. The job is idempotent, resumable, keyed by subject ID, written incrementally.
Budget three runs, because the prompt changes after reviewing the first sample. Quality gate is
acceptance sampling on a stratified subset, not regression.

**Live and cached.** The judge in v0.1.1, then the confusion detector and the choice of what to
present next in v0.3, then the tutor in v0.4. Each one arrives with its own guardrails, its own cache
key and its own place in the spend cap, which is why they are versioned apart rather than shipped
together.

## The judge

The highest risk feature: a wrong verdict is user visible, cached, and erodes trust.

Cascade, escalating only when the cheaper tier cannot decide: exact match on normalised input, then
fuzzy matching, then the model.

- Output is a closed enum plus a short reason. Never a numeric score.
- The judge model comes from a different family than the corpus generator, because a model scores its
  own family's output higher on equivalent content. The literature measures this on judges grading
  model-authored text, while this judge grades a learner's answer against a model-authored reference,
  so the direction is established and the size is not transferable. The design rule follows from the
  direction alone and costs nothing.
- It receives the reference answer and a tight rubric. Reference-based grading is far more reliable
  than open-ended.
- It has no tools, so injection cannot cause lateral movement or exfiltration. It **can** cause
  verdict poisoning, because the cache is keyed by item and answer rather than by user: a payload
  winning a `correct` verdict is then served to everyone typing the same string. Mitigated by
  filtering answer strings before they become cacheable and by promoting to the shared cache only
  after three distinct users produce the same input. At this product's user count that threshold warms
  nothing on its own, so the cache is seeded from the corpus references and the committed answer set
  and grows from there.
- Cache key includes judge model, prompt version, **corpus version and locale**, since the judge grades
  against corpus references, regenerating them invalidates every verdict, and normalisation is itself a
  language rule. Versions stored in the row so verdicts stay auditable.
- **An override deletes the verdict it disagrees with.** A user correcting the judge is the strongest
  available signal that the cached value is wrong, so that key is point-deleted and marked as not
  repopulatable until the disagreement is triaged. Without this the cache serves a verdict a human has
  already rejected, to everyone typing the same string, indefinitely.
- User-specific verdicts never enter the shared cache. WaniKani lets users add meaning synonyms that
  count as correct, so any verdict influenced by them is personal.

**French needs specific care in the fuzzy tier**, and Japanese readings need to be kept out of it
entirely. Edit distance over either accepts semantically opposite answers. The rules and the derived
minimal-pair list are in [`specs/v0.1.md`](specs/v0.1.md), because they are a shipping contract rather
than an architectural position.

**Calibration**, which is what makes this credible rather than a demo: 150 to 250 hand-labelled cases
oversampling the hard middle; the human labels first, using the rubric the judge will see, so rubric
ambiguity surfaces while labelling; Cohen's kappa against that reference with a bar at 0.70, plus
Gwet's AC1 because most answers are correct and imbalance depresses kappa; false accept and false
reject measured separately, because **never punish a correct answer** is a product rule and the two
errors are not equivalent. A solo project has one labeller, so the protocol is written for one and the
reference's own reliability is measured before the judge is. The detail is in
[`ai-engineering.md`](ai-engineering.md).

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

**Spend is capped** per user and globally. A cap that has been reached makes the port return undecided
rather than throwing, and the cascade falls through to self-grade. That is not an exception to failing
loudly: an exhausted budget is an expected outcome with a defined answer, and the fail-loudly rule
governs the unexpected.

## The feedback the design already produces

v0.1 ships self-grade and undo. Every override is a human disagreeing with the judge, on exactly the
hard middle the calibration set spends labellers trying to oversample by hand, produced free and
continuously.

So v0.1 stores it: input, verdict, judge version, override. Feeding it back into the eval set comes
later and needs consent. Capturing it does not, and it cannot be recovered retroactively.

Same reasoning for the corpus: acceptance sampling ships a known bad tail by design, so there is a
report path on every generated item from day one. Otherwise a wrong mnemonic reaches every user and
nothing ever finds it.