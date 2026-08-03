import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { userEvent, within } from 'storybook/test'

import { DEMO_QUESTIONS, KANJI } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { QuestionCard } from './question-card'

// The card as a question: the field under the character until something has been said about it,
// and gone once it was right, because there is then nothing left to compare it against.
const COPY = copyFor('fr')

// Named rather than taken from the head of the deck, since the answers typed below are this
// subject's. The deck is a fixture this repository writes, so the pair it is asked for is there.
const MEANING =
  DEMO_QUESTIONS.find((asked) => asked.subject.id === KANJI.id && asked.kind === 'meaning') ??
  DEMO_QUESTIONS[0]

const meta = {
  component: QuestionCard,
  args: {
    question: MEANING,
    copy: COPY.review,
    subjectCopy: COPY.subject,
    onReveal: () => {},
    onSubmit: () => {},
    onEdit: () => {},
  },
} satisfies Meta<typeof QuestionCard>

export default meta

type Story = StoryObj<typeof meta>

// Nothing said yet: the character, the rule to write on, and the dot as the way out.
export const Asked: Story = { args: { answered: false, decided: null } }

// Right, so the field leaves with the answer and the sheet opens under the character alone.
export const Correct: Story = { args: { answered: true, decided: 'correct' } }

// Wrong, where the answer stays on the screen struck, beside what was wanted. What was written
// is typed rather than posed: an empty rule struck through is a state the reader never reaches.
export const Incorrect: Story = {
  args: { answered: true, decided: 'incorrect' },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText(COPY.review.prompt.meaning), 'le haut')
  },
}

// No tier could place it, so the card opens and the ruling is handed back to the reader.
export const Undecided: Story = {
  args: { answered: true, decided: null },
  play: async ({ canvasElement }) => {
    await userEvent.type(
      within(canvasElement).getByLabelText(COPY.review.prompt.meaning),
      'la terre battue',
    )
  },
}
