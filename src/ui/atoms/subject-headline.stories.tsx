import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { KANJI, VERB } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectHeadline } from './subject-headline'

// The answer where the eye already is, with no heading over it: on a card that has just opened
// it is the one thing the reader came for. What it carries depends on which question was put.
const meta = {
  component: SubjectHeadline,
  args: { copy: copyFor('fr').subject },
} satisfies Meta<typeof SubjectHeadline>

export default meta

type Story = StoryObj<typeof meta>

// Asked for a meaning, so the headline is the meanings, joined by commas.
export const Meaning: Story = { args: { subject: KANJI, asked: 'meaning' } }

// Asked for a reading, so it is the readings, set in Japanese and separated by the middle dot.
export const Reading: Story = { args: { subject: KANJI, asked: 'reading' } }

// The glosses the source lists without accepting, qualified under the line rather than given a
// heading of their own. A lesson puts no question at all, which reaches the same branch: only a
// reading asked for is what this component turns on.
export const AlsoShown: Story = { args: { subject: VERB, asked: 'meaning' } }
