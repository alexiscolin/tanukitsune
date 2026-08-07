![Tanukitsune: a fox wearing a raccoon dog's mask, writing kanji with a brush at a low table, before green hills and a pagoda](docs/assets/banner.jpg)

# Tanukitsune

**Learn kanji in your own language, with a tutor that knows what you already know.**

WaniKani teaches the kanji 内 by telling you that "uchi sounds like OUCH". That helps if you think in
English. If you do not, the memory trick is just one more thing to memorise. Tanukitsune builds that
layer again in your language. It grades what you meant, not what you typed. And it follows your
memory instead of a fixed timetable.

> **Where it is today.** The review loop works on a real WaniKani account. With no token it serves a
> small built-in deck instead. An answer is graded by exact match, saved on your device, backed up to
> a server, and then sent on to WaniKani if the deployment turns that on. Two things are not there
> yet: the French layer, so cards still show WaniKani's English, and offline start, so you still need
> a network to open a session.

## What you get

Today: a review loop you can trust, grading you can correct yourself, and your own review history
from the very first answer. WaniKani stopped keeping review history in 2023. This app is the only
place that record will exist.

Later, in this order: grading that understands what you meant, timing that follows your memory,
example sentences built only from words you know, the pairs you keep mixing up found in your own
mistakes, a question inside the notification itself, and a tutor you can ask in the middle of a
review.

All of them are listed in [`backlog.md`](docs/backlog.md) with a reason and a version.
[The roadmap](#where-it-goes) says when each one lands.

## Why we generate instead of translate

You cannot translate this material. The sound link *is* the method, and translating it is exactly
what breaks it. Doing it again in a new language means one new memory trick per item, for the whole
curriculum. Each one has to fit that language's sounds, the same meaning, and the same parts. Nobody
writes that set twice by hand. That is why no competitor offers a second language.

So the real question is not "can a model write one". It is **what stops us from shipping twenty
languages**. The honest answer: nobody here can proofread a Portuguese curriculum. Hiring more
reviewers does not fix that. A check that does not need to read the language does. Each generated
memory trick is checked by machine against the sound it must point to and the parts it must use. If
it fails, we generate it again instead of shipping it.

This matters more here than in most apps. A spaced repetition system is a machine for putting things
into long-term memory. So **a bad memory trick and an unfair verdict do not just fail, they teach**.
The bad item comes back until it sticks. The unfair verdict teaches you to doubt what you knew.

French is where we prove it first, and WaniKani is the first set of items. Neither one is the
product. Corpus rows are stored per item and per language from the very first migration, WaniKani
sits behind an interface, and the URLs carried a language segment before a second language existed.

## Where we use a model, and where we say no

Five things need one: the memory tricks, the grading, the confusion pairs, the choice of what to show
next, and the tutor.

Nine other things could have used a model and do not: review timing, conjugation, notification
timing, photo import, themes, example sentences, situational study, JLPT levels and stroke order, and
the check on anything a model does write. Each one has something cheaper that is also better. Timing
uses FSRS, a public algorithm. Conjugation uses rules, because Japanese conjugation is fully regular.
Themes are a database column. Sentences come from an open corpus of real ones. Photo import runs OCR
in your browser. Knowing which is which is the whole design, and every "no" is written down with its
reason in [`backlog.md`](docs/backlog.md).

The work that makes the other half safe to trust is in
[`ai-engineering.md`](docs/ai-engineering.md): running the whole corpus as one batch job, checking
the grader against a hand-labelled set, using a judge from a different model family than the
generator, sampling the corpus for defects before it ships, and building guardrails into the shape of
the system rather than into instructions.

**We will publish two numbers rather than claim them**: how often the grader agrees with the
hand-labelled set, and what FSRS really changes against WaniKani's fixed timing. Both come from
review data that only exists because this app records it from the first answer.

## Where it goes

| Version | What lands |
|---|---|
| **v0.1** | Review that works offline, in an app you can install, the French layer for levels 1 to 10, grading you can correct, your history from the first answer, a public demo with no account |
| **v0.1.1** | Grading that understands what you meant, hints, extra practice on demand, more than one account |
| **v0.2** | Timing that follows your memory, statistics, study by theme and by situation, reverse mode, sentence practice |
| **v0.3** | The pairs you mix up, found and drilled. What to review and in what form, chosen for you. Voice. Notifications that carry the question |
| **v0.4** | A tutor you can ask mid-review, your study state readable by assistants you already use, a photo of a sign turned into what you know |

Keep your WaniKani subscription. Tanukitsune is free, and will stay free. Their terms do not allow
anyone to make money from their content, and Tofugu confirmed in February 2026 that a third-party app
has to be free to be approved. See [ADR 0004](docs/decisions/0004-free-forever.md).

## Running it

```
pnpm bootstrap    install, configure, migrate
pnpm dev
```

One command takes a fresh clone to a running app, on a machine that only has Node and pnpm. You only
need a WaniKani token to review your own account.

## The code

TypeScript 6, Next 16, Tailwind 4, Postgres through Drizzle, and IndexedDB for the queue on your
device. Tests run on Vitest and Playwright against a real Postgres, never a fake one. Every choice we
argued about is in [`stack.md`](docs/stack.md).

There are five layers, and the design is about which one may import which.

- `core/` holds the rules and **imports nothing**. It declares the interfaces, and code further out
  fills them in. This is what stops a third-party API from becoming part of the rules.
- `data/` is everything outside: the server's database, and the browser's.
- `ai/` holds the prompts and the model side of those interfaces. It has no files yet, and the rule
  that governs it is already switched on.
- `ui/` draws, and **reaches nothing**. A component cannot quietly pick up a database.
- `app/` connects them, because someone has to hand a component the result of a query.

`pnpm arch` checks this, including indirect paths, and a test proves the check really does say no.

One answer travels through the four that have code today and touches each one once. A page hands the
session its cards. The input field turns what you typed into kana and decides whether Enter meant an
answer. The
grader decides, or says it could not. What you rule is written to your browser's own database before
the card is allowed to move on. That database is the only stop on the way, which is why the loop
keeps working with no network, and we wait for that write, because an answer nobody kept is not an
answer.

The full map is in [`framing.md`](docs/framing.md), under architecture.

## Built with coding agents

This repository is built mostly with AI coding agents, and the method is part of the work. Five
read-only reviewers each read a change from a fresh start, from a different angle. One of them only
asks whether the change is what was asked for. A sixth reads the documentation against itself
whenever a document moves. Three hooks use no model at all: one refuses to end a turn on code that
does not compile, one blocks any shell command aimed at the WaniKani API, and the third only reports
what an edit is touching.

The automatic checks hold on their own. **The reading by a model does not.** A required check blocks
a merge when no recorded review covers the commits, but that record is written by the same side being
reviewed. So skipping the reading is visible, not impossible.
[`verification.md`](docs/verification.md) says what that is worth, and
[`workflow.md`](docs/workflow.md) describes the cycle around it.

## Documentation

Start at [`docs/README.md`](docs/README.md). It maps everything and gives a reading order. The short
version: [`framing.md`](docs/framing.md) for what and why,
[`specs/v0.1.md`](docs/specs/v0.1.md) for what we are building now, and
[`decisions/`](docs/decisions/) for the architecture decisions.

## License

MIT for the code.

The generated French corpus is not covered by that licence. Its terms are still an open question. It
is text written by a model against WaniKani's item set, so we have to settle what can be shared, and
under what conditions, before any of it is published.
