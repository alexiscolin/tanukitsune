import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DEMO_DECK } from '@/core/demo-deck'

import { DeckStrip, stripItemFor } from './deck-strip'

// The strip is hidden from the accessibility tree, so what there is to judge on this page is
// the recession, the dot under the active glyph, and where the row comes to rest.
const QUEUE = DEMO_DECK.map((subject) => stripItemFor(subject, `${subject.id}`))

const meta = { component: DeckStrip, args: { queue: QUEUE } } satisfies Meta<typeof DeckStrip>

export default meta

type Story = StoryObj<typeof meta>

// The first subject, where the half-width spacer is what lets it reach the middle at all.
export const Opening: Story = { args: { index: 0 } }

export const Middle: Story = { args: { index: 3 } }

// The last, where the spacer at the far end does the same work as the one at the near end.
export const Last: Story = { args: { index: DEMO_DECK.length - 1 } }

// A deck of one, which is a row with two spacers and nothing to scroll between them.
export const SingleCard: Story = { args: { queue: QUEUE.slice(0, 1), index: 0 } }
