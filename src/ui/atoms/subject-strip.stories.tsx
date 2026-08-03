import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { KANJI, MANY } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectStrip } from './subject-strip'

const COPY = copyFor('fr').subject

// Glyphs rather than a list: the reader has to see the pieces to recognise them in the next
// character, and their meanings sit under them at label size.
const meta = { component: SubjectStrip } satisfies Meta<typeof SubjectStrip>

export default meta

type Story = StoryObj<typeof meta>

export const Components: Story = {
  args: { label: COPY.components, parts: KANJI.components },
}

// The relation the other way: what this one is a piece of.
export const UsedIn: Story = { args: { label: COPY.usedIn, parts: KANJI.usedIn } }

// Enough of them to wrap, which is where the row decides its own rhythm. Drawn from three
// subjects rather than by repeating one, since the row keys on the part and a piece sent twice
// is one key twice.
export const Wrapping: Story = {
  args: { label: COPY.usedIn, parts: [...KANJI.components, ...KANJI.usedIn, ...MANY.components] },
}

export const Empty: Story = { args: { label: COPY.similar, parts: [] } }
