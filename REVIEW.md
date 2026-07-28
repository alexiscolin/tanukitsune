# Review instructions

## What counts as Important

Reserve it for findings that break behaviour, leak data, or block a rollback: incorrect logic, a query
not scoped to the current user, a token or answer string reaching a log, a migration that is not
backward compatible, a verdict written to WaniKani that should not have been.

Style, naming and refactoring suggestions are Nit at most.

## Cap the nits

Five per review. Beyond that, one line in the summary saying how many similar items were omitted.

## Do not report

- Anything CI already enforces: types, lint, formatting, dead code, module boundaries
- Generated files and lockfiles
- Test code that deliberately violates production rules

## Always check

- Every Server Action validates its input with a schema before touching the database, and checks
  authorisation inside the function rather than relying on routing
- Nothing in `ui/` imports `data/` or `ai/`, and nothing in `core/` imports any of them
- Database reads are scoped to the current user
- No model output is rendered as HTML
- Nothing user-authored enters the shared verdict cache
- The review queue stays replay-safe: client-generated IDs, no mutation in place

## Verification bar

A claim about behaviour requires a `file:line` citation in the source. An inference from a name is not
a finding. If you cannot point at the line, do not report it.

## Convergence

On a re-review, drop new nits entirely and post only Important findings. A one-line change must not
reach a seventh round on style.
