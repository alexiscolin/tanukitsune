# Tanukitsune

A kanji curriculum where a model writes the study material, grades free-text answers, and adapts what
is shown. Generated in your language, graded on your meaning, paced by your memory.

Start at `docs/README.md`, which maps every document and marks its audience. Read `docs/specs/v0.1.md`
before writing code, and `docs/decisions/` before proposing any architectural change. Anything not in
the current spec is out of scope, and adding it is a scope violation rather than initiative.

Two documents are written for a human operating the project and are context cost to you:
`docs/agent-log.md` and `docs/sources.md`. Do not open them unless the task is about
the documentation itself.

`info/` is human-only, gitignored, and not part of the project. Never read it and never write to it.

## Commands

```
pnpm bootstrap             one command from a fresh clone to a running app
pnpm dev
pnpm build                 in verify: the only gate that evaluates server modules
pnpm test                  unit tests over core/, no database
pnpm test path/to/file     one file
pnpm test:e2e              Playwright against the production build, with the axe audit
pnpm db:generate           write a migration from the schema
pnpm db:migrate            apply pending migrations
pnpm typecheck             tsc6, because the TS 6 line ships its binary under that name
pnpm lint
pnpm arch                  dependency-cruiser, plus a probe proving the rules fire
pnpm knip                  unused exports, files and dependencies
pnpm dupes                 jscpd, copy-paste ratchet
pnpm check:docs            documentation discipline
pnpm gate                  typecheck, lint, arch: seconds, needs no database
pnpm verify                gate, build, test, knip, dupes, check:docs
```

Run `pnpm verify` and show its output before saying work is done. Do not assert that something
passes.

The `Stop` hook runs `pnpm gate`, not `pnpm verify`: the full suite needs a database and end-to-end
runs, which do not fit inside a hook timeout, and a hook killed on timeout does not block anything. So
the hook catches code that does not compile, and `pnpm verify` catches the rest, before the pull
request and in CI.

## Constraints a linter cannot catch

- Postgres is never mocked. Tests run against a real database.
- MSW mocks third-party HTTP only, never our own data layer.
- Async Server Components cannot be unit tested. Data fetching lives in a plain function that is
  tested directly; the component is a shell that awaits it.
- `core/` imports nothing from `data/`, `ai/`, `app/` or `ui/`. `ui/` imports nothing from `data/`
  or `ai/`.
- No barrel files. Import from the source file.
- Interfaces are frozen once committed. If a type signature needs to change, stop and say so
  instead of changing it.
- Server Actions check authorisation inside the function. The proxy matcher is not a security
  boundary.
- The review queue is append-only with client-generated IDs. Replaying a sync twice must be safe. An
  uncertain submission is resolved by re-reading the assignment state, never by resubmitting. The
  mechanism is in `docs/framing.md`, under offline reconciliation.

## How work is done

One task per session: one slice, about five files, one behaviour, one PR. Structural changes and
behavioural changes never share a commit.

Red before green. The failing test is committed before the implementation, and it is never edited to
reach green. A test that has to change to pass means the plan was wrong, which is a re-plan and not an
implementation detail.

## Stop and ask

- The same issue has been corrected twice
- The change requires touching a frozen interface
- The change touches a token, a secret, or an authorisation check
- The change alters behaviour an existing test covers
- The diff is growing past what the plan described
- You are about to add a dependency, an abstraction with fewer than three call sites, or a file
  nothing imports yet

## Documents state what is true, never how they got there

A document describes the current state of the system. It never narrates its own revision history.

Banned in any document, code comment or commit body: references to an earlier draft, to a review or
audit, to what was previously wrong, to a conversation, or to the process that produced the text.
"An earlier version said X" and "a review found Y" are provenance, and provenance belongs in
`docs/agent-log.md` or in an ADR, which exist for exactly that.

The test: would this sentence still make sense to someone who joined today and has no idea the project
had a yesterday. If not, delete it or move it.

This is the same rule as the comment policy below. A comment explains a constraint, not the history of
the change that introduced it.

## Style

Everything a linter can catch is enforced by the linter and is not repeated here. What it cannot:

- Write a comment only when deleting it would lose information the code cannot carry. Never restate
  what the code does. No section banners, no step scaffolding.
- Keep a document proportioned. A detail never outweighs what it sits inside, and a paragraph does not
  grow a section for its own exception. If a point needs more room than its section can give it, it
  belongs in the document that owns that subject, with one line here pointing there.
- Match the two nearest files in the same directory: structure, naming, error handling.
- Never introduce a second way to do something that already exists here. Find the existing one.
- No em dashes, no emoji, anywhere. Code, comments, docs, commits, output. This is a ban on two
  characters, not on non-ASCII: the product is written in French and teaches Japanese, so diacritics,
  kana and kanji are correct content and stripping them is a defect. Accented French is written
  accented, in source strings as much as in the corpus.
- Commit subjects and pull request titles read the same way: `type(scope): imperative starting
  lowercase`, under 72 characters. Types are `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
  `perf`, `build`, `ci`. Body only when the reason is not obvious, and as prose rather than a bullet
  list. No AI attribution trailers, no co-author line.
- **Only the pull request title is gated**, in CI, because linting every commit blocks an agent
  mid-loop for no gain. The style is the same on both so that the history stays uniform whichever of
  the two a squash merge happens to take, rather than depending on a host setting staying correct.
- Nothing provisional reaches a merge: no commented-out code, no `TODO`, no placeholder, no defensive
  layer added in case. If it is needed later, it is a backlog entry, not a line in the diff.
