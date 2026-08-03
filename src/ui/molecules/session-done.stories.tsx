import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { copyFor } from '@/core/site-copy'

import { SessionDone } from './session-done'

// The end of a session, and a step of the loop like every other, so it takes the focus the same
// way. It carries its own shell, which is why this page is full bleed.
const meta = {
  component: SessionDone,
  parameters: { fullBleed: true },
  args: { label: copyFor('fr').review.done },
} satisfies Meta<typeof SessionDone>

export default meta

type Story = StoryObj<typeof meta>

// A session that was walked, so the heading is what the reader is sent to.
export const Reached: Story = { args: { reached: true } }

// A deck that arrived with nothing in it was never a session, so nothing takes the focus.
export const NeverStarted: Story = { args: { reached: false } }
