---
status: accepted
date: 2026-07-28
---

# The product is free, permanently

## Context

A freemium model was designed: free for everything with zero marginal cost, paid for the live model
features. It mirrored the cost architecture exactly, which made it elegant.

Then the terms were read. WaniKani's API documentation states that you cannot use the content to build
anything for profit, and their terms of service prohibit exploiting any portion of the service without
express written permission. A Tofugu staff member, answering a developer in February 2026 who asked
about charging to cover model costs, replied that approval would require the app to be completely free
to use.

## Options

Charge and risk it. Ask for permission. Or be free.

## Decision

Free, permanently. And write to Tofugu anyway, then publish their answer.

This includes the shape that looks like a compromise: a free version without the model features and a
paid tier for them. That was the freemium design, it is what the developer in February 2026 was asking
about, and the answer was that approval requires the app to be completely free to use. Charging only
for the model features is still charging for an application built on their content, so it is not
available either.

## Consequences

Live model features are rate limited rather than paywalled, and the cost architecture, generate once
and share, stops being a pricing story and becomes a viability requirement.

The pitch accent exclusion is restated for the right reason: the NHK-derived dataset is not safe to
redistribute, which is a licensing problem, not a commercial one.

Asking rather than assuming, and publishing the answer, is an artifact no comparable project has.
