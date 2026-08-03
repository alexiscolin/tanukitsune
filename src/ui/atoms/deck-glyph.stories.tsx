import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DeckGlyph } from './deck-glyph'

// Drawn rather than set, so the character recedes to a ratio no text may carry. One em of
// advance per character, which is what decides the width of every state below.
const meta = { component: DeckGlyph } satisfies Meta<typeof DeckGlyph>

export default meta

type Story = StoryObj<typeof meta>

export const Active: Story = { args: { characters: '大', active: true } }

// Behind the reader, blurred and set at a third of the muted ink.
export const Receded: Story = { args: { characters: '大', active: false } }

// Kana are narrower than the em they are given, and the anchor centres what is left over.
export const Word: Story = { args: { characters: 'ください', active: true } }

// A subject with no Unicode character at all reaches the strip as an empty string, and the
// advance is floored at one em so the row does not collapse around it.
export const NoCharacter: Story = { args: { characters: '', active: false } }
