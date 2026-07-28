# Kaeru

WaniKani in your language, scheduled on your memory.

> **Status: nothing has shipped yet.** The project is framed, the architecture is decided and the
> agent tooling is in place. No application code exists. This README describes what is being built and
> will be rewritten with measured numbers once v0.1 runs. Every claim below that is not yet true is
> marked.

## The problem

WaniKani teaches kanji through mnemonics built on English sound association. "Uchi sounds like OUCH"
only works if you think in English. For a French speaker it forces a double translation, and the
mnemonic, which is the whole value of the method, stops working.

Translating them does not fix it. A mnemonic has to be regenerated in the target language, using that
language's own sounds. That is the one thing here that genuinely needs a model.

## What it will do

- Review flow that works fully offline, as an installable web app
- Meanings, nuances and mnemonics rewritten in French, generated once and shared
- Answer grading that accepts what you meant rather than only what you typed
- Your own review history, kept, because WaniKani stopped storing it in 2023
- A demo anyone can try without a WaniKani account

Users keep their WaniKani subscription. Kaeru is free, permanently: their API terms prohibit building
anything for profit on their content, and Tofugu confirmed in February 2026 that a third-party app
must be free to be approved. See [ADR 0004](docs/decisions/0004-free-forever.md).

## Where we deliberately did not use a model

The interesting half of an AI product is knowing where not to put one.

| Surface | What we use instead | Why |
|---|---|---|
| Scheduling | FSRS | A benchmarked algorithm beats a model, and costs nothing |
| Conjugation | A rules engine | Japanese conjugation is entirely regular |
| Notification timing | Response rate per hour | An aggregation, not a judgement |
| Photo import | Tesseract compiled to WebAssembly | Runs in the browser, offline, free, private |
| Themes | A tagged Postgres column | The category set is closed, so a vector store answers a question we do not have. [ADR 0002](docs/decisions/0002-tagged-column-not-vector-store.md) |
| Example sentences | Retrieval from an open corpus | Real sentences beat generated ones, and cannot hallucinate |
| Sentence constraints | Deterministic validation | Tokenise the output and check it, rather than trusting the model to obey |
| Agent interoperability | Nothing | A2A with no counterparty would be a facade. [ADR 0003](docs/decisions/0003-no-a2a-endpoint.md) |

## Documentation

Start at [`docs/README.md`](docs/README.md), which maps everything and explains the reading order.

The short version: [`framing.md`](docs/framing.md) for what and why, [`specs/v0.1.md`](docs/specs/v0.1.md)
for what is being built now, [`stack.md`](docs/stack.md) for tooling choices,
[`workflow.md`](docs/workflow.md) for how the work is done, [`decisions/`](docs/decisions/) for the
architecture decision records.

## Built with coding agents, and the method is documented

This repository is built primarily with AI coding agents, and the process is a deliberate part of it.
`AGENTS.md` carries the constraints a linter cannot express, four read-only review agents with
disjoint lenses check every diff from a fresh context, and a hook makes it impossible to end a turn on
code that does not compile.

[`docs/workflow.md`](docs/workflow.md) explains the method.
[`docs/agent-log.md`](docs/agent-log.md) records where the agent was overruled and why.

## License

MIT for the code. The generated French corpus carries its own terms, because its relationship to
WaniKani's item set is a separate question from the code.
