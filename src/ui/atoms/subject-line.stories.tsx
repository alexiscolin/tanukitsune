import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { VERB } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectLine } from './subject-line'

const COPY = copyFor('fr').subject

const meta = { component: SubjectLine } satisfies Meta<typeof SubjectLine>

export default meta

type Story = StoryObj<typeof meta>

export const OneValue: Story = { args: { label: COPY.meaning, values: ['descendre'] } }

export const Several: Story = {
  args: { label: COPY.synonyms, values: ['baisser', 'abaisser', 'faire descendre'] },
}

// The one state that draws a rule through what it lists.
export const Struck: Story = {
  args: { label: COPY.never, values: VERB.refused, struck: true },
}

// Nothing to say, so nothing is drawn, not a heading over an empty line.
export const Empty: Story = { args: { label: COPY.synonyms, values: [] } }
