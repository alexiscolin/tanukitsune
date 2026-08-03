import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SessionRule } from './session-rule'

// Three quantities on one hairline: what is passed, what was missed, what is left. The width
// is the quantity and the colour says which, so every state below is read without a digit.
const meta = { component: SessionRule } satisfies Meta<typeof SessionRule>

export default meta

type Story = StoryObj<typeof meta>

// Nothing answered yet, so the rule is one band of hairline and nothing else.
export const Untouched: Story = { args: { done: 0, missed: 0, total: 20 } }

// The band that only exists once something has been missed.
export const SomeMissed: Story = { args: { done: 8, missed: 3, total: 20 } }

export const Finished: Story = { args: { done: 17, missed: 3, total: 20 } }

// A deck of one, where every band is a fifth of the bar or the whole of it.
export const SingleCard: Story = { args: { done: 0, missed: 1, total: 1 } }

// The guard against a deck that arrived empty: the divisor is floored at one rather than
// letting the three shares be computed against nothing.
export const EmptyDeck: Story = { args: { done: 0, missed: 0, total: 0 } }
