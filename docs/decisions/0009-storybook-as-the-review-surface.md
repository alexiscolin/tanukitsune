---
status: accepted
date: 2026-07-31
revisit-when: Storybook renders a Server Component reaching a server resource without an experimental flag
revisit-where: https://storybook.js.org/docs/get-started/frameworks/nextjs-vite
---

# Storybook as the review surface, catalogued by state

## Context

The review flow is specified as one route whose every step is a state rather than a page: the
question, the refusal, the verdict, the item card, the self-grade, the end. Those six live in the
three components under `src/ui/`, and the combinatorics are in them, multiplied by theme, by viewport
and by how long French runs.

Nothing renders one of those states on its own. The end-to-end suite drives the real application and
asserts, the unit tests render into a document no one looks at, and both answer whether a thing works
rather than whether it reads. A person deciding that a screen is right needs somewhere to look at it,
and the project has no such place.

What makes this a record rather than an installation is the rule it appears to break. A second way to
do something that already exists here is refused, and a catalogue that renders components is a second
renderer unless something stops it from becoming one.

## Options

A directory of screenshots, produced by driving the application and read as files. A gallery route
inside the application, rendering every state from fixtures. Storybook.

## Decision

**Storybook, through the Vite framework rather than the webpack one.** Only the former carries stable
support for this major of the framework; the webpack variant reached it in a prerelease. The Vite
variant is also the one whose testing integration would run stories as cases of the runner already
configured in `vitest.config.ts`, which is the form a gate over the catalogue would take.

**Nothing gates it today, and that is the shape of what ships.** No command runs a story, so the
catalogue and its accessibility audit both answer to a person opening a browser.
[`../verification.md`](../verification.md) carries that under what is not covered, beside the runner
that would close it.

The rejected two fail on the same axis. A directory of screenshots is not a surface: nothing links
the image to the state it shows, and a reader browses files. A gallery route ships a page inside the
product, which has to be kept out of production and which renders fixtures, so the day it drifts from
the application it lies with authority.

**A story supplies arguments, never markup.** This is the whole answer to the second-renderer
objection, and it is a rule rather than a habit: as long as no story defines an element or a class,
the catalogue is a second entry point into one renderer, not a second renderer. A story that writes
its own layout has already started the divergence, and there is no later point at which it is cheaper
to notice.

**States are reached by driving, not by posing.** `src/ui/organisms/review-session.tsx` holds the machine in its
own state, so a story cannot land on the verdict by passing a property. It types and clicks, as a
reader does. This is affordable because `src/core/grading/cascade.ts` is called with a null port in
v0.1, which the call site states as a design decision rather than a stub: the cascade is a string
comparison, with no network and no clock. Every state follows from a chosen answer. The refusal comes
from non-kana on a reading item, which `src/ui/molecules/answer-input.tsx` counts, and the self-grade from a
meaning the exact tier cannot place, which is undecided by construction. Nothing is mocked, and the
transitions are exercised rather than assumed.

**The catalogue covers `src/ui/` and stops there.** Storybook renders a Server Component only behind
an experimental flag, and that flag does not survive a component reaching a server resource, which is
what every one of ours does. This is the boundary the project already draws for the same reason: data
fetching lives in a plain function that is tested directly, and the component is a shell that awaits
it. The shell has nothing to show a reader that the function and the end-to-end suite do not already
cover.

## Consequences

None of the three volume tools needs configuring for the catalogue. Unused-export detection reads the
Storybook configuration itself and treats stories as entry points from it. The dependency rules
already reach them, a story being a module under `src/ui/`, so the rule refusing `ui` to reach `data`
refuses it inside a story. The copy-paste ratchet reports none.

**The Storybook directory has to be named by a glob in `tsconfig.json`, not by its name.** TypeScript
drops a directory beginning with a dot when it expands an include entry, so naming `.storybook` leaves
the configuration unchecked while the typecheck stays green. The lint is what catches it, failing on a
file its project service cannot find, and the lint is inside the fast gate, which is why this needs no
probe of its own.

The accessibility addon runs the audit once per state. `e2e/shell.spec.ts` visits three paths and
audits two of them as they load, the third being checked for where it redirects, and neither audited
path enters the loop, so no state of a review has ever been audited.

**Visual baselines are not part of this.** They come with the runner and cost nothing to switch on,
which is the trap: a baseline over a design still moving turns every deliberate change into a
ratification, and a reader who ratifies noise stops reading. They arrive when the design settles, and
that is a decision someone takes rather than a date that passes.

Storybook does not replace the end-to-end suite. The two real routes, the database, the offline path
and the composed page stay there. This is where a state is looked at and where a state is held still,
and it is never evidence that the application runs.
