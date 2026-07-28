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

An adversarial review of the framing document then found three false numbers in it, two of them in the
opening thesis: FSRS described as Anki's default when it has been opt-in since 23.10 and still is, the
"20 to 30 percent fewer reviews" figure presented as measured when the source amended it in February
2026 to say it is a simulation, and a duplication statistic that does not exist in the form cited.
All three came from the model, and all three looked solid. Corrected, and the rule that follows is
now in the documentation: any number carrying an argument has its source in the same paragraph or it
is deleted.

A second audit checked the agent configuration itself and found the same failure mode one level down.
Three things were confidently wrong. `REVIEW.md` was documented as being injected into every review
agent; it is read by the hosted GitHub review app and by nothing else, and `/code-review` explicitly
skips it. The Stop hook's recursion guard used an exported shell variable, which does not survive
between hook processes, so it had never prevented anything. And the hook merged its error output into
stdout, which a blocking exit discards, meaning it would have blocked a turn while withholding the
errors needed to unblock it, then looped. None of this was discovered by running it, because with no
`package.json` the hook had never executed. Documentation that describes infrastructure which does not
exist is the specific gap a senior reader is calibrated to find.
