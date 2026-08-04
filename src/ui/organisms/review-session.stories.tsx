import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { userEvent, waitFor, within } from 'storybook/test'

import { copyFor } from '@/core/site-copy'

import { DEMO_QUESTIONS, KANJI } from '@/core/demo-deck'
import { ReviewSession } from './review-session'

// The states of the loop, driven the way a reader reaches them rather than passed in: the
// answer is typed and the verdict is whatever the cascade returns for it.
const COPY = copyFor('fr')

async function answer(canvasElement: HTMLElement, typed: string) {
  const canvas = within(canvasElement)
  await userEvent.type(canvas.getByLabelText(COPY.review.prompt.meaning), `${typed}{Enter}`)
}

// Full bleed rather than the catalogue's ground, which would frame a screen whose whole subject
// is that it has no frame, and push it past the viewport it must fit inside.
const meta = {
  component: ReviewSession,
  args: {
    questions: DEMO_QUESTIONS,
    copy: COPY.review,
    subjectCopy: COPY.subject,
    // The catalogue judges what the screen looks like, so the writer takes every answer here.
    // The state where one refuses is a story of its own below.
    onAnswered: () => Promise.resolve(),
  },
  parameters: { fullBleed: true },
} satisfies Meta<typeof ReviewSession>

export default meta

type Story = StoryObj<typeof meta>

export const Question: Story = {}

// The primary meaning of the first question, which is 下. Taken from the fixture rather than
// remembered: a story typing a word the deck no longer accepts shows the opposite of its own
// name, and says nothing about it.
export const VerdictCorrect: Story = {
  play: async ({ canvasElement }) => {
    await answer(canvasElement, KANJI.meanings[0]?.text ?? '')
  },
}

// A meaning no tier placed, which is undecided by design and hands the card and the gesture
// to the reader. There is no story for a wrong meaning, because v0.1 has no tier that can
// declare one: docs/specs/v0.1.md sends anything the exact tier cannot match to self-grade,
// and only a reading is decided outright. The queue asks every meaning before any reading, so
// that verdict is reachable by playing the deck and not by typing one answer.
export const SelfGrade: Story = {
  play: async ({ canvasElement }) => {
    await answer(canvasElement, 'la terre battue')
  },
}

// Giving up rather than answering: the dot opens the card with nothing to grade.
export const GaveUp: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: COPY.subject.reveal }))
  },
}

// The answer was graded and could not be kept. The card stays where it was, the numbers it was
// not added to stay beside the refusal, and the gesture that failed is the one that retries.
export const Unwritten: Story = {
  args: { onAnswered: () => Promise.reject(new Error('the local queue refused the answer')) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await answer(canvasElement, KANJI.meanings[0]?.text ?? '')
    // The deck holds the focus the moment it will answer to one, so the grading gesture is
    // reached by key rather than by finding the group again.
    await userEvent.keyboard('{ArrowRight}')
    // On the card and in the region that speaks it, which is two nodes holding one sentence.
    await waitFor(() => canvas.getAllByText(COPY.review.unwritten))
  },
}
