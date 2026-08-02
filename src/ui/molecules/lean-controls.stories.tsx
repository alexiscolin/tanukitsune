'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { Ask, ChoiceRail, ScrubDial, StepRail, ToggleLine } from '@/ui/molecules/lean-controls'
import { GhostAction } from '@/ui/atoms/session-chrome'
import { ScreenShell } from '@/ui/atoms/screen-shell'

// The bar every step of the sequence ends on: what steps back, quiet, and what continues,
// with the dot before it. Written once here because all three steps carry it.
function StepBar() {
  return (
    <div className="pb-safe flex items-center justify-between pt-10">
      <GhostAction emphasis="quiet" onClick={() => {}}>
        Retour
      </GhostAction>
      <GhostAction onClick={() => {}}>Continuer</GhostAction>
    </div>
  )
}

// The onboarding vocabulary, assembled the way a step of the sequence would assemble it.
// Every control here is stateful in use, so each story holds the state rather than passing a
// frozen value: a ruler that cannot move and a switch that cannot flip say nothing about how
// either reads.

const meta = {
  title: 'sketches/lean-controls',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

// What a step of the sequence looks like whole: the rail at the top, the question, the
// control, and nothing else on the screen.
export const IntentStep: Story = {
  render: function IntentStep() {
    const [value, setValue] = useState('jlpt')

    return (
      <ScreenShell>
        <div className="pt-safe pb-10">
          <StepRail step={1} total={7} />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-12">
          <Ask
            eyebrow="intention"
            title="Qu'est-ce que tu veux pouvoir faire en japonais ?"
            hint="Cela détermine l'ordre dans lequel les cartes te sont présentées."
          />
          <ChoiceRail
            label="Intention"
            value={value}
            onChange={setValue}
            options={[
              { value: 'voyage', glyph: '旅', label: 'Voyager au Japon', meta: 'Vocabulaire du quotidien et des transports' },
              { value: 'jlpt', glyph: '試', label: 'Passer le JLPT', meta: 'Programme officiel, kanji et grammaire par niveau' },
              { value: 'travail', glyph: '仕', label: 'Travailler en japonais', meta: 'Registre formel, keigo et écrits professionnels' },
              { value: 'vo', glyph: '趣', label: 'Lire et regarder en VO', meta: 'Manga, romans, séries' },
            ]}
          />
        </div>
        <StepBar />
      </ScreenShell>
    )
  },
}

// The ruler. Its whole point is that it is dragged, so this one is worth grabbing rather
// than looking at.
export const RhythmStep: Story = {
  render: function RhythmStep() {
    const [cards, setCards] = useState(12)

    return (
      <ScreenShell>
        <div className="pt-safe pb-10">
          <StepRail step={3} total={7} />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-14">
          <Ask
            eyebrow="rythme"
            title="Combien de cartes nouvelles par jour ?"
            hint="Fais glisser. La régularité compte plus que le volume, et tu pourras ajuster à tout moment."
          />
          <ScrubDial
            label="Cartes nouvelles par jour"
            value={cards}
            onChange={setCards}
            min={1}
            max={40}
            unit="cartes / jour"
            caption={`environ ${Math.round(cards * 2.1)} min de révision quotidienne`}
          />
        </div>
        <StepBar />
      </ScreenShell>
    )
  },
}

// Four settings, four lines. What says a setting is on is that its label stops being dimmed.
export const SettingsStep: Story = {
  render: function SettingsStep() {
    const [on, setOn] = useState<Record<string, boolean>>({
      furigana: true,
      audio: true,
      ia: true,
      rappel: false,
    })
    const set = (key: string) => (checked: boolean) => setOn({ ...on, [key]: checked })

    return (
      <ScreenShell>
        <div className="pt-safe pb-10">
          <StepRail step={4} total={7} />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-10">
          <Ask
            eyebrow="réglages"
            title="Comment veux-tu réviser ?"
            hint="Quatre détails, modifiables plus tard dans les préférences."
          />
          <div className="flex flex-col">
            <ToggleLine
              label="Afficher les furigana"
              hint="Les lectures au-dessus des kanji, jusqu'à ce que tu les connaisses"
              checked={on.furigana ?? false}
              onChange={set('furigana')}
            />
            <ToggleLine
              label="Prononciation audio"
              hint="Voix native jouée à la révélation de chaque carte"
              checked={on.audio ?? false}
              onChange={set('audio')}
            />
            <ToggleLine
              label="Correction par IA"
              hint="Tes traductions libres sont évaluées sur le sens, pas au mot près"
              checked={on.ia ?? false}
              onChange={set('ia')}
            />
            <ToggleLine
              label="Rappel quotidien"
              hint="Une seule notification, à l'heure où tu révises d'habitude"
              checked={on.rappel ?? false}
              onChange={set('rappel')}
            />
          </div>
        </div>
        <StepBar />
      </ScreenShell>
    )
  },
}
