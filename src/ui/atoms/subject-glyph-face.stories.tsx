import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { IMAGED, KANJI, LONG, VERB } from '@/core/demo-deck'

import { SubjectGlyphFace } from './subject-glyph-face'

const meta = { component: SubjectGlyphFace } satisfies Meta<typeof SubjectGlyphFace>

export default meta

type Story = StoryObj<typeof meta>

// The four sizes, one story each. The length is what decides, and the type does not predict
// it, so each of these is a length rather than a kind of subject.
export const OneCharacter: Story = { args: { subject: KANJI } }

export const TwoCharacters: Story = { args: { subject: VERB } }

// Three or four, which no subject in the deck happens to be, so it is posed by cutting one.
export const FourCharacters: Story = { args: { subject: { ...LONG, characters: 'テーブル' } } }

// Five and above share the smallest size, which is where a word stops shrinking.
export const SixCharacters: Story = { args: { subject: LONG } }

// A radical with no Unicode character at all, which arrives as a vector and is the one glyph
// on the card that is not text.
export const Drawn: Story = { args: { subject: IMAGED } }
