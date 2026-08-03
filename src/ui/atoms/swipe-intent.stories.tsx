import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { copyFor } from '@/core/site-copy'

import { SwipeIntent } from './swipe-intent'

const COPY = copyFor('fr').review

const meta = {
  component: SwipeIntent,
  args: { left: COPY.grade.incorrect, right: COPY.grade.correct },
} satisfies Meta<typeof SwipeIntent>

export default meta

type Story = StoryObj<typeof meta>

// At rest, where neither verdict is being headed for and neither is legible.
export const Still: Story = { args: { toward: null, reached: 0 } }

// Each verdict at full strength, which is what it reaches before the gesture commits. The
// partial opacities between those two are the reveal itself rather than a state: a still frame
// of one claims a contrast that instant never has to hold, and the audit is right to refuse it.
export const TowardWrong: Story = { args: { toward: 'left', reached: 1 } }

export const TowardRight: Story = { args: { toward: 'right', reached: 1 } }
