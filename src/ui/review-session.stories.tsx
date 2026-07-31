import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { userEvent, within } from 'storybook/test'

import { DEMO_QUEUE } from '@/core/demo-queue'
import { copyFor } from '@/core/site-copy'

import { ReviewSession } from './review-session'

// The deck and the copy the application runs on, not a fixture written beside them. A
// catalogue rendering invented data stops describing the product the day the two diverge.
const COPY = copyFor('fr').review
const MEANING = DEMO_QUEUE.filter((entry) => entry.kind === 'meaning').slice(0, 1)
const READING = DEMO_QUEUE.filter((entry) => entry.kind === 'reading').slice(0, 1)

// The states are held in the session's own state, so a story types and clicks its way to
// one rather than passing it in. This is affordable because the cascade runs with no judge
// in v0.1: it is a string comparison, and every state follows from a chosen answer.
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

// A reading the exact tier cannot match is wrong rather than undecided, which is the one
// place the cascade decides without a judge.
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
