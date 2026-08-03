import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { VERB } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { SubjectPatterns } from './subject-patterns'

const meta = {
  component: SubjectPatterns,
  args: { label: copyFor('fr').subject.patterns },
} satisfies Meta<typeof SubjectPatterns>

export default meta

type Story = StoryObj<typeof meta>

export const Patterns: Story = { args: { patterns: VERB.patterns } }

// A subject our corpus has not written a pattern for, which is most of them today.
export const Empty: Story = { args: { patterns: [] } }
