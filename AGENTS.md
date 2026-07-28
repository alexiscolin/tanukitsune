# Kaeru

A WaniKani client for non-English speakers, French first.

Start at `docs/README.md`, which maps every document. Read `docs/specs/v0.1.md` before writing code,
and `docs/decisions/` before proposing any architectural change. Anything not in the current spec is
out of scope, and adding it is a scope violation rather than initiative.

## Commands

```
pnpm dev
pnpm test                  all tests
pnpm test path/to/file     one file
pnpm typecheck
pnpm lint
pnpm arch                  module boundary check
pnpm knip                  dead code
pnpm verify                everything above, in one command
```

Run `pnpm verify` and show its output before saying work is done. Do not assert that something
passes.

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
- The review queue is append-only with client-generated IDs. Replaying a sync twice must be safe.

## How work is done

One task per session: one slice, about five files, one behaviour, one PR. The failing test is
committed before the implementation. Structural changes and behavioural changes never share a
commit.

## Stop and ask

- The same issue has been corrected twice
- The change requires touching a frozen interface
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
- Match the two nearest files in the same directory: structure, naming, error handling.
- Never introduce a second way to do something that already exists here. Find the existing one.
- No em dashes, no emoji, anywhere. Code, comments, docs, commits, output.
- Commit subject in the imperative, under 72 characters. Body only when the reason is not obvious,
  and as prose rather than a bullet list. No AI attribution trailers.
