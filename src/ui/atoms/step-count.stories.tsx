import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { StepCount } from './step-count'

const meta = { component: StepCount } satisfies Meta<typeof StepCount>

export default meta

type Story = StoryObj<typeof meta>

export const Opening: Story = { args: { step: 1, total: 12 } }

// Where the digits stop being one column wide, which is what the tabular figures are for.
export const TwoDigits: Story = { args: { step: 47, total: 120 } }

export const Last: Story = { args: { step: 12, total: 12 } }
