import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { KANJI } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectFiling } from './subject-filing'

const meta = {
  component: SubjectFiling,
  args: { copy: copyFor('fr').subject },
} satisfies Meta<typeof SubjectFiling>

export default meta

type Story = StoryObj<typeof meta>

// Never studied, so there is no band to name and the line is the subject's alone.
export const Unstudied: Story = { args: { subject: KANJI } }

// One banded state is what this line has to show: the ramp as a ramp is on the token page, and
// every rung of it is weighed on every ground by scripts/check-contrast.mjs.
export const Banded: Story = { args: { subject: { ...KANJI, srsStage: 5 } } }

// The level the source does not send, absent until a redistributable mapping names it. Every
// other state on this page carries one, so this is the segment missing rather than present.
export const NoJlpt: Story = { args: { subject: { ...KANJI, jlpt: null, srsStage: 5 } } }
