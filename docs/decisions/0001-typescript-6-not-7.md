---
status: accepted
date: 2026-07-28
---

# Pin TypeScript 6 rather than adopt 7

## Context

TypeScript 7.0 shipped on 8 July 2026, the Go rewrite, roughly ten times faster to compile. It shipped
**without a public compiler API**, which the release announcement states plainly.

Everything that inspects TypeScript through that API is therefore blocked until 7.1: typescript-eslint
declares a peer range below 6.1 and closed its TS 7 support issue as not planned, dependency-cruiser
states 7.1 will be the first version it can support, and Next.js needs an experimental flag to type
check at all.

## Options

Adopt TypeScript 7 and lose type-aware linting and boundary enforcement. Pin TypeScript 6.0.3 and
keep them. Or run both through npm aliasing, compiling with 7 while tooling reads the 6 API.

## Decision

Pin TypeScript 6.0.3. Revisit at 7.1.

Type-aware linting and boundary enforcement are our two most important gates: `no-floating-promises`
alone catches the failure mode where an agent drops an `await` on a database write, which passes every
test and loses data silently. Trading that for compile speed on a single application is a bad exchange.

The aliasing hybrid works, but it is a clever configuration in a repository people read, and clever
costs more than it buys here.

## Consequences

Compilation is slower than it could be, which is unnoticeable at this size. `paths` are written
relative and `baseUrl` is absent, so the migration to 7.1 is already done. `"types": ["node"]` is
declared explicitly, since TypeScript 6 stopped auto-discovering.
