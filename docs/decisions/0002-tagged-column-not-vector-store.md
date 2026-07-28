---
status: accepted
date: 2026-07-28
---

# Themes as a tagged Postgres column, not embeddings

## Context

Vocabulary needs grouping by theme: administrative, health, family, food, and so on, with an item
belonging to several at once. The obvious modern answer is embeddings in a vector store.

## Options

Embeddings with similarity search. Or one classification pass per item, stored as tags.

## Decision

One pass through a model per item, once, producing a tag array stored in Postgres with a GIN index.

The theme set is **closed**. We choose the categories, so the query is `WHERE 'health' = ANY(themes)`:
exact, instant, free, deterministic and debuggable. A vector store answers a question we do not have,
which is open-ended similarity over categories that do not exist yet.

## Consequences

No vector infrastructure, no embedding cost, no similarity threshold to tune, and no class of bug
where a query silently returns almost-right results.

If free-form semantic search ever becomes a real requirement, this decision is superseded rather than
worked around.

The criterion is that the set is closed, not that it is small. Hundreds of themes are fine: a GIN index
over a text array answers containment in the same time whether there are twenty tags or five hundred,
and the cost of adding one is a classification pass over the items it might apply to. What this
decision does not support is a category invented at query time by a user, and that is the condition
under which it gets superseded.

Recorded because the reverse choice is the one a reader expects, and because knowing when not to reach
for the fashionable tool is the point of this project.
