import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { startPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'

import { DEMO_DECK } from '@/core/demo-deck'
import { LessonSession } from './lesson-session'

// The batch, paged through. One story rather than six: a lesson has no states, only a
// position, and the four subjects behind this one are the four shapes ./subject-card.stories
// renders on their own.
const COPY = copyFor('fr')

const meta = {
  component: LessonSession,
  args: {
    deck: DEMO_DECK,
    copy: COPY.review,
    subjectCopy: COPY.subject,
    exitTo: startPath('fr'),
  },
  parameters: { fullBleed: true },
} satisfies Meta<typeof LessonSession>

export default meta

type Story = StoryObj<typeof meta>

export const Batch: Story = {}
