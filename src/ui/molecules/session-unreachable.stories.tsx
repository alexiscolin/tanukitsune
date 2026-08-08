import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'

import { startPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'

import { SessionUnreachable } from './session-unreachable'

const meta = {
  component: SessionUnreachable,
  parameters: { fullBleed: true },
  args: { copy: copyFor('fr').review, exitTo: startPath('fr') },
} satisfies Meta<typeof SessionUnreachable>

export default meta

type Story = StoryObj<typeof meta>

// One state, because the screen has one: what it says does not vary with what failed. The way out
// is what is asserted, since a screen a reader cannot leave is the failure this state could
// otherwise become.
export const Offline: Story = {
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)

    await expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      copyFor('fr').review.unreachable,
    )
    await expect(screen.getByRole('link')).toHaveAttribute('href', startPath('fr'))
  },
}
