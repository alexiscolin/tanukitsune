import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { LONG, VERB } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectSentences } from './subject-sentences'

const COPY = copyFor('fr').subject

const meta = { component: SubjectSentences } satisfies Meta<typeof SubjectSentences>

export default meta

type Story = StoryObj<typeof meta>

// Each line arrives after the one above it, which is what the staggered delay is for.
export const Several: Story = { args: { label: COPY.sentences, sentences: VERB.sentences } }

export const One: Story = { args: { label: COPY.sentences, sentences: LONG.sentences } }

export const Empty: Story = { args: { label: COPY.sentences, sentences: [] } }
