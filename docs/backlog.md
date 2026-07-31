# Feature inventory

**What this is.** Every feature considered, whether it needs a model, which version it belongs to, and what was rejected with the reason. Consult it before proposing something new, in case it was already decided against.

Every feature considered, where it came from, whether it needs a model, and which version it belongs
to. Most entries started as a real frustration with WaniKani rather than an idea about what to build.

Tier meanings: **none** is deterministic and costs nothing. **once** is generated one time, shared by
every user, marginal cost zero. **live** runs per interaction and needs a cost story.

A **live** entry needs a guardrail story before it ships, and that is the harder half. None of it is
retrofittable, which is why the first live feature sits in v0.1.1 rather than v0.1: shipping the
deterministic tiers first makes the guardrails a design constraint instead of a patch. What they are is
in [`ai-engineering.md`](ai-engineering.md).

## v0.1

| Feature | Tier | Notes |
|---|---|---|
| French corpus: meanings, nuances, mnemonics | once | The product thesis. Mnemonics are regenerated with French sound associations, never translated, and never derived from WaniKani's own mnemonics, which keeps it clear of their content. Levels 1 to 10 only; the item count is read from the API at generation time rather than assumed. |
| Review flow, offline first | none | |
| Answer judge, tiers 1 and 2 | none | Exact match on normalised input, then fuzzy: case fold, accent fold, edit distance, article tolerance. Anything they cannot decide falls to self-grade in v0.1. |
| Typo tolerance and self-grade | none | WaniKani has no undo. The single most requested thing in the userscript ecosystem. |
| Item card shown on wrong answer | none | Carries the typed answer beside the reference, aligned, and names the difference wherever a rule can: dakuten, small kana, long vowel. The part that needs a model is the confusion detector in v0.3. |
| Subscription gating | none | `max_level_granted` is read rather than assumed, since respecting it is a condition of using the upstream content at all. Three levels on the free tier, so levels 1 to 10 assume a paid one. |
| JLPT level shown | none | Data mapping, and the mapping needs a source that can be redistributed. There is no official per-item list, only community compilations of varying provenance, so this follows the pitch accent rule: named and licensed, or not shipped. |
| Dark mode | none | |
| `review_events` capture | none | Load-bearing. WaniKani stopped persisting review history in April 2023, so we are the system of record. Everything in later versions depends on data that only exists if collected from the first answer. |
| Demo mode, no token | none | Seeded read-only deck. Without it a reviewer never sees the product. Ranked the highest-value artifact in the project. |

## v0.1.1

| Feature | Tier | Notes |
|---|---|---|
| Hints, as a recorded ladder | none | Kana count, first kana, mnemonic, reference. Recorded in `assist`, because an item resolved at the third rung is not an item known. |
| Retype rescue on a refused answer | none | Bunpro mutates the row and the item reads as correct. Append-only makes the rescue a second row, so the same help costs no honesty. |
| Practice on demand, burned items included | none | Answers what to drill now, which no scheduler answers: the set is built from the log, by what was missed, by level, by SRS stage, by hand, or from the backlog a break left behind. Local only, so no network and no upstream stage, and consequence-free in both directions. Whether FSRS reads these answers is decided in v0.2 with data rather than now, which is what `scheduled` keeps open. |
| Session length chosen at the start | none | The due queue arriving whole is the API's shape, not the learner's day. |
| Opt-in review timer | none | Off by default, duration chosen, expiry reveals and asks rather than failing. [ADR 0008](decisions/0008-an-opt-in-review-timer.md). |
| A settings screen | none | The first surface that stores anything about a reader beyond a session: language, theme, hint default, timer and length. The two settings that arrive with this version are chosen where the session starts, so nothing opens this until a third needs a home. |
| An item page, lists and search | none | The card the review shows, reachable outside a review, plus lists by level and by SRS stage and a way to find one item. Lists by theme fall out of the tags in v0.2 and the confused pairs from the detector in v0.3. |
| A marketing page and the legal pages | none | The README is the marketing surface until people who do not read repositories arrive, and privacy, terms and an AI transparency notice become obligations the day accounts exist rather than before. |
| Reveal and grade, without typing | none | Space reveals the answer, one key says it was known and another says it was not. An accessibility mode before a preference, since a reader whose hands tire stops reviewing rather than reviewing differently. It bypasses the judge, so `assist` records it and those answers stay out of the calibration set: that is the price of the mode rather than a defect in it. |
| An English locale | none | Served from the subscriber's own content rather than from a corpus of ours: their mnemonics through the API, gated by the subscription, plus a link to their page. Everything language-independent comes with it, which is eight of the nine advantages. |
| LLM judge, tier 3 | live | With the full calibration: labelled set, kappa against a single expert reference whose own reliability ceiling is measured first, false accept and false reject reported separately. Cached globally, keyed by item, normalised answer, locale, judge model, prompt version and corpus version. |
| Multi-user | none | Auth, token encryption, a deletion path, and per-user scoping on every read, the subscription check included, which v0.1 already makes against one account. The sign-up path belongs here too, and it is five steps of which one asks for anything: sign in, paste the token, read the level and subscription back, choose the language, start. Cut from v0.1 because each of those touches code the single-user version does not have to write at all. |

