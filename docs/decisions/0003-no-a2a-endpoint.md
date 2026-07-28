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

MCP is different: it exposes a real capability, a curated vocabulary and a grading function, to
assistants people already use. That has a consumer.

## Consequences

The same test applies to MCP itself. If the consumer cannot be named and demonstrated, MCP joins this
decision rather than shipping on the strength of the acronym.

Being able to explain why a protocol is not warranted is a better demonstration of judgement than
shipping a hollow implementation of it.
