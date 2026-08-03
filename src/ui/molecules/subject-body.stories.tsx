import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { KANJI, MANY, VERB } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectBody } from './subject-body'

const meta = {
  component: SubjectBody,
  args: { copy: copyFor('fr').subject },
} satisfies Meta<typeof SubjectBody>

export default meta

type Story = StoryObj<typeof meta>

// Teaching, where the answers the source refuses outright are part of the lesson.
export const Lesson: Story = { args: { subject: VERB, flow: 'lesson' } }

// Recall, where those same answers would be the answer, so they are not shown.
export const Review: Story = { args: { subject: VERB, flow: 'review', asked: 'meaning' } }

// Asked for a reading, so the meaning is what the reader still has to be told and takes a
// heading here rather than the middle.
export const AskedReading: Story = { args: { subject: KANJI, flow: 'review', asked: 'reading' } }

// The heaviest shape the source sends: four parts of speech and six accepted synonyms.
export const Loaded: Story = { args: { subject: MANY, flow: 'lesson' } }
