---
status: accepted
date: 2026-09-15
revisit-when: Netlify offers a way to stop injecting its hosting disclosure into served HTML, or a deployment that holds a token is wanted
revisit-where: https://www.netlify.com/changelog/
---

# Netlify serves the public demo, and only the demo

## Context

The host was an open decision, and [`../stack.md`](../stack.md) says what settles it: nothing technical
separates the candidates, so price and operating comfort do. The specification asks for a demo reachable
at a stable public URL by someone with no clone, no token and no account.

The version that reviews a real account cannot be public. v0.1 has no authentication: a deployment
holding the WaniKani token deals that account to whoever reaches it, and entering a token at the start of
the tunnel is the multi-user item of [`../backlog.md`](../backlog.md), which is not built.

## Options

A host the author already operates, or a new one chosen on price. The requirements the stack names, a CDN
honouring immutable responses and a free tier allowing a product that never charges, per
[ADR 0004](0004-free-forever.md), are met by the usual candidates. No comparison was run beyond that.

## Decision

Netlify, in the author's team `alexis-gj6qkry`, serves one site: `tanukitsune-demo`, at
https://tanukitsune-demo.netlify.app. It holds no token, no backup secret and no database. The seeded
deck is part of the bundle, so the demo needs none of them, and a deployment that holds none reaches
neither the account nor the backup route.

`netlify.toml` names the build. It is built from a checkout carrying no `.env.local`, since a build run
where the author's token is set is a build that can carry it.

## Consequences

**The health route answers 503.** It reports the database it reaches, and the demo has none. That is
true rather than broken, and it stays true until a deployment needs a database.

**Netlify injects markup into every page, and React reports it.** An HTML comment and two `meta` tags are
added to the head, so the page hydrates against HTML it did not render and React logs error 418, then
renders the page again in the browser. The page works. No documented setting removes the injection.

**The site deploys from the command line and is not connected to the repository.** A merge deploys
nothing, and a pull request gets no preview deployment or database branch. Connecting the repository is
what gives both.

**The author's own instance waits.** It needs either a protected deployment or the multi-user path, and
neither is decided here.
