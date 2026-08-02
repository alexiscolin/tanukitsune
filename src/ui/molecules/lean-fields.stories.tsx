'use client'

import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { CodeField, ConsentLine, LeanInput, SecretField } from '@/ui/molecules/lean-fields'
import { Ask, StepRail } from '@/ui/molecules/lean-controls'
import { GhostAction } from '@/ui/atoms/session-chrome'
import { ScreenShell } from '@/ui/atoms/screen-shell'

// The signup vocabulary, assembled the way a step of the sequence would assemble it. Every
// field here is stateful in use, so each story holds the state: a rule that cannot ink and a
// ladder that cannot climb say nothing about how either reads.

const meta = {
  title: 'sketches/lean-fields',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

function Step({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <ScreenShell>
      <div className="pt-safe pb-10">
        <StepRail step={step} total={7} />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-12">{children}</div>
      <div className="pb-safe flex items-center justify-between pt-10">
        <GhostAction emphasis="quiet" onClick={() => {}}>
          Retour
        </GhostAction>
        <GhostAction onClick={() => {}}>Continuer</GhostAction>
      </div>
    </ScreenShell>
  )
}

export const IdentityStep: Story = {
  render: function IdentityStep() {
    const [name, setName] = useState('')
    const [mail, setMail] = useState('')

    return (
      <Step step={5}>
        <Ask
          eyebrow="identité"
          title="Comment doit-on t'appeler ?"
          hint="Ton prénom apparaît sur tes bilans hebdomadaires. Rien n'est public."
        />
        <div className="flex flex-col gap-10">
          <LeanInput
            label="Prénom"
            value={name}
            onChange={setName}
            placeholder="Hanako"
            autoComplete="given-name"
            error={name.length > 0 && name.length < 2 ? 'Deux caractères au minimum.' : undefined}
          />
          <LeanInput
            label="Adresse e-mail"
            type="email"
            value={mail}
            onChange={setMail}
            placeholder="hanako@exemple.jp"
            autoComplete="email"
            hint="Sert à synchroniser ta progression entre tes appareils."
          />
        </div>
      </Step>
    )
  },
}

export const SecurityStep: Story = {
  render: function SecurityStep() {
    const [secret, setSecret] = useState('')
    const [agreed, setAgreed] = useState(false)

    return (
      <Step step={6}>
        <Ask
          eyebrow="sécurité"
          title="Protège ta progression."
          hint="Un mot de passe solide suffit, nous n'exigeons ni majuscule ni symbole imposé."
        />
        <div className="flex flex-col gap-10">
          <SecretField
            label="Mot de passe"
            value={secret}
            onChange={setSecret}
            reveal="Afficher"
            hide="Masquer"
            strength={['', 'Fragile', 'Correct', 'Solide', 'Excellent']}
            error={
              secret.length > 0 && secret.length < 8
                ? 'Huit caractères minimum, en mêlant lettres et chiffres.'
                : undefined
            }
          />
          <ConsentLine
            checked={agreed}
            onChange={setAgreed}
            error={agreed ? undefined : 'Nécessaire pour créer ton compte.'}
          >
            J'accepte les conditions d'utilisation et la politique de confidentialité.
          </ConsentLine>
        </div>
      </Step>
    )
  },
}

export const CodeStep: Story = {
  render: function CodeStep() {
    const [code, setCode] = useState('')

    return (
      <Step step={7}>
        <Ask
          eyebrow="vérification"
          title="Entre le code reçu."
          hint="Six chiffres, valables dix minutes."
        />
        <CodeField
          label="Code de vérification"
          value={code}
          onChange={setCode}
          length={6}
          error={code.length === 6 && code !== '123456' ? 'Ce code ne correspond pas.' : undefined}
        />
      </Step>
    )
  },
}
