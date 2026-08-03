import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SubjectCard } from './subject-card'
import { IMAGED, KANA_VOCABULARY, KANJI, LONG, MANY, VERB } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

// One story per shape the source really sends, so every branch of the card is rendered rather
// than reasoned about. The six subjects are taken from levels one to five and each is here
// for the case it breaks.

const meta = {
  component: SubjectCard,
  parameters: { layout: 'fullscreen' },
  args: { flow: 'lesson' as const, revealed: true, copy: copyFor('fr').subject },
  decorators: [
    (Story) => (
      <div className="h-screen-safe -m-6 flex flex-col bg-[var(--color-canvas)] p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SubjectCard>

export default meta

type Story = StoryObj<typeof meta>

// Eight readings, of which two are accepted and six are taught without being answers.
export const ManyReadings: Story = { args: { subject: KANJI } }

// Five meanings on one line, and two answers the source refuses outright.
export const ManyMeanings: Story = { args: { subject: VERB } }

// Six characters, which is what decides the size of the glyph.
export const LongWord: Story = { args: { subject: LONG } }

// Four parts of speech, and six accepted synonyms that never reach the card.
export const ManyParts: Story = { args: { subject: MANY } }

// No character at all: a vector served by the source, the one glyph that is not text.
export const NoCharacter: Story = { args: { subject: IMAGED } }

// Written in kana, so its characters are its own reading and it has no reading block.
export const KanaOnly: Story = { args: { subject: KANA_VOCABULARY } }

// Recall rather than teaching: the card is held back, and the dot is the only way through.
export const ReviewFaceDown: Story = {
  args: { subject: VERB, flow: 'review', revealed: false, onReveal: () => {} },
}

export const ReviewRevealed: Story = {
  args: { subject: VERB, flow: 'review', revealed: true, onReveal: () => {} },
}
