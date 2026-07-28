---
status: accepted
date: 2026-07-28
revisit-when: PGlite reaches 1.0, or a local Postgres ships that needs no prerequisite and no beta tag
revisit-where: https://github.com/electric-sql/pglite/releases
---

# Drizzle for the query layer, and a file-backed Postgres locally

## Context

Three things are one decision, because they are installed and configured together: how a row shape
reaches `data/`, how migrations are written, and what a developer has a database in front of them
after one command.

Two commitments constrain it. Postgres is never mocked, so tests run against the real engine. And a
fresh clone reaches a running demo with `pnpm bootstrap` on a machine that has only Node and pnpm, so
nothing may be required beforehand. Docker satisfies the first and breaks the second.

## Options

Query layer: Drizzle, Kysely, Prisma, or hand-written SQL over `pg`.

Local database: Docker Compose, `embedded-postgres`, or PGlite.

## Decision

**Drizzle with drizzle-kit for migrations**, and **PGlite as the local database**, opened as a directory
in the working tree.

Drizzle keeps the schema in TypeScript, which is the artifact an agent reads before writing a query,
and emits migrations as SQL files that are reviewed as a diff. It has no runtime engine and no
generation step, so nothing sits between the source and the database that has to be rebuilt or kept in
sync. Prisma's own DSL and generated client are the opposite of that. Kysely is the closer call, and
loses on one point only: Drizzle's schema is the source of both the types and the migrations, where
Kysely needs the types to be produced separately.

`embedded-postgres` was the first choice, because it runs official Postgres binaries. It was tried and
it does not work: on macOS arm64 its beta packaging ships a binary whose dynamic library path is
broken, and `initdb` aborts. It has published prereleases exclusively, every version, for years. That
is now measured rather than assumed.

PGlite is PostgreSQL compiled to WebAssembly, and it reports itself as PostgreSQL 18.3. It is not a
mock and not an emulation of the wire protocol over something else: it is the engine, in process, with
its data in a directory. It was checked against the case the theme decision depends on, a GIN index
over a `text[]` column, which it serves correctly. Nothing has to be installed, nothing has to be
started, and there is no daemon to leave running.

## Consequences

Production uses `pg` against a server Postgres, so there are two drivers behind one Drizzle interface,
selected in a single module in `data/`. That is one branch in one file, and it is the price of the
one-command contract.

PGlite is pre-1.0 and single-connection, so **the end-to-end job in CI runs against a server Postgres**,
where a service container costs nothing. The unit suite needs no database and gets none: it covers
`core/`, which has no I/O by rule. Local runs are fast and need no prerequisite; the run that gates a
merge uses the same engine as production. A difference between the two is a CI failure rather than a
production surprise.

The dependencies are installed with the first table, not now, because a dependency nothing imports is
one the dead-code gate is right to reject.
