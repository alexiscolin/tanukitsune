import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { copyFor } from '@/core/site-copy'

import { SwipeIntent } from './swipe-intent'

const COPY = copyFor('fr').review

// The two verdicts sit behind the card and surface as it is pulled toward one, so the reader
// reads what they are about to say before they commit to saying it. Which one, and how far, are
// the gesture's to say: this only draws them.
const meta = {
  component: SwipeIntent,
  args: { left: COPY.grade.incorrect, right: COPY.grade.correct },
} satisfies Meta<typeof SwipeIntent>

export default meta

type Story = StoryObj<typeof meta>

// At rest, where neither verdict is being headed for and neither is legible.
export const Still: Story = { args: { toward: null, reached: 0 } }

// Pulled far enough to be read, well before it is far enough to commit.
export const TowardWrong: Story = { args: { toward: 'left', reached: 0.4 } }

// At the threshold, where the verdict is at full strength and releasing says it.
export const TowardRight: Story = { args: { toward: 'right', reached: 1 } }
