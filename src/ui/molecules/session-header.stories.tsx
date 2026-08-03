import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DEMO_DECK } from '@/core/demo-deck'

import { stripItemFor } from './deck-strip'
import { SessionHeader } from './session-header'

// The mark and the counter on one row, the deck on a band of its own under them. The total is
// the queue's own length, so the counter and the strip cannot disagree.
const QUEUE = DEMO_DECK.map((subject) => stripItemFor(subject, `${subject.id}`))

const meta = {
  component: SessionHeader,
  args: { queue: QUEUE },
} satisfies Meta<typeof SessionHeader>

export default meta

type Story = StoryObj<typeof meta>

export const Opening: Story = { args: { index: 0 } }

export const Middle: Story = { args: { index: 3 } }

export const Last: Story = { args: { index: DEMO_DECK.length - 1 } }
