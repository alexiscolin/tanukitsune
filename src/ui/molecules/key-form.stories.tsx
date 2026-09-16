import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { copyFor } from '@/core/site-copy'

import { KeyForm } from './key-form'

const copy = copyFor('fr').start.key

const meta = {
  title: 'Molecules/KeyForm',
  component: KeyForm,
  args: {
    copy,
    held: null,
    onKey: () => Promise.resolve(null),
    onForget: () => Promise.resolve(),
  },
} satisfies Meta<typeof KeyForm>

export default meta

type Story = StoryObj<typeof meta>

// Nothing handed over yet, which is what a reader arriving on the demo meets.
export const Asking: Story = {}

// A key this browser already holds, where the account answers for it and the only control is leaving.
export const Held: Story = { args: { held: { username: 'alexis', level: 7 } } }
