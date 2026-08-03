import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { userEvent, within } from 'storybook/test'

import { copyFor } from '@/core/site-copy'

import { AnswerField } from './answer-field'

const COPY = copyFor('fr').review

const meta = {
  component: AnswerField,
  args: {
    unconverted: COPY.unconverted,
    autoFocus: false,
    judged: false,
    onSubmit: () => {},
    onEdit: () => {},
  },
} satisfies Meta<typeof AnswerField>

export default meta

type Story = StoryObj<typeof meta>

export const AskingMeaning: Story = { args: { kind: 'meaning', label: COPY.prompt.meaning } }

export const AskingReading: Story = { args: { kind: 'reading', label: COPY.prompt.reading } }

// Romaji becoming kana as it is typed, which is the one thing about this field that cannot be
// posed: it follows from what was pressed.
export const Converting: Story = {
  args: { kind: 'reading', label: COPY.prompt.reading },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText(COPY.prompt.reading), 'shita')
  },
}

// Non-kana on a reading, which the field refuses rather than sending to a grader: the rule
// turns, the answer is struck, and the reason is said once.
export const Refused: Story = {
  args: { kind: 'reading', label: COPY.prompt.reading },
  play: async ({ canvasElement }) => {
    await userEvent.type(
      within(canvasElement).getByLabelText(COPY.prompt.reading),
      'descendre{Enter}',
    )
  },
}

// Judged and still on the screen, which is what an answer that did not stand looks like: the
// question stops being asked and the word above it is struck. Typed rather than posed, because
// an empty rule struck through is a state the reader never reaches.
export const Judged: Story = {
  args: { kind: 'meaning', label: COPY.prompt.meaning, judged: true },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText(COPY.prompt.meaning), 'la terre')
  },
}
