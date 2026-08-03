import type { Meta, StoryObj } from '@storybook/nextjs-vite'

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

// The rule through the words says refused, and it says it alone: an opacity over the top would
// put them under the contrast floor to repeat what the rule already carries.
export const Struck: Story = {
  args: { label: COPY.never, values: ['retirer', 'sortir quelque chose'], struck: true },
}

// Nothing to say, so nothing is drawn, not a heading over an empty line.
export const Empty: Story = { args: { label: COPY.synonyms, values: [] } }
