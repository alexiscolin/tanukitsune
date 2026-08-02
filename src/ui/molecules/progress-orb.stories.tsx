'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ScreenShell } from '@/ui/atoms/screen-shell'
import { ProgressOrb, RadialProgress, SegmentBar } from './progress-orb'

// The progression figures, on the screen they belong to. The counts are the shape of a real
// account rather than round numbers: a ladder whose rungs are all equal says nothing about
// how a ladder of this kind actually looks.

const meta = {
  title: 'sketches/progress-orb',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Orb: Story = {
  render: () => (
    <ScreenShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-12">
        <ProgressOrb value={298} max={500} size="lg" label="298 sur 500" caption="sur 500" />
        <div className="flex items-center gap-8">
          <RadialProgress value={92} max={100} label="92 pour cent de justesse">
            92
          </RadialProgress>
          <RadialProgress value={18} max={30} label="18 jours de suite">
            18
          </RadialProgress>
        </div>
      </div>
    </ScreenShell>
  ),
}

export const Ladder: Story = {
  render: () => (
    <ScreenShell>
      <div className="flex flex-1 flex-col justify-center">
        <SegmentBar
          segments={[
            { band: 'apprentice', glyph: '見習', label: 'Apprenti', count: 46 },
            { band: 'guru', glyph: '熟練', label: 'Confirmé', count: 128 },
            { band: 'master', glyph: '達人', label: 'Maître', count: 74 },
            { band: 'enlightened', glyph: '悟り', label: 'Éclairé', count: 38 },
            { band: 'burned', glyph: '不動', label: 'Gravé', count: 12 },
          ]}
        />
      </div>
    </ScreenShell>
  ),
}
