import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { KANJI } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectProse } from './subject-prose'

const COPY = copyFor('fr').subject

const meta = { component: SubjectProse } satisfies Meta<typeof SubjectProse>

export default meta

type Story = StoryObj<typeof meta>

export const Nuance: Story = { args: { label: COPY.nuance, text: KANJI.nuance } }

export const Mnemonic: Story = { args: { label: COPY.mnemonic, text: KANJI.mnemonic } }

// Where the measure is decided: the corpus writes what a gloss drops, and it runs long.
export const LongRun: Story = {
  args: {
    label: COPY.nuance,
    text: "La position et non le mouvement : ce caractère dit ce qui se trouve dessous, et descendre demande un verbe qui porte l'action, pas ce caractère seul. Il est aussi ce qui se donne du haut vers le bas, ce qui explique les lectures qu'une liste de sens ne prépare pas.",
  },
}

// A field the corpus has not written yet draws nothing, not a heading over a blank.
export const Absent: Story = { args: { label: COPY.mnemonic, text: null } }
