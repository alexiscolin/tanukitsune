# Feature inventory

Every feature considered, where it came from, whether it needs a model, and which version it belongs
to. Most entries started as a real frustration with WaniKani rather than an idea about what to build.

Tier meanings: **none** is deterministic and costs nothing. **once** is generated one time, shared by
every user, marginal cost zero. **live** runs per interaction and needs a cost story.

## v0.1

| Feature | Tier | Notes |
|---|---|---|
| French corpus: meanings, nuances, mnemonics | once | The product thesis. Mnemonics are regenerated with French sound associations, never translated, and never derived from WaniKani's own mnemonics, which keeps it clear of their content. Levels 1 to 10 only, about 800 items. |
| Review flow, offline first | none | |
| Answer judge, tiers 1 and 2 | none | Exact match on normalised input, then fuzzy: case fold, accent fold, edit distance, article tolerance. Anything they cannot decide falls to self-grade in v0.1. |
| Typo tolerance and self-grade | none | WaniKani has no undo. The single most requested thing in the userscript ecosystem. |
| Item card shown on wrong answer | none | |
| JLPT level shown | none | Data mapping. |
| Dark mode | none | |
| `review_events` capture | none | Load-bearing. WaniKani stopped persisting review history in April 2023, so we are the system of record. Everything in later versions depends on data that only exists if collected from the first answer. |
| Demo mode, no token | none | Seeded read-only deck. Without it a reviewer never sees the product. Ranked the highest-value artifact in the project. |

## v0.1.1 and v0.1.2

| Feature | Tier | Notes |
|---|---|---|
| LLM judge, tier 3 | live | With the full calibration: labelled set, kappa against human majority, false accept and false reject measured separately. Cached globally, keyed by item, normalised answer, judge model, prompt version and corpus version. |
| Multi-user | none | Auth, token encryption, subscription gating on `max_level_granted`, deletion path. Cut from v0.1 because it makes everything else about 40 percent harder. |

## v0.2

| Feature | Tier | Notes |
|---|---|---|
| FSRS scheduling | none | Statistics, not AI. The improvement over WaniKani's fixed intervals gets measured on real data and published, because the widely cited 20 to 30 percent figure is a simulation result nobody has verified. |
| Stats and projection | none | Arithmetic over `review_events`. |
| Theme tags | once | Administrative, health, family, food and so on. A closed set, so a text array column in Postgres with a GIN index, not a vector store. |
| Situational prep | none | "I have an appointment at the ward office tomorrow" becomes a filtered query over themes and SRS state. Predefined situations need no model at all; only a free-text field would. |
| Review by theme, cross-category buckets | none | Falls out of the tags. |
| Reverse mode, French to Japanese | none | The most formative exercise, and it reuses the judge. |
| Learning order control | none | The Reorder userscript exists because WaniKani refuses this. |
| Conjugation tables | none | Japanese conjugation is entirely regular, so a rules engine is more correct and free. A model would only help to explain a form, never to produce one. |
| Example sentences as exercise | none then once | Retrieved from the open Tatoeba corpus, filtered to known vocabulary. Generation only as a fallback when the corpus has no match, and then validated deterministically: tokenise the output, check every token against the known set, regenerate on failure. The retry rate is the quality metric and it costs nothing. |

## v0.3

| Feature | Tier | Notes |
|---|---|---|
| Push notifications carrying the question | none | The notification body is the prompt, so recall happens in the second before the app opens. Turns the app-opening delay into retrieval practice. Web push works for installed PWAs on iOS 16.4+. It does not reach Apple Watch, which is why that idea is dead without a native app. |
| Scheduler | live, cheaply | Chooses which item, in which format, when. Timing is statistics: response rate by hour, back off after three ignored. Only the choice of item and format benefits from reasoning. |
| Voice mode | none | Web Speech API, supported on iOS Safari 14.5+. Scoped to what it is good at: reading practice, French to Japanese production, sentence shadowing. **Not** distinguishing homophones, since はし is 橋, 箸 and 端 and voice structurally cannot separate them. Requires network, so it degrades rather than being a default. Also an accessibility feature. |
| Confusion detector | live | Pairs confused systematically, from real error data, then targeted drills. |

## v0.4

| Feature | Tier | Notes |
|---|---|---|
| MCP server | none, it is plumbing | Exposes vocabulary, grammar and learner progress so any assistant can query the study state. Four good tools beat twenty. Ships only if the consumer can be named and demonstrated, otherwise it joins A2A in the rejected list. |
| Tutor agent | live | The one genuine RAG use in the product: open-ended questions over a grammar corpus, where retrieval grounds the answer and prevents invention. Rate limited. Guardrails matter here because user text reaches a prompt. |
| Photo import | none | Photograph a sign or a menu, extract the kanji, see which are already known. Tesseract compiled to WebAssembly runs entirely in the browser: no server, no cost, works offline, private. A vision model would be the expensive way to solve a solved problem. Accuracy on real signage needs testing before committing. |

## Rejected, with reasons

**A2A endpoint.** The protocol is real and governed by the Linux Foundation, but it solves
cross-organisation agent interoperability. This application has no counterparty agent, so an endpoint
would be a facade that anyone who knows the protocol would spot.

**Vector store for themes.** The theme set is closed, so a tagged column answers the query exactly,
instantly and free. A vector store would be a more impressive answer to a question nobody asked.

**RAG for sentence generation.** Retrieving the user's known vocabulary is a `SELECT`, not semantic
search. The real problem is verification, not retrieval.

**Semantic caching of verdicts.** "chien" and "chienne" sit around 0.95 cosine similarity and have
opposite verdicts. Trading accuracy for cost is fine for a support chatbot and unacceptable when the
cached value is a correctness judgement.

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

## Constraints that shape everything

- WaniKani has not persisted review history since April 2023. We are the system of record.
- Review submission is not idempotent, there is no idempotency key, and the rate limit is sixty
  requests per minute per token shared between reads and writes.
- Free accounts are granted three levels, paid sixty. Reads are not server-filtered while writes are,
  so hiding what a user is not entitled to is our job.
- Safari deletes an origin's storage after seven days without interaction, all at once. The offline
  queue must be designed so eviction is recoverable rather than data-losing, and `review_events` needs
  a server-side backup because it is the only local state that cannot be reconstructed.
- Async Server Components cannot be unit tested, so data fetching lives in plain functions.
