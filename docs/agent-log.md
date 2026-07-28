# Agent log

**What this is.** A dated record of where the agent was overruled and why, written as it happens. Provenance belongs here, never in the documents that describe the system.

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

An architecture review then found the worst defect so far, and it was a contradiction rather than an
omission. Two sections of the framing document gave opposite rules for the same case: one said an
uncertain submission is resolved by re-reading the assignment state, the other said an unknown result
is retried. The second corrupts data. Submission has no idempotency key and the response carries an id
that is always zero, so a blind retry on a lost acknowledgement advances the SRS stage twice and
silently damages the user's progression. Both sentences read as reasonable in isolation, which is why
neither had been questioned.

The same review found that the document described a directory layout and called it an architecture. It
was silent on the rendering and caching model, the mutation transport, the server and client boundary,
the service worker, local state and CSS, for an application whose stated hard problem is frontend
reconciliation. Eleven decisions are now listed as owed in the decisions index rather than discovered
during implementation.

Two of those are existential rather than architectural. Input method composition was never mentioned,
in a Japanese typing app where Enter confirms a conversion before it submits anything: without gating
on composition state, every review on mobile submits a half-typed answer, and the judge calibration
would have been measured against truncated input. And a review timer would fall under a Level A
accessibility criterion requiring it to be adjustable, which is a data model change if discovered late.

The consolidated architecture review added one reframing that changes more than any individual fix.
The framing described a server-rendered application; Kaeru is a client-side application with a server
attached. The corpus, the judge and the demo are server-shaped, but the review loop reads from the
browser's database and writes to a local queue, so the framework's rendering model buys it nothing.
Deciding that the review session is a single client route rather than a sequence of framework
navigations collapses the service worker's hardest problem and removes a class of bug from the routing
model's state preservation. That is one decision replacing several workarounds, which is the shape a
good architectural correction takes.

Three concrete errors alongside it. The TypeScript pin was written as a version that will not resolve,
because the 6 line now ships under a different package name. The accessibility gate cannot run as
specified, since the standard lint plugin does not support the linter version we committed to. And a
claim about dead-code detection was asserted without being checked; it is now marked to verify rather
than left to look authoritative.

Corrected a discipline failure in the documentation itself: several documents narrated their own
revision history, referring to earlier drafts and to the reviews that produced them. That is
conversation leaking into artifacts meant to describe the current state of a system, and it pollutes a
wider scope than the exchange it came from. A reader joining today should not need to know the project
had a yesterday. Provenance now lives here and in the decision records only, and the rule is in
AGENTS.md and in the architecture reviewer's scope so it is caught mechanically rather than noticed.
