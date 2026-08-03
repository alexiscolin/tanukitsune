import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SessionRule } from './session-rule'

const meta = { component: SessionRule } satisfies Meta<typeof SessionRule>

export default meta

type Story = StoryObj<typeof meta>

// Nothing answered yet, so the rule is one band of hairline and nothing else.
export const Untouched: Story = { args: { done: 0, missed: 0, total: 20 } }

// The band that only exists once something has been missed.
export const SomeMissed: Story = { args: { done: 8, missed: 3, total: 20 } }

export const Finished: Story = { args: { done: 17, missed: 3, total: 20 } }

// A deck of one, where every band is the whole of the bar or none of it.
export const SingleCard: Story = { args: { done: 0, missed: 1, total: 1 } }
