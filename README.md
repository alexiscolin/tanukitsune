![Tanukitsune: a fox wearing a raccoon dog's mask, writing kanji with a brush at a low table, before green hills and a pagoda](docs/assets/banner.jpg)

# Tanukitsune

**Learn kanji in your language, with a tutor that knows exactly what you already know.**

- **Mnemonics rebuilt in your language.** "Uchi sounds like OUCH" means nothing to you. Yours is built
  on sounds you have.
- **Graded on what you meant**, not on what you typed. *(v0.1.1)*
- **Example sentences made only of words you already know**, so practice is never a wall. *(v0.2)*
- **"I have an appointment at the ward office tomorrow"** builds you the deck for tomorrow. *(v0.2)*
- **The pairs you keep confusing, found in your own mistakes** and drilled against each other.
  *(v0.3)*
- **A session chosen for you**: which item next, and whether to ask it as reading, meaning, reverse or
  inside a sentence. *(v0.3)*
- **The question arrives inside the notification**, so recall happens before the app even opens.
  *(v0.3)*
- **A tutor you can ask mid-review**, grounded in a grammar corpus instead of inventing. *(v0.4)*
- **Point your camera at a menu** and see which kanji you already know. *(v0.4)*

Five of those nine run on a model: the mnemonics, the grading, the confusion pairs, the choice of what
comes next, and the tutor. The other four do not, and the section below names them beside five more
places a model was refused outright. Knowing which is which is the whole design.

> **Status: the review loop runs on a fixture deck, the product does not.** Answers are graded by the
> exact tier and nothing else, nothing is recorded, and no corpus, no judge and no connection to a real
> account exist yet.

## The nine that deliberately do not

1. **Interval scheduling** is FSRS, a benchmarked algorithm that beats a model and costs nothing.
2. **Conjugation** is a rules engine, because Japanese conjugation is entirely regular.
3. **Notification timing** is an aggregation over response rate by hour.
4. **Photo import** is Tesseract compiled to WebAssembly, in the browser, free and private.
5. **Themes** are a tagged Postgres column, because the category set is closed.
6. **Example sentences** are retrieved from an open corpus, because real sentences cannot hallucinate.
7. **When generation is unavoidable**, the output is tokenised and checked against the known set rather
   than trusted to have obeyed the constraint.
8. **Situational study** is a filtered query, not a prompt.
9. **JLPT levels and stroke order** are a data mapping.

Each is recorded with its reason in [`backlog.md`](docs/backlog.md). The ratio is the point: nine
places a model would have made the product worse, against five where it makes it possible.

## Why generation, and not translation

The material cannot be translated, and that is what forces generation rather than making it a
shortcut. "Uchi sounds like OUCH" is how the English curriculum teaches 内, and the sound association
*is* the method. Translation is exactly the operation that removes it. Rebuilding it elsewhere means
one new mnemonic per item across the whole curriculum, each constrained by that language's sounds, the same meaning and the same
components. Nobody writes that set twice by hand, which is why no competitor has a second language.

The interesting problem is therefore not "can a model write one", it is **what stops us from shipping
twenty languages**. The answer is that nobody here can proofread a Portuguese curriculum,
and the fix is not more reviewers: it is **a deterministic gate that does not need to speak the
language**. The generated mnemonic is checked mechanically against the reading it must evoke and the
components it must use, and what fails is regenerated rather than shipped. Same shape as the sentence
validator, pointed at content nobody on the project can read.

French is where this gets proven first, and WaniKani is the first item set. Neither is the product:
corpus rows are keyed by item and locale from the first migration, the source sits behind an
interface, and the route tree carried a locale segment before a second locale existed.

All of it matters more here than it would in most products, because a spaced repetition system is a
machine for putting things into long-term memory. **A wrong mnemonic and a wrong verdict do not merely
fail, they teach.** The bad item repeats until it sticks. The unfair verdict trains the learner to
doubt what they knew.

## The AI engineering surface

Any model writes one good mnemonic. The work is the whole item set at a quality nobody can read by
hand, and a verdict a learner will believe. That work is the list below, and it is argued in
[`ai-engineering.md`](docs/ai-engineering.md).

| Technique | How it is used here |
|---|---|
| **Batch inference** | The whole corpus in one job, idempotent, resumable, keyed by subject and written incrementally. Halves the cost and stacks with prompt caching. |
| **Structured output** | Zod schemas, `.strict()`, the provider's native path. A parse failure is a typed, counted outcome, never coerced to null. A refusal is branched on the stop reason, not caught as an exception. |
| **Prompt versioning** | Typed modules in git with a version constant, stamped on every trace and every generated row, and part of the judge cache key. A snapshot test fails a prompt edited without a version bump. |
| **LLM as judge** | Reference-based, closed enum plus a short reason, never a numeric score. Drawn from a different model family than the generator, because a model scores its own family's output higher. |
| **Model cascade** | Exact match, then fuzzy matching, then the model, escalating on deterministic conditions only. Most answers never reach a model at all. |
| **Evals** | Two sets, stratified for diagnosis and representative for the headline number, because stratifying engineers away the imbalance the number needs. Golden cases grow from production failures. The CI gate arrives with the first eval set and reads the end-to-end false-reject rate, not judge agreement alone. |
| **Calibration** | 150 to 250 hand-labelled cases, Cohen's kappa reported with Gwet's AC1 because class imbalance depresses kappa, gated on the interval's lower bound. False accepts and false rejects measured separately. |
| **Acceptance sampling** | The corpus quality gate. Written defect rubric, sample size and accept number fixed before the first run, plus a coverage gate and a report path for the bad tail it knowingly ships. |
| **Semantic-free caching** | Verdicts keyed by item, normalised answer, locale, model, prompt version and corpus version. A user override point-deletes its own key, so a poisoned verdict cannot spread. |
| **Prompt caching** | Provider prefix caching on the batch job and the tutor, verified through the cache-read token count rather than assumed. |
| **RAG** | Exactly one use, the tutor over a grammar corpus. Everything else that looks like retrieval is a `SELECT`. |
| **Guardrails** | Structural rather than declarative: closed output space, no tools where untrusted text flows, deterministic validation of anything generated, model output never rendered as markup, user text length-capped and delimited as data. |
| **Observability** | OpenTelemetry spans normalised into an internal schema at ingest, because the generative-AI attribute names are unstable. Alerts on escalation, parse failure, refusal, retry distribution, latency, cache hit, and override rate broken down by deciding tier. |
| **Cost control** | Spend capped per user and globally. A reached cap returns undecided and falls through to self-grade rather than throwing. Cost computed server-side from a versioned price table. |
| **Compliance** | Models pinned to dated snapshots, provenance on every generated row, and an EU AI Act transparency marker that was a schema column before there was any code. |
| **MCP** | v0.4, exposing study state to assistants people already use. Ships only if a consumer can be named and demonstrated. |

**Deliberately not used.** A vector store, because the theme set is closed and a tagged column answers
the query exactly ([ADR 0002](docs/decisions/0002-tagged-column-not-vector-store.md)). Semantic
caching, because two words a hair apart in embedding space carry opposite verdicts and the cached value
*is* the correctness judgement. RAG for sentence generation, because retrieving known vocabulary is a
`SELECT` and the hard part is verification, not retrieval. Tool use on the judge, because no tools plus
a closed output means an injection cannot exfiltrate or act. A2A, because there is no counterparty
agent and the endpoint would be a facade ([ADR 0003](docs/decisions/0003-no-a2a-endpoint.md)).

**Two numbers get published rather than claimed**: the judge's agreement with the labelled set, and
what FSRS actually changes against WaniKani's fixed intervals, measured on review data that exists only
because this application records it from the first answer.

## Where it goes

Each version says what a learner gets and what carries it. Nothing here is a placeholder: every row is
an entry in [`backlog.md`](docs/backlog.md) with its reason and its tier already written.

| Version | What lands | What carries it |
|---|---|---|
| **v0.1** | Offline review flow as an installable web app, the generated study layer for levels 1 to 10, deterministic grading with self-grade and undo, your own review history from the first answer, a public demo with no account | Batch inference, structured output, acceptance sampling, an append-only local outbox |
| **v0.1.1** | Grading that understands what you meant, and more than one account | LLM as judge, calibration against a labelled set, semantic-free verdict caching, token encryption |
| **v0.2** | Scheduling that follows your memory instead of fixed intervals, statistics over your own history, study by theme and by situation, reverse mode, sentence practice | FSRS on `review_events`, thematic classification, deterministic validation of generated sentences |
| **v0.3** | The pairs you keep confusing, found and drilled. What to review and in what form, chosen for you. Voice. Notifications that carry the question itself | Learner modelling over real error history, adaptive item and format selection, Web Speech, web push |
| **v0.4** | A tutor you can ask mid-review, your study state readable by the assistant you already use, and a photo of a sign turned into what you already know | Retrieval-augmented generation, scoped read-only tool use, Model Context Protocol, on-device OCR in WebAssembly |

Users keep their WaniKani subscription. Tanukitsune is free, permanently: their API terms prohibit building
anything for profit on their content, and Tofugu confirmed in February 2026 that a third-party app
must be free to be approved. See [ADR 0004](docs/decisions/0004-free-forever.md).

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript 6 |
| Framework | Next 16, App Router |
| Styling | Tailwind 4, shadcn/ui primitives, design tokens in one file |
| Server data | Postgres through Drizzle |
| Local data | IndexedDB, append-only outbox |
| Models | Batch API for the corpus, cached cascade for grading |
| Tests | Vitest, Playwright, real Postgres, never mocked |
| Hosting | Not decided yet |

Every contested choice and the argument that settled it is in [`stack.md`](docs/stack.md).

## The shape of the code

```
src/
├── core/                    the rules. Pure, imports nothing, tested without a database
│   ├── grading/cascade.ts       the tiers, in cost order. Today the exact one decides or nobody does
│   ├── grading/judge-port.ts    what the model tier will implement, declared before it exists
│   ├── composition-gate.ts      when a keystroke becomes an answer, and when it does not
│   ├── review-entry.ts          one question: a subject, what is asked of it, what it accepts
│   ├── demo-queue.ts            the deck the loop runs on until real assignments arrive
│   └── site-copy.ts             every string a reader sees, keyed by locale
├── data/                    the outside. Server only
│   ├── db.ts                    a server Postgres, or the file-backed one, and which answered
│   ├── env.ts                   the environment, parsed once, at the boundary
│   └── schema.ts                the tables, from which migrations are generated
├── ai/                      the model. Prompts, eval sets, and what implements core's ports
├── ui/                      the components. Everything reaches them as props
│   ├── answer-input.tsx         romaji becomes kana here, and Enter is decided here
│   └── review-session.tsx       the loop: question, verdict, next
└── app/                     the routes. The only layer allowed to touch both data and ui
    ├── [locale]/                the session, its layout, its error and not-found pages
    └── api/health/route.ts      what answered, which build, and whether the database is there
e2e/                         Playwright against the production build, with the accessibility audit
drizzle/                     migrations, generated from the schema, never written by hand
scripts/                     the gates a linter cannot express
docs/                        everything argued rather than enforced
.claude/                     the agent configuration, the review lenses, and their append-only log
```

One answer travels the whole thing and touches each layer once. A route hands the session its deck and
its strings, the field turns what was typed into kana and decides that Enter meant an answer, the
session hands that answer to the cascade, and the cascade decides or says it could not, which is what
puts the question back to the reader. Nothing in that path reaches a database, which is why the loop
works with no network.

The whole design is which of those may import which. **`core/` imports nothing**, so it declares ports
instead: `JudgePort` for the grader, `KnowledgeSource` for WaniKani, both implemented further out. That
is what keeps a third-party API from becoming a dependency of the rules. **`ui/` reaches nothing**, so a
component cannot quietly acquire a database. **`app/` wires them**, because somebody has to hand a
component what a query returned.

`pnpm arch` enforces it, by reachability rather than by adjacency, and a probe proves the rule refuses
what it claims to. `ai/` is empty until the model tier arrives, and the rule that governs it is already
in force.

The reasoning, plus offline reconciliation, the service worker and the client boundary, is in
[`framing.md`](docs/framing.md) under architecture. This is the map; that is the argument.

## Running it

```
pnpm bootstrap    install, configure, migrate
pnpm dev
```

One command from a fresh clone to a running application, on a machine that has only Node and pnpm.
The seeded demo deck joins it once the corpus terms are settled, which is an open decision and not an
oversight. A WaniKani token is needed only to review your own account.

## Documentation

Start at [`docs/README.md`](docs/README.md), which maps everything and explains the reading order.

The short version: [`framing.md`](docs/framing.md) for what and why, [`specs/v0.1.md`](docs/specs/v0.1.md)
for what is being built now, [`stack.md`](docs/stack.md) for tooling choices,
[`workflow.md`](docs/workflow.md) for how the work is done, [`decisions/`](docs/decisions/) for the
architecture decision records.

## Built with coding agents

This repository is built primarily with AI coding agents, and the method is part of the work.
`AGENTS.md` carries the constraints a linter cannot express, five read-only review agents with
disjoint lenses check every diff from a fresh context, one of them asking only whether the diff is
what was asked for, a sixth reads the documentation against itself whenever it moves, and a hook forces
one continuation when a turn would end on code that does not compile.

[`docs/workflow.md`](docs/workflow.md) describes that process: the per-task cycle, the review lenses,
and the conditions under which a session is discarded rather than continued.
[`docs/agent-log.md`](docs/agent-log.md) is the dated record of every point where an agent's output was
overruled, with the reason, including the cases where it was confidently wrong.

## License

MIT for the code.

The generated French corpus is not covered by that licence, and its terms are an open question rather
than a decision already taken. It is text written by a model against WaniKani's item set, so what may
be redistributed and under what conditions has to be settled before any of it is published. The
decision is tracked in [`decisions/`](docs/decisions/).
