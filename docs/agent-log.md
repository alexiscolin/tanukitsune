# Agent log

**What this is.** A dated record of where the agent was overruled and why, written as it happens. Provenance belongs here, never in the documents that describe the system.

Dated notes on building this with coding agents: what was delegated, what was overruled, and why.
Written as it happens, because it cannot be reconstructed afterwards.

## 2026-07-28

Project framed before any code. Four research passes on current practice, three adversarial reviews of
the framing document, one audit of the agent configuration itself.

**Overruled twice toward less machinery.** A vector store was proposed for thematic grouping; the theme
set is closed, so a text array with a GIN index answers the query exactly and for free. Sentence
generation was described as RAG; retrieving a user's known vocabulary is a `SELECT`, and the real
problem is verification, not retrieval. RAG survives in one place, the tutor. An A2A endpoint was cut
for the same reason: no counterparty agent, so no protocol.

**Three false numbers, two of them in the opening thesis.** FSRS described as Anki's default when it
has been opt-in since 23.10 and still is. The "20 to 30 percent fewer reviews" figure presented as
measured when the source amended it in February 2026 to say it is a simulation. A duplication statistic
that does not exist in the form cited. All three came from the model and all three looked solid. The
rule that followed: any number carrying an argument has its source in the same paragraph, or it goes.

**The same failure mode one level down, in the agent configuration.** `REVIEW.md` was documented as
being injected into every review agent; it is read by the hosted GitHub app and nothing else. The Stop
hook's recursion guard used an exported shell variable, which does not survive between hook processes,
so it had never guarded anything. And the hook merged its errors into stdout, which a blocking exit
discards, so it would have blocked a turn while withholding the reason. None of it had ever run: with
no `package.json` the hook exits immediately.

**One contradiction, and it was the worst defect found.** Two sections gave opposite rules for the same
case: one resolved an uncertain submission by re-reading the assignment state, the other retried it.
The second corrupts data, since there is no idempotency key and the returned id is always zero, so a
blind retry advances the SRS stage twice. Both sentences read as reasonable alone, which is why neither
had been questioned.

**A directory layout was being called an architecture.** The document was silent on rendering and
caching, mutation transport, the server and client boundary, the service worker, local state and CSS,
for an application whose stated hard problem is frontend reconciliation. Twelve decisions are now
listed as owed rather than discovered during implementation. Two of them were existential: input method
composition, without which every mobile review submits a half-typed answer and the judge calibration
measures truncated input, and timer control, which is a Level A accessibility criterion and a data
model change if found late.

**One reframing that changed more than any individual fix.** The framing described a server-rendered
application. Tanukitsune is a client-side application with a server attached: the corpus, the judge and the
demo are server-shaped, the review loop is not. Deciding that the review session is a single client
route rather than a sequence of framework navigations collapses the service worker's hardest problem
and removes a class of state-preservation bug. One decision replacing several workarounds.

**Three concrete errors alongside it.** The TypeScript pin named a version that does not resolve,
because the 6 line ships under its own package name. The accessibility gate cannot run as specified,
since the standard plugin does not support the linter version chosen. And a claim about dead-code
detection was asserted without being checked, and is now marked as unverified.

**A discipline failure in the documentation itself.** Several documents narrated their own revision
history, referring to earlier drafts and to the reviews that produced them. That is conversation
leaking into artifacts meant to describe a system as it currently is. Provenance now lives here and in
the decision records only, the rule is in `AGENTS.md` and in the architecture reviewer's scope, and
`scripts/check-docs.sh` fails the build on it rather than relying on anyone noticing.

**Fifty open questions annotated by hand across eleven documents, then resolved.** Four needed a human
decision and were taken: the README rebuilt around the product rather than around the architecture,
Tailwind with `shadcn/ui` chosen because an agent writes it better than it writes authored class names,
a host chosen on the strength of skew protection and a durable cache, and FSRS scoped to never write to
WaniKani. Four defects nobody had annotated were found in the same pass: the audience column named a
column that did not exist under that name, an unsourced number sat in the document that forbids
unsourced numbers, the mutation transport argument was stated twice, and `pnpm verify` cannot run at
all because there is no `package.json`, which makes the toolchain the first slice rather than a feature.

**A seven-lens adversarial review of the whole set, with every finding attacked by a separate
verifier.** Seventy-six findings held, twenty-six were refuted. Four were unbuildable as written and
all four sat at the same seam, where prose becomes schema: `review_event` could not hold the override
data that four other passages promised it held, the corpus was placed only in Postgres while every
offline requirement needed it locally, `pnpm setup` started a database by a mechanism named nowhere,
and the fuzzy tier was unscoped by answer kind, so edit distance would have run over kana and accepted
こうえん for こうねん.

**The host decision was overturned by that review within the hour.** Skew protection is a paid feature,
so the argument that had just settled the choice did not survive contact with the pricing page. The
mechanism moved into the service worker, where it belongs regardless of host, and the host went back to
the open list. A decision recorded with its reason is a decision that can be checked; this one was
checked immediately and did not hold.

**The toolchain slice landed, and running it falsified four written claims.** `pnpm setup` cannot be
the one-command contract, because `pnpm setup` is a built-in pnpm command and would never have run the
script. The TypeScript 6 line ships its binary as `tsc6`, so a `typecheck` script saying `tsc` runs
nothing or runs whatever else is on the path. `eslint-config-next`, named in the stack document as the
reason ESLint was chosen, crashes ESLint 10 outright; the plugin it exists to deliver works when taken
directly. And the first `next build` rewrote `tsconfig.json` to set `strict` to `false`, silently, which
every gate then passed, because the document had relied on strict being a default instead of writing it
down. CI now fails if a build modifies that file.

**The database decision was taken by running the candidates rather than by reading about them.**
`embedded-postgres` was the intended answer, since it runs official binaries. It has published
prereleases exclusively for years, and on macOS arm64 its packaging ships a binary whose dynamic
library path is broken, so `initdb` aborts before a database exists. PGlite was checked against the
case ADR 0002 depends on, a GIN index over a `text[]` column, and serves it correctly while reporting
itself as PostgreSQL 18.3. Thirty minutes of running things settled a question that had been argued
twice on reputation.

**The first application code found six defects in itself, and the gates found two of them.** `knip`
refused exports that had no caller. axe refused the first page for having no title, a Level A
criterion, and refused the not-found page for having no `lang`, which turned out to be a real
consequence of calling `notFound` from a layout: the layout's own html element is skipped, so its
attributes go with it. The four the gates could not see were a table with no primary key, a health
endpoint a CDN was free to cache, a connection helper that memoised its own failure and so turned one
transient outage into a permanent one, and a Postgres pool with no bounds. All four are the kind that
only appear in production, and all four cost minutes to fix before any data existed.

**Three factual claims did not match their sources.** Web push was said not to reach an Apple Watch
when the WebKit post announcing the feature says it does. A self-preference figure of 4 to 8 points was
attributed to a paper that publishes no effect size. And a METR result was described as retired by its
authors when the linked follow-up retires nothing and changes the experiment design. All three read as
confident, all three came from a model, and all three were in the file whose entire purpose is to make
claims checkable.
