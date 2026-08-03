---
status: accepted
date: 2026-08-03
---

# A page per component, and the tokens beside them

## Context

[`0009-storybook-as-the-review-surface.md`](0009-storybook-as-the-review-surface.md) catalogued the
states of the review loop, because those states were what nothing rendered on its own and what a person
deciding the screen was right had nowhere to look at. Three components carried them, and the pieces
inside those three were read through them.

`src/ui/` now holds one component per file. A leaf that draws a label and its value, a rule that draws
three quantities on one hairline, a dot that breathes: each is a thing a person judges on its own, and
each is currently reachable only by driving a whole session to the state that happens to render it. A
component with an empty branch is worse still, since the state that shows nothing is the one no screen
puts on display.

The tokens have the same gap and it is wider. `src/app/globals.css` declares itself the single source
of every colour, length and easing, and `scripts/check-contrast.mjs` weighs every ink on every ground,
so what a token is worth is checked. What it looks like beside its neighbours is not, and nowhere in
the project can the palette, the type scale and the mastery ramp be seen at once.

## Options

Leave the catalogue at the states and read the pieces through them. Give every component a page. Give
every component a page and add a page for the tokens themselves.

## Decision

**Every component under `src/ui/` has a page, except those whose content arrives as `children`.** A
container's page would have to invent what it contains, and invention in a story is the first step
toward the second renderer 0009 refuses. There are six today, the shell, the well, the block, the card
behind the deck, the session frame and the deck itself, and each is read through whatever fills it.

**The rule that a story supplies arguments and never markup is unchanged**, and it is what decides the
exception above rather than being weakened by it. States that follow from a machine are still reached
by driving: a story types and clicks where a component holds its own state, and poses only what is
genuinely a property.

**A ground belongs to the catalogue, not to a story.** A component rendered alone needs a surface to
be seen against and a height to resolve against, and a story that draws its own is a story writing
markup. `.storybook/preview.tsx` gives every story that ground and gives none to a story that declares
itself full bleed, since a screen carries its own shell and a second one measures a rhythm the product
never has.

**The tokens are rendered by a component, in `src/ui/catalogue/`.** A fifth directory beside the four
[`0010-behaviour-imported-appearance-written.md`](0010-behaviour-imported-appearance-written.md) names,
holding what the catalogue needs and the product does not render. Keeping it out of `atoms/` is what
keeps that word meaning something the product draws. The alternative, a documentation page in MDX,
would put appearance in a file the renderer never sees and reopen the markup rule to do it.

## Consequences

The catalogue grows from three pages to twenty-seven, twenty-six components and the tokens.
`e2e/catalogue.spec.ts` drives and audits every state on every one of them in both themes, so the
accessibility floor now applies to each component alone and not only to the screens that happen to
contain it. That is what the suite costs: its budget is a number of pages rather than one page, and it
was raised in the same change rather than left to fail as flakiness.

`docs/verification.md` said that nothing required a component to have a page. It says the opposite now,
in the same change.

The token page is the one place appearance is asserted by being looked at rather than measured. It
renders from the custom properties, so a token added without it is a gap the page shows by omission
rather than a page that goes stale.

Nothing here decides visual baselines, which 0009 defers until the design settles, and a page per
component does not make that cheaper: twenty-six baselines over a moving design ratify twenty-six times
as much noise.
