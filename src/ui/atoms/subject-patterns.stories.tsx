import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { VERB } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectPatterns } from './subject-patterns'

const COPY = copyFor('fr').subject

// What a list of meanings never teaches: which particle follows the word and what it takes.
const meta = { component: SubjectPatterns } satisfies Meta<typeof SubjectPatterns>

export default meta

type Story = StoryObj<typeof meta>

export const Patterns: Story = { args: { label: COPY.patterns, patterns: VERB.patterns } }

// A subject our corpus has not written a pattern for, which is most of them today.
export const Empty: Story = { args: { label: COPY.patterns, patterns: [] } }
