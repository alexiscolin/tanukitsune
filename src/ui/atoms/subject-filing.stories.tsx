import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { KANJI } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectFiling } from './subject-filing'

// Where the card sits, last in the sheet and reached only by reading past everything else. The
// band is the one thing on it that is the reader's rather than the subject's, and its colour is
// the mastery ramp, so it is read before the word is.
const meta = {
  component: SubjectFiling,
  args: { copy: copyFor('fr').subject },
} satisfies Meta<typeof SubjectFiling>

export default meta

type Story = StoryObj<typeof meta>

// Never studied, so there is no band to name and the line is the subject's alone.
export const Unstudied: Story = { args: { subject: KANJI } }

export const Apprentice: Story = { args: { subject: { ...KANJI, srsStage: 2 } } }

export const Guru: Story = { args: { subject: { ...KANJI, srsStage: 5 } } }

// The far end of the ramp, where the colour has receded to the colour of the text.
export const Burned: Story = { args: { subject: { ...KANJI, srsStage: 9 } } }

// The level a redistributable mapping would add, which the source does not send.
export const WithJlpt: Story = { args: { subject: { ...KANJI, jlpt: 'N5', srsStage: 5 } } }
