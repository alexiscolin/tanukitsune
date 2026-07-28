---
status: accepted
date: 2026-07-28
---

# No A2A endpoint

## Context

A2A is a real protocol for agent interoperability, donated to the Linux Foundation, stable at 1.0,
adopted across major cloud platforms. Exposing one would look current.

## Options

Ship a minimal A2A endpoint alongside the MCP server. Or ship only MCP and record why.

## Decision

Only MCP.

A2A solves interoperability **between organisations**: peer discovery, task delegation with lifecycle,
artifact exchange across ownership boundaries. This application has no counterparty agent. An endpoint
here would be a facade with nobody on the other side, and anyone who knows the protocol would see it
immediately.

MCP is different: it exposes a real capability, a curated vocabulary and a learner's own study state,
to assistants people already use. The consumer is named, and so are the questions it answers. A person
talking to their usual assistant asks where they are in the curriculum, when the next level unlocks,
which JLPT level their current knowledge corresponds to, or what that kanji with a given radical was.
Every one of those is a query over data only this application holds, asked from outside it. That is the
entire case for MCP, and it is a case A2A does not make: nothing there is a task delegated to a peer
agent belonging to someone else.

## Consequences

The same test applies to MCP itself. If the consumer cannot be named and demonstrated, MCP joins this
decision rather than shipping on the strength of the acronym. The queries above are what it will be
demonstrated against.

Being able to explain why a protocol is not warranted is a better demonstration of judgement than
shipping a hollow implementation of it.
