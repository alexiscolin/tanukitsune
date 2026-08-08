import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DEMO_DECK, DEMO_SUBJECTS_ASKED } from '@/core/demo-deck'
import { sessionPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'

import { SessionStart } from './session-start'

// Three states, because the screen has three: something is waiting, nothing is, and nobody has
// counted yet. The second is not a rare one, it is every screen after the last review of the day,
// and it is the one where a row has to say so without offering a way into an empty deck. The third
// is every first paint, since the counts are asked for rather than rendered into the document.
const COPY = copyFor('fr')

const meta = {
  component: SessionStart,
  parameters: { fullBleed: true },
  args: {
    title: COPY.title,
    tagline: COPY.tagline,
    copy: COPY.start,
    demo: true,
    pending: false,
    queues: {
      lesson: { count: DEMO_DECK.length, href: sessionPath('fr', 'lesson') },
      review: { count: DEMO_SUBJECTS_ASKED, href: sessionPath('fr', 'review') },
    },
  },
} satisfies Meta<typeof SessionStart>

export default meta

type Story = StoryObj<typeof meta>

export const Waiting: Story = {}

// An account of one's own, where the line about nothing leaving the device would be a promise
// the session breaks.
export const Account: Story = {
  args: { demo: false, queues: { lesson: { count: 128, href: '#' }, review: { count: 1300, href: '#' } } },
}

// Nobody has counted yet. A zero here would tell the reader they are done before anything looked,
// so the row shows a figure dash and offers no way in.
export const Counting: Story = {
  args: { pending: true },
}

export const NothingLeft: Story = {
  args: {
    queues: {
      lesson: { count: 0, href: sessionPath('fr', 'lesson') },
      review: { count: 0, href: sessionPath('fr', 'review') },
    },
  },
}