## v0.2

| Feature | Tier | Notes |
|---|---|---|
| FSRS scheduling | none | Statistics, not AI. The improvement over WaniKani's fixed intervals gets measured on real data and published, because the widely cited 20 to 30 percent figure is a simulation result nobody has verified. |
| Stats and projection | none | Arithmetic over `review_events`. |
| The stage of the item under review, shown | none | Which stage an item sits at says how much recall effort is worth spending on it: missing a low one costs a day, missing a high one costs weeks. `srs_stage_before` already carries it, so it is a rendering rather than a computation. Colour alone fails WCAG 1.4.1, so it carries a second channel. |
| A missed item returning sooner | none | Falls out of FSRS: difficulty is modelled per card, so nothing needs the second parallel scheduler Bunpro's fixed intervals force on it. |
| Theme tags | once | Administrative, health, family, food and so on. A closed set, so a text array column in Postgres with a GIN index, not a vector store. |
| Situational prep | none | "I have an appointment at the ward office tomorrow" becomes a filtered query over themes and SRS state. Predefined situations need no model at all; only a free-text field would. |
| Review by theme, cross-category buckets | none | Falls out of the tags. |
| Reverse mode, French to Japanese | none | The most formative exercise, and it reuses the judge. |
| Learning order control | none | The Reorder userscript exists because WaniKani refuses this. Sorting by ascending stage puts the most fragile items first, which is what someone with ten minutes needs and what a random draw takes away from them. |
| Conjugation tables | none | Japanese conjugation is entirely regular, so a rules engine is more correct and free. A model would only help to explain a form, never to produce one. |
| Example sentences as exercise | none then once | Retrieved from the open Tatoeba corpus, filtered to known vocabulary. Generation only as a fallback when the corpus has no match, and then validated deterministically: tokenise the output, check every token against the known set, regenerate on failure. The retry rate is the quality metric and it costs nothing. |
| French corpus, levels 11 to 60 | once | The same job re-run per level band, after the first ten levels have been used by real people long enough to know whether the prompt holds. Nothing new is built, so it is a cost and a review effort rather than a feature. |

## v0.3

| Feature | Tier | Notes |
|---|---|---|
| Push notifications carrying the question | none | The notification body is the prompt, so recall happens in the second before the app opens. Turns the app-opening delay into retrieval practice. Web push works for installed PWAs on iOS 16.4+ and the notification does mirror to a paired Apple Watch. What does not exist without a native app is answering from the watch, so the watch is a reminder surface and not a review surface. |
| Scheduler | live, cheaply | Chooses which item, in which format, when. Timing is statistics: response rate by hour, back off after three ignored. Only the choice of item and format benefits from reasoning. |
| Voice mode | none | Web Speech API, supported on iOS Safari 14.5+. Scoped to what it is good at: reading practice, French to Japanese production, sentence shadowing. **Not** distinguishing homophones, since はし is 橋, 箸 and 端 and voice structurally cannot separate them. Requires network, so it degrades rather than being a default. Also an accessibility feature. |
| Confusion detector | live | Pairs confused systematically, from real error data, then targeted drills. |

