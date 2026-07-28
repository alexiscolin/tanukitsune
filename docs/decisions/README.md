# Decisions

Architecture decision records. Append-only: superseding a decision means a new file and a status
change on the old one, never an edit.

Written when a decision is taken, not retroactively in bulk. A log of forty entries on a solo project
reads as ceremony rather than rigour; the target is roughly a dozen, each covering a choice that was
expensive to reverse or that a reader will second-guess.

Plain markdown in the MADR minimal shape. No tooling: the ADR command line tools are abandoned, and
installing a dead one is a worse signal than installing none.

**Any decision that depends on the state of the ecosystem carries `revisit-when` and `revisit-where`
in its front matter.** A version pin, a workaround for an upstream gap, or a choice made because
something was not ready yet is debt the moment the reason expires, and debt nobody wrote a trigger for
is invisible. Naming the condition and the page to check turns it into a scheduled decision.

## Recorded

| ADR | Decision |
|---|---|
| [0001](0001-typescript-6-not-7.md) | Pin TypeScript 6 rather than adopt 7 |
| [0002](0002-tagged-column-not-vector-store.md) | Themes as a tagged Postgres column, not embeddings |
| [0003](0003-no-a2a-endpoint.md) | No A2A endpoint |
| [0004](0004-free-forever.md) | The product is free, permanently |
| [0005](0005-system-of-record-for-reviews.md) | We store review history; WaniKani no longer does |

## Owed, ordered by cost of being wrong

Open decisions. Each has a consequence that gets expensive once code exists.

1. **IME composition handling.** Enter confirms a conversion before it submits. Gating on composition
   state, as a tested primitive, before any other component. Already in the v0.1 spec; the ADR records
   the mechanism.
2. **Mutation transport.** A route handler taking a batch for the queue flush, server actions only for
   genuine forms. Server actions dispatch sequentially, their identifiers rotate on deploy, and an
   offline client is a stale client.
3. **Local state.** A hand-rolled IndexedDB outbox exposed through `useSyncExternalStore`, one
   dependency. The review compared every sync engine and query library and found each solves a
   different problem: they sync our database to our client, while the authority here is a rate-limited
   third-party API.
4. **Service worker.** Hand-written, targeting the version of Next that compiles service workers
   natively. The established plugin is unmaintained since 2022 and its successor has an open crash
   with the caching model we would adopt.
5. **Cache Components on or off**, and what the resulting navigation semantics mean for a review loop
   whose effects would re-run on every hide and reveal.
6. **Storage durability on iOS.** Persistence requests, the seven-day cap, the separate storage
   partition after install, and deployment skew protection returning 404 to a long-lived client.
7. **Timer control**, because WCAG 2.2.1 is Level A and retrofitting it is a data model change.
8. **React Compiler on**, and what that changes about how components are written.
9. **CSS strategy and accessibility primitives**, including which primitive library, given that the
   obvious choice has had its composition API repeatedly broken by the server component transition.
10. **An accessibility gate that actually runs**, since the standard lint plugin does not support the
    linter version we committed to.
11. **Routing for locales**, even if the answer is one locale in v0.1, because it is a directory
    restructure rather than a feature.
