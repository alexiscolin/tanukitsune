---
status: accepted
date: 2026-07-31
revisit-when: Base UI stops being the primitive layer the ecosystem defaults to, which is the signal it has moved again
revisit-where: https://github.com/mui/base-ui/releases
---

# Behaviour imported, appearance written

## Context

The accessible primitives were to be `shadcn/ui`, copied into `ui/` as source. That suits an interface
assembled from conventional parts, where a skin arriving with a primitive is adjusted rather than
replaced.

This interface is not that. Every component has one appearance, bound to this product, and the brief
that governs it asks for the opposite of a recognisable component library. A skin that arrives with
the primitive is therefore discarded every time rather than adjusted, and a skin discarded every time
is not a starting point, it is code copied into the tree to be rewritten and then maintained.

The ground under that choice has also moved. Radix, which `shadcn/ui` wrapped, slowed after its
acquisition. Base UI reached its first stable major with full-time maintenance behind it, and
`shadcn/ui` itself now installs Base UI by default, which says where the ecosystem went rather than
where one project wants to go.

## Options

Keep copying `shadcn/ui` primitives and rewrite each one's appearance. Import a headless library and
write every appearance here. Write everything, accessible widgets included.

## Decision

**Behaviour is imported. Appearance is written here and never copied in.** This is the rule the rest
follows from, and it is what removes `shadcn/ui`: what it offers beyond its dependency is a skin, and
a skin is the one thing this interface will not keep.

The third option is refused for the reason a boundary exception is refused elsewhere. Writing a
dialog's focus trap or a tab list's roving index is writing accessibility that a maintained library
already got right, and getting it subtly wrong is invisible until someone who navigates by keyboard
tries it.

**A native element wherever one exists.** A checkbox, a radio group, a range, a text field and a
multi-line field cover almost every control this product needs, including the ones that look least
like form controls. They arrive correct at the keyboard, under a screen reader and under touch, they
cost nothing, and they take a class like anything else. An element rewritten in JavaScript because it
looked hard to style is the most expensive mistake available here.

**Base UI for what HTML has no element for**, which today is a tab list, a dialog or panel, and
possibly a select. Rather than Radix, whose release cadence fell away. Rather than React Aria, which
offers the deepest interaction model in the form of hooks: that trade pays when a team needs forty
widgets and writes its own composition for each, and it does not when the need is three. The rule
from [`../stack.md`](../stack.md) still holds, that a component arrives the moment it is first
imported and never in bulk.

**Four layers under `src/ui/`.** `primitives/` holds behaviour and no appearance, whether it wraps a
native element or an import. `atoms/` holds the display pieces this product invents, which carry
appearance and no behaviour. `molecules/` assembles them into a field, a row, a card. `organisms/`
holds the pieces that are the product.

**What is imported is not classified.** A dependency stays in `primitives/` under its own name. The
taxonomy describes what this repository authored, and a library sorted into it becomes a library this
repository appears to own.

**Motion in three lanes, and never two libraries.** Anything animating `transform` or `opacity` uses
CSS or the Web Animations API, which run on the compositor thread and cost no main thread at all,
while a JavaScript library driving the same properties runs beside the interface's own work. Route and
card continuity uses view transitions. A gesture, and only a gesture, may justify one JavaScript
dependency. A second one is the second way to do something that already exists here.

## Consequences

`src/ui/atoms/screen-shell.tsx` is the shell, and it is four lines. The one this interface started
with centred inside a prose measure while the screens are full bleed, which made it the first
component the new structure replaced.

`pnpm arch` needs no change. Its rules match `^src/ui/`, a prefix, so a component in a sub-directory is
covered by the same reachability and `server-only` rules as one directly beneath. This was checked
rather than assumed.

The catalogue takes the taxonomy from the directory, since a story with no declared title is filed
under its own path. So a component that changes layer changes place in the catalogue with the move,
and there is no second declaration to keep in step with the first.

A shader is not decided here. Rendering a gradient with animated noise is a WebGL question, and a
tweening library cannot answer it: it would only drive that shader's inputs, which a frame callback
does for nothing. The question opens when that rendering is actually wanted.

Nothing about the accent, the palette or the scale is decided here either. This record covers where
behaviour comes from and how the layers are cut, and a value belongs in the token source instead.