## v0.4

| Feature | Tier | Notes |
|---|---|---|
| MCP server | none, it is plumbing | Exposes vocabulary, grammar and learner progress so any assistant can query the study state. Four good tools beat twenty. Ships only if the consumer can be named and demonstrated, otherwise it joins A2A in the rejected list. |
| Tutor agent | live | The one genuine RAG use in the product: open-ended questions over a grammar corpus, where retrieval grounds the answer and prevents invention. Rate limited. Guardrails matter here because user text reaches a prompt. |
| A second generated locale | once | The generation job re-run with a different target language, chosen among those the upstream source does not serve at all, since the thesis is a language where the mnemonics do not exist rather than one where they exist and are ours to beat. What makes it possible is not the model, it is a deterministic gate that does not need to speak the language: the generated mnemonic is checked mechanically against the reading it must evoke and the components it must use, and what fails is regenerated rather than shipped. Same shape as the sentence validator. Without it, adding a language means finding someone who will read nine thousand items, which is what caps every competitor at one. The check itself is unspecified and is the open question. |
| Photo import | none | Photograph a sign or a menu, extract the kanji, see which are already known. Tesseract compiled to WebAssembly runs entirely in the browser: no server, no cost, works offline, private. A vision model would be the expensive way to solve a solved problem. Accuracy on real signage needs testing before committing. |

## Rejected, with reasons

**A2A endpoint.** The protocol is real and governed by the Linux Foundation, but it solves
cross-organisation agent interoperability. This application has no counterparty agent, so an endpoint
would be a facade that anyone who knows the protocol would spot.

**Vector store for themes.** The theme set is closed, so a tagged column answers the query exactly,
instantly and free. A vector store would be a more impressive answer to a question nobody asked.

**RAG for sentence generation.** Retrieving the user's known vocabulary is a `SELECT`, not semantic
search. The real problem is verification, not retrieval.

**Semantic caching of verdicts.** "chien" and "chienne" sit close enough together in embedding space
that no threshold separates them, and they have opposite verdicts. Trading accuracy for cost is fine
for a support chatbot and unacceptable when the cached value is a correctness judgement.

**Native app.** A link a reviewer can click beats an app they must install, and React Native would
demonstrate a skill nobody is asking for while putting an unfamiliar platform on the critical path.
Capacitor stays available as an upgrade path.

**Charging for it.** WaniKani's API terms prohibit building anything for profit on their content, and
Tofugu staff confirmed in February 2026 that a third-party app must be completely free to get their
approval.

**Pitch accent.** The data exists, combining NHK and Kanjium sources, but the NHK dictionary is
copyrighted and redistributed by the community in a tolerated grey zone. Blocked until a clearly
licensed source appears.

**Bunpro integration.** A key exists in user accounts but there is no public documentation and access
is negotiated case by case. Architected for behind `KnowledgeSource`, implemented only if access is
granted.

**An English corpus of our own.** Generating one is available on the same terms as any other language,
since what the job produces is ours whatever the target. What is rejected is paying for it: an English
subscriber's account already carries mnemonics the terms permit a free client to render, so the run
would buy a second English layer competing with the one the reader has, on the incumbent's ground.
Reopened by evidence that the sampling gate clears an English batch at a quality theirs does not reach,
not by demand. Serving English itself is not rejected and does not depend on this.

## Constraints that shape everything

What WaniKani's API does and does not give us, and what the browser takes away, decides more of this
inventory than any preference does. Those constraints are stated once, in
[`framing.md`](framing.md), and sourced in [`sources.md`](sources.md).
