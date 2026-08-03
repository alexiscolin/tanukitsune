import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DesignTokens } from './design-tokens'

// One page and one state: the tokens have no variation of their own, and the two things that
// change what they are worth are the theme and the viewport, which are controls rather than
// stories here as everywhere else in the catalogue.
const meta = { component: DesignTokens } satisfies Meta<typeof DesignTokens>

export default meta

type Story = StoryObj<typeof meta>

export const Tokens: Story = {}
