import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DEMO_DECK } from '@/core/demo-deck'

import { stripItemFor } from './deck-strip'
import { SessionHeader } from './session-header'

const QUEUE = DEMO_DECK.map((subject) => stripItemFor(subject, `${subject.id}`))

const meta = {
  component: SessionHeader,
  args: { queue: QUEUE },
} satisfies Meta<typeof SessionHeader>

export default meta

type Story = StoryObj<typeof meta>

// The two ends. Where the strip comes to rest in between is the strip's own page, and this one
// is about the counter standing against the band under it.
export const Opening: Story = { args: { index: 0 } }

export const Last: Story = { args: { index: DEMO_DECK.length - 1 } }
