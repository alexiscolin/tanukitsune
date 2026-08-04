import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'

import { startPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'

import { SessionDone } from './session-done'

const meta = {
  component: SessionDone,
  parameters: { fullBleed: true },
  args: { copy: copyFor('fr').review, exitTo: startPath('fr') },
} satisfies Meta<typeof SessionDone>

export default meta

type Story = StoryObj<typeof meta>

// One state, because the other draws the same heading: what the second would carry is a focus
// move, which paints nothing and so is asserted rather than looked at. A deck that arrived with
// nothing in it was never a session, and that is the case where nothing takes the focus.
export const Reached: Story = {
  args: { reached: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { level: 1 })).toHaveFocus()
  },
}
