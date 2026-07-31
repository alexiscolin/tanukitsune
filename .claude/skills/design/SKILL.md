---
name: design
description: Runs a design session on one screen: sketches carried as stories, judged in Storybook by the reader, promoted into the layers, then handed back. Use when a screen's appearance is undecided.
disable-model-invocation: true
argument-hint: "[screen]"
allowed-tools: Bash(pnpm storybook), Bash(pnpm gate), Bash(pnpm verify), Bash(grep:*), Bash(git status:*), Read, Write, Edit, Glob, Grep, SlashCommand
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
it is written. Read `docs/design-direction.md` for the intent, `src/app/globals.css` for what can be
spent, and `src/ui/` for what already exists, because the most expensive failure here is inventing a
piece that is already there under another name. If the direction file is missing, write it from what
the reader says and never invent it: a direction the agent guessed is one the agent will then defend
against the reader.

Take one screen, for the reason `AGENTS.md` gives for one slice. A screen is a client organism whose
route is the shell that awaits its data, and that is what makes it reachable at all: the catalogue
stops at `src/ui/` because Storybook renders a Server Component only behind a flag that does not
survive one touching a server resource.

Then state the intent back in a paragraph and have it confirmed. A round of discussion costs a few
hundred tokens and a round of sketching several thousand.

## While it is written

Each alternative is a `sketch-*.tsx` beside the component it would replace, carrying a story, so the
catalogue lists it and `knip` counts it as reached. Utilities are free, Tailwind's own defaults
included. A colour or a scale that does not exist yet becomes a candidate block in `globals.css`,
selected from the theme toolbar and never an arbitrary value in a class: every component then renders
under it at once, and the token rule is never disabled.

**The reader is the eyes.** The agent states no opinion on how anything reads. An agent describing a
screen it has not seen guesses in a register that sounds like observation, and the reader has no way to
tell the two apart.

Stop when it stops converging and write down what is undecided, rather than generating again. Producing
variants is infinite and feels like progress, which is the failure mode of this loop rather than an
inconvenience in it.

Two mechanisms carry what would otherwise be prose to remember: `.claude/hooks/announce-shared-edit.sh`
names an edit reaching the token source or a component something already renders, and `check:sketches`
refuses a sketch left behind. Both are described in `docs/verification.md`.

## When one wins

It takes its layer under `src/ui/` per `docs/decisions/0010-behaviour-imported-appearance-written.md`,
the values that survived take names in `globals.css`, and the component is rewritten to spend them.
Delete every sketch.

What was chosen goes into `docs/design-direction.md` as current truth and never as narrative, so the
next session inherits the decision instead of arguing it again.

Then run `pnpm verify`, show the output, and stop. Wiring the organism into its route, opening the pull
request and running `/pre-pr` are ordinary work under the same rules as any other slice. Carrying them
here would make one session hold a design decision, a structural change and a release at once.
