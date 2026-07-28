# Decisions

Architecture decision records. Append-only: superseding a decision means a new file and a status
change on the old one, never an edit.

Written when a decision is taken, not retroactively in bulk. A log of forty entries on a solo project
reads as ceremony rather than rigour; the target is roughly a dozen, each one covering a choice that
was expensive to reverse or that a reader will second-guess.

Plain markdown in the MADR minimal shape. No tooling: the ADR command line tools are abandoned, and
installing a dead one is a worse signal than installing none.

| ADR | Decision |
|---|---|
| [0001](0001-typescript-6-not-7.md) | Pin TypeScript 6 rather than adopt 7 |
| [0002](0002-tagged-column-not-vector-store.md) | Themes as a tagged Postgres column, not embeddings |
| [0003](0003-no-a2a-endpoint.md) | No A2A endpoint |
| [0004](0004-free-forever.md) | The product is free, permanently |
| [0005](0005-system-of-record-for-reviews.md) | We store review history; WaniKani no longer does |
