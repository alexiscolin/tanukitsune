---
name: design
description: Runs a design session on one screen: sketches carried as stories, judged in Storybook by the reader, promoted into the layers, then handed back. Use when a screen's appearance is undecided.
disable-model-invocation: true
argument-hint: "[screen]"
allowed-tools: Bash(pnpm storybook), Bash(pnpm gate), Bash(pnpm verify), Bash(grep:*), Bash(git status:*), Bash(rm:*), Read, Write, Edit, Glob, Grep, SlashCommand, mcp__claude-in-chrome__navigate
---

# Design session

Sketches one screen against a written direction, in the catalogue, until the reader says it reads
right. Then promotes it and stops.

**This skill governs the loop and nothing else.** `AGENTS.md` applies unchanged throughout: the layers,
the token rule, the ban on a second way to do something that already exists, the commit style, the
stop-and-ask list. A design session that relaxes any of them has produced a second standard, which is
what this repository refuses hardest.

**It is short because the loop has never run.** What is here is what could be neither mechanised nor
guessed. Everything else waits for a session to show it: a convergence threshold that was measured
beats one that was chosen, and a rule about motion belongs to the day something moves. Add to this from
what a session did, never from what the next one might need.

## Before anything is written

Start `pnpm storybook` and leave it up for the whole session, since every alternative appears in it as
it is written. Open it in the reader's browser and, from then on, point that tab at each alternative as
it lands, so they look rather than hunt for it in the sidebar. Navigating costs nothing, unlike a
screenshot, and it is not the agent looking. Where the browser tools are absent, print the URL instead:
the session must not depend on them.

Read `docs/design-direction.md` for the intent, `src/app/globals.css` for what can be
spent, and `src/ui/` for what already exists, because the most expensive failure here is inventing a
piece that is already there under another name. If the direction file is missing, write it from what
the reader says and never invent it: a direction the agent guessed is one the agent will then defend
against the reader. Add it to the map in `docs/README.md` in the same edit, since `check:docs` refuses
a document directly under `docs/` that the map does not list, and the session ends on `pnpm verify`.

Take one screen, for the reason `AGENTS.md` gives for one slice. A screen is a client organism whose
route is the shell that awaits its data, and that is what makes it reachable at all: the catalogue
stops at `src/ui/` because Storybook renders a Server Component only behind a flag that does not
survive one touching a server resource.

Then state the intent back in a paragraph and have it confirmed. A round of discussion costs a few
hundred tokens and a round of sketching several thousand.

## While it is written

Every alternative lives under `src/ui/sketches/`, carrying a story, so the catalogue groups them apart
from the components and `knip` counts them as reached. It sits inside `src/ui/` rather than beside it
so the layer and `server-only` rules cover it without a line of configuration.

**A component being reworked is copied there, never edited in place.** The original keeps rendering
for every call site it already has, for the whole session, and rolling back is deleting files nothing
imports. It is replaced once, when one alternative wins, in a commit that reverts on its own.

Utilities are free, Tailwind's own defaults included. A colour or a scale that does not exist yet
becomes a candidate block in `globals.css`, selected from the theme toolbar and never an arbitrary
value in a class: every component then renders under it at once, and the token rule is never
disabled.

**The reader is the eyes.** The agent states no opinion on how anything reads. An agent describing a
screen it has not seen guesses in a register that sounds like observation, and the reader has no way to
tell the two apart.

Stop when it stops converging and write down what is undecided, rather than generating again. Producing
variants is infinite and feels like progress, which is the failure mode of this loop rather than an
inconvenience in it.

Two mechanisms carry what would otherwise be prose to remember: `.claude/hooks/announce-shared-edit.sh`
names an edit leaving `src/ui/sketches/` for the token source or a component something already renders,
and `check:sketches` refuses anything left in the area. Both are described in `docs/verification.md`.

## When one wins

It takes its layer under `src/ui/` per `docs/decisions/0010-behaviour-imported-appearance-written.md`,
**and its story moves with it**, renamed, or the state just designed leaves the catalogue with the
alternatives it beat. The values that survived take names in `globals.css` and the component is
rewritten to spend them. Empty `src/ui/sketches/`.

**Then wire it in, in its own commit.** A component only its story imports is a display case rather
than a product, so the session does not end before the screen is in the route. The end-to-end suite
covers the routes a substitution reaches, and its own job runs on the pull request.

**A screen needing a route that does not exist yet is a different slice**, and the session says so
instead of opening one. A route carries its own data loading, its empty and error states and its place
in the layer graph, none of which is the tail of a design session.

What was chosen goes into `docs/design-direction.md` as current truth and never as narrative, so the
next session inherits the decision instead of arguing it again.

Then run `pnpm verify`, show the output, and stop. Opening the pull request and running `/pre-pr` are
the reader's, as they are for any other slice.
