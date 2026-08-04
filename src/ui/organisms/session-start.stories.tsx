import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DEMO_DECK, DEMO_QUESTIONS } from '@/core/demo-deck'
import { sessionPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'

import { SessionStart } from './session-start'

// Two states, because the screen has two: something is waiting, or nothing is. The second is
// not a rare one, it is every screen after the last review of the day, and it is the one where
// a row has to say so without offering a way into an empty deck.
const COPY = copyFor('fr')

const meta = {
  component: SessionStart,
  parameters: { fullBleed: true },
  args: {
    title: COPY.title,
    tagline: COPY.tagline,
    copy: COPY.start,
    queues: {
      lesson: { count: DEMO_DECK.length, href: sessionPath('fr', 'lesson') },
      review: { count: DEMO_QUESTIONS.length, href: sessionPath('fr', 'review') },
    },
  },
} satisfies Meta<typeof SessionStart>

export default meta

type Story = StoryObj<typeof meta>

export const Waiting: Story = {}

export const NothingLeft: Story = {
  args: {
    queues: {
      lesson: { count: 0, href: sessionPath('fr', 'lesson') },
      review: { count: 0, href: sessionPath('fr', 'review') },
    },
  },
}
