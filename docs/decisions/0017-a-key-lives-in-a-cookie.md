---
status: accepted
date: 2026-09-16
---

# A reader's WaniKani key lives in a cookie, and never in the database

## Context

The public deployment serves the demo, and a reader who holds a WaniKani key should be able to review
their own account on it. The key is what names an account and what grants access to it, so it is the
one credential the product handles for somebody other than the author.

The pages render on the server. What deals a queue reads the key while rendering, so the key has to be
readable on the server for every request, not only on the device.

[ADR 0005](0005-system-of-record-for-reviews.md) makes this database the only record of a review that
will exist, so the rows a reader writes outlive their session. What the rows need is an identifier,
which is not the same thing as the key.

## Options

Store the key, encrypted at rest, against an account row. Keep it in the browser alone and send it on
each request from the client. Or set it in a cookie the server reads.

Storing it is the shape a password-backed product takes, and it buys a second device and a recovery
path. It also makes this project the holder of other people's credentials, with a key to manage, a
rotation to plan and a breach to be responsible for. Keeping it in the browser alone cannot serve a
page that renders on the server: the first render has no request from the client to carry it.

## Decision

The key is set in a cookie, `HttpOnly`, `Secure`, `SameSite=Strict`, on the response that accepts it.
Every request that needs it reads it from there, sends it to WaniKani, and forgets it. Nothing writes
it to the database, to a log or to a client bundle.

What the database holds is the account identifier the key resolves to, on every row the reader writes.
Deleting a history is a delete by that identifier, which is the whole of what the product knows about
somebody.

## Consequences

**A reader is their browser.** Signing in on a second device means pasting the key again, and what the
reader chose beside it does not travel. There is nothing to recover, because there is nothing kept.

**The breach surface is the deployment, not a table.** A database copy carries no credential. What
remains is the running server, which sees a key for the length of a request.

**Revocation belongs to WaniKani.** A reader who regenerates their key there ends every session here,
and the product needs no revocation of its own.

**No support path can act for somebody.** With no account row and no email, there is nobody to
identify and nothing to restore. That is the trade a product with no password makes.
