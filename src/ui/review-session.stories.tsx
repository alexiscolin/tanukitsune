import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { userEvent, within } from 'storybook/test'

import { DEMO_QUEUE } from '@/core/demo-queue'
import { copyFor } from '@/core/site-copy'

import { ReviewSession } from './review-session'

// The deck and the copy the application runs on, not a fixture written beside them. A
// catalogue rendering invented data stops describing the product the day the two diverge.
const COPY = copyFor('fr').review

// Named rather than taken from the head of the deck, because the answers below are this
// subject's: に is wrong for 一 and right for 二, so a deck reordered around them would
// leave the incorrect verdict rendering a correct one under its own name.
const ICHI = DEMO_QUEUE.filter((entry) => entry.subjectId === 'demo-ichi')
const MEANING = ICHI.filter((entry) => entry.kind === 'meaning')
const READING = ICHI.filter((entry) => entry.kind === 'reading')

// A story types and clicks its way to a state rather than passing it in, for the reason
// docs/decisions/0009-storybook-as-the-review-surface.md gives.
async function answer(canvasElement: HTMLElement, typed: string) {
  const canvas = within(canvasElement)
  await userEvent.type(canvas.getByLabelText(COPY.answerLabel), `${typed}{Enter}`)
}

const meta = {
  component: ReviewSession,
  args: { copy: COPY },
} satisfies Meta<typeof ReviewSession>

export default meta

type Story = StoryObj<typeof meta>

export const Question: Story = {
  args: { queue: MEANING },
}

// Non-kana on a reading, which the field refuses rather than submits.
export const Refusal: Story = {
  args: { queue: READING },
  play: async ({ canvasElement }) => {
    await answer(canvasElement, '123')
  },
}

export const VerdictCorrect: Story = {
  args: { queue: MEANING },
  play: async ({ canvasElement }) => {
    await answer(canvasElement, 'un')
  },
}

// A reading the exact tier cannot match is wrong rather than undecided.
export const VerdictIncorrect: Story = {
  args: { queue: READING },
  play: async ({ canvasElement }) => {
    await answer(canvasElement, 'ni')
  },
}

// A meaning no tier placed, which is undecided by design and hands the item card and the
// grading control to the reader.
export const SelfGrade: Story = {
  args: { queue: MEANING },
  play: async ({ canvasElement }) => {
    await answer(canvasElement, 'quelque chose')
  },
}

export const Done: Story = {
  args: { queue: MEANING },
  play: async ({ canvasElement }) => {
    await answer(canvasElement, 'un')
    await userEvent.click(within(canvasElement).getByRole('button', { name: COPY.next }))
  },
}
