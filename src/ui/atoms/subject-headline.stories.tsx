import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { KANJI, VERB } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectHeadline } from './subject-headline'

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

// A gloss the source shows and refuses as an answer, qualified under the line rather than given
// a heading of its own. Posed rather than taken from the deck, which carries none: the six the
// deck refuses are readings, and this line is about meanings.
export const AlsoShown: Story = {
  args: {
    subject: {
      ...VERB,
      meanings: [...VERB.meanings, { text: 'sortir quelque chose', primary: false, accepted: false }],
    },
    asked: 'meaning',
  },
}
