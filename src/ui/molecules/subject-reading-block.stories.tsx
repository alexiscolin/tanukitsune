import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { KANJI, VERB } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectReadingBlock } from './subject-reading-block'

const meta = {
  component: SubjectReadingBlock,
  args: { copy: copyFor('fr').subject },
} satisfies Meta<typeof SubjectReadingBlock>

export default meta

type Story = StoryObj<typeof meta>

// Eight readings across two kinds, of which two are accepted and six are taught without being
// answers, which is the block that exists for readings nobody may answer with.
export const TwoKinds: Story = { args: { readings: KANJI.readings } }

// A reading the convention gives no kind, which takes the plain label rather than one of the
// two the script would otherwise say for itself.
export const PlainKind: Story = { args: { readings: VERB.readings } }

// Nothing to group, so no block is drawn at all.
export const None: Story = { args: { readings: [] } }
