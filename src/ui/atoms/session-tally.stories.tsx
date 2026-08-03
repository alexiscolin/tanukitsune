import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { copyFor } from '@/core/site-copy'

import { SessionTally } from './session-tally'

const meta = {
  component: SessionTally,
  args: { copy: copyFor('fr').review.tally },
} satisfies Meta<typeof SessionTally>

export default meta

type Story = StoryObj<typeof meta>

// Nothing missed, so no number on the row carries a colour.
export const Clean: Story = { args: { done: 6, left: 14, missed: 0 } }

// The one number allowed a colour, and only once there is one to name.
export const WithMisses: Story = { args: { done: 6, left: 11, missed: 3 } }

// Where the figures stop being one column wide, which the tabular numerals hold still.
export const LongSession: Story = { args: { done: 148, left: 52, missed: 27 } }
