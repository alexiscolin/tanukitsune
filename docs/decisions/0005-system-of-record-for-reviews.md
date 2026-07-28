---
status: accepted
date: 2026-07-28
---

# We store review history; WaniKani no longer does

## Context

Since April 2023 WaniKani discards review rows. `GET /reviews` returns an empty array, and
`POST /reviews` returns an unpersisted review whose id is always zero. Their documentation says so
directly.

Everything planned for later depends on that history: FSRS optimisation needs the full log with
timestamps and outcomes, statistics have nothing to compute over without it, and the measurement of
FSRS against WaniKani's fixed intervals requires a history nobody collected.

## Options

Assume WaniKani has the data and fetch it later. Or record it ourselves from the first answer.

The first option is not available. The data does not exist anywhere.

## Decision

`review_events` ships in v0.1, append-only, written durably before the interface advances to the next
card, never deleted, backed up server-side.

It is nearly free: the submission response already returns the updated assignment and review
statistic, so no extra request is needed.

## Consequences

This is the only piece of local state that cannot be reconstructed from anywhere, which makes it the
one thing storage eviction must not be allowed to lose. Corpus and assignments are caches and refetch
cleanly; this does not.

Every day it is not collected is a day that never comes back, which is why it stayed in v0.1 while
FSRS itself was pushed to v0.2.
