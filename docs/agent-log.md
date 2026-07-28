# Agent log

Dated notes on building this with coding agents: what was delegated, what was overruled, and why.
Written as it happens, because it cannot be reconstructed afterwards.

## 2026-07-28

Project framed before any code. Four research passes on current practice, three adversarial reviews of
the framing document.

Overruled the research twice, both times toward less machinery:

A vector store was proposed for thematic grouping. Rejected: the set of themes is closed, so a text
array column with a GIN index answers the query exactly, instantly, and for free. A vector store would
have been a more impressive-looking answer to a question nobody asked.

Sentence generation was described as RAG. Rejected as inflation: retrieving a user's known vocabulary
is a `SELECT`, not semantic search. The real problem is not retrieval but verification, so the design
became generate, tokenise, check every token against the known set, and regenerate on failure. RAG
survives in one place only, the tutor, where questions are open ended over a document corpus.

Also cut an A2A endpoint from the plan. The protocol is real, but this application has no counterparty
agent, so the endpoint would have been a facade. Documented as a decision rather than silently
dropped.
