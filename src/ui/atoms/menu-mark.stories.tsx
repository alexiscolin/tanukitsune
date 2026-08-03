import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { MenuMark } from './menu-mark'

// One state, and what there is to look at is what the three hairlines do under the pointer.
const meta = { component: MenuMark } satisfies Meta<typeof MenuMark>

export default meta

type Story = StoryObj<typeof meta>

export const Mark: Story = {}
