import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { KANA_VOCABULARY, KANJI, VERB } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectReadingBlock } from './subject-reading-block'

// Grouped by kind and written in the script the convention gives each: katakana for a reading
// borrowed from Chinese, hiragana for one that was already Japanese. A kind whose readings are
// all listed without being accepted still gets a block, because those readings are real.
const meta = {
  component: SubjectReadingBlock,
  args: { copy: copyFor('fr').subject },
} satisfies Meta<typeof SubjectReadingBlock>

export default meta

type Story = StoryObj<typeof meta>

// Eight readings across two kinds, of which two are accepted and six are taught without being
// answers.
export const TwoKinds: Story = { args: { readings: KANJI.readings } }

// One kind, every reading of it accepted.
export const OneKind: Story = { args: { readings: VERB.readings } }

// A word written in kana, whose characters are its own reading, so the kind is untyped.
export const Untyped: Story = { args: { readings: KANA_VOCABULARY.readings } }

// Nothing to group, so no block is drawn at all.
export const None: Story = { args: { readings: [] } }
