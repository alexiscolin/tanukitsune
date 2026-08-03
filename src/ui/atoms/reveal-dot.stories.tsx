import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { copyFor } from '@/core/site-copy'

import { RevealDot } from './reveal-dot'

// The single vermillon dot, and the only accent the screen spends. It breathes while there is
// something to reveal and is spent once there is not.
const meta = {
  component: RevealDot,
  args: { copy: copyFor('fr').subject, onReveal: () => {}, listens: false },
} satisfies Meta<typeof RevealDot>

export default meta

type Story = StoryObj<typeof meta>

export const Waiting: Story = { args: { revealed: false } }

// Revealed on a subject with no audio: nothing is left to give up, so the control says it is
// done rather than answering to nothing.
export const Spent: Story = { args: { revealed: true } }

// Revealed on a subject that carries audio, where the dot becomes the pronunciation control.
export const Listens: Story = { args: { revealed: true, listens: true } }
