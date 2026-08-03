import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { copyFor } from '@/core/site-copy'

import { AnswerLabel } from './answer-label'

const COPY = copyFor('fr').review

// Which of the two questions is being put, and the only word on the screen while it is being
// put. It goes once the answer has been judged, and only its ink goes: the field still owes a
// screen reader its name.
const meta = {
  component: AnswerLabel,
  args: { htmlFor: 'answer', judged: false },
} satisfies Meta<typeof AnswerLabel>

export default meta

type Story = StoryObj<typeof meta>

export const AskingMeaning: Story = { args: { label: COPY.prompt.meaning } }

export const AskingReading: Story = { args: { label: COPY.prompt.reading } }

// Judged, so the question stops being asked and the word leaves the screen without leaving the
// accessibility tree.
export const Judged: Story = { args: { label: COPY.prompt.meaning, judged: true } }
