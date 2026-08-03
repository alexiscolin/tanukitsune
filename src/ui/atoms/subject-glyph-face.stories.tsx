import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { IMAGED, KANA_VOCABULARY, KANJI, LONG, VERB } from '@/core/demo-deck'

import { SubjectGlyphFace } from './subject-glyph-face'

// A single character is the whole screen, and a word gives that room back per character it
// adds. The size is read off the length rather than off the type, because the type does not
// predict it, which is what the four states below show.
const meta = { component: SubjectGlyphFace } satisfies Meta<typeof SubjectGlyphFace>

export default meta

type Story = StoryObj<typeof meta>

export const OneCharacter: Story = { args: { subject: KANJI } }

export const TwoCharacters: Story = { args: { subject: VERB } }

export const FourCharacters: Story = { args: { subject: KANA_VOCABULARY } }

export const SixCharacters: Story = { args: { subject: LONG } }

// A radical with no Unicode character at all, which arrives as a vector and is the one glyph
// on the card that is not text.
export const Drawn: Story = { args: { subject: IMAGED } }
