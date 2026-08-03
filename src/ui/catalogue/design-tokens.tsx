'use client'

import type { ReactNode } from 'react'

import type { Band, SubjectType } from '@/core/subject'

// The tokens against each other, which is the one thing about them no gate can hold.
// `scripts/check-contrast.mjs` weighs every ink on every ground and says whether a pair is
// readable; whether the ramp still reads as a ramp, and whether two subject types are still
// told apart at a dot's size, is a question only a person looking at them answers.
//
// Rendered from the custom properties rather than from a copy of their values, so a token that
// changes changes here, and a token added without a line below is missing from the page rather
// than wrong on it. The two lists the product keys on a union are typed by that union instead,
// which is the half of that gap the compiler can close.

type Swatch = { readonly label: string; readonly token: string }

// The more an item is known, the further its colour recedes toward the colour of the text.
const RAMP: Record<Band, string> = {
  lesson: '--color-srs-lesson',
  apprentice: '--color-srs-apprentice',
  guru: '--color-srs-guru',
  master: '--color-srs-master',
  enlightened: '--color-srs-enlightened',
  burned: '--color-srs-burned',
}

// Blue for the building block, pink for the character, purple for the word.
const TYPES: Record<SubjectType, string> = {
  radical: '--color-radical',
  kanji: '--color-kanji',
  vocabulary: '--color-vocab',
  kanaVocabulary: '--color-kana-vocab',
  grammar: '--color-grammar',
  conjugation: '--color-conjugation',
}

function swatchesOf(tokens: Record<string, string>): readonly Swatch[] {
  return Object.entries(tokens).map(([label, token]) => ({ label, token }))
}

const GROUPS: readonly { readonly title: string; readonly swatches: readonly Swatch[] }[] = [
  {
    title: 'Ground and ink',
    swatches: [
      { label: 'canvas', token: '--color-canvas' },
      { label: 'surface', token: '--color-surface' },
      { label: 'surface raised', token: '--color-surface-raised' },
      { label: 'surface sunken', token: '--color-surface-sunken' },
      { label: 'ink', token: '--color-ink' },
      { label: 'ink muted', token: '--color-ink-muted' },
      { label: 'hairline', token: '--color-hairline' },
    ],
  },
  {
    title: 'The accent, spent once per screen',
    swatches: [
      { label: 'brand', token: '--color-brand' },
      { label: 'brand soft', token: '--color-brand-soft' },
      { label: 'sunrise', token: '--color-sunrise' },
      { label: 'ring', token: '--color-ring' },
    ],
  },
  {
    title: 'What a verdict is allowed',
    swatches: [
      { label: 'success', token: '--color-success' },
      { label: 'on success', token: '--color-success-foreground' },
      { label: 'destructive', token: '--color-destructive' },
    ],
  },
  { title: 'The mastery ramp, receding toward the ink', swatches: swatchesOf(RAMP) },
  { title: 'The one categorical use of colour', swatches: swatchesOf(TYPES) },
]

// Two ends and almost nothing between them, which is the claim these lists are here to be
// judged against. Each holds the utility that spends the token rather than the token's value.
type Step = { readonly label: string; readonly spends: string }

const SCALE: readonly Step[] = [
  { label: '2xs', spends: 'text-2xs' },
  { label: 'xs', spends: 'text-xs' },
  { label: 'sm', spends: 'text-sm' },
  { label: 'base', spends: 'text-base' },
  { label: 'lg', spends: 'text-lg' },
  { label: 'xl', spends: 'text-xl' },
  { label: '2xl', spends: 'text-2xl' },
  { label: '3xl', spends: 'text-3xl' },
  { label: '4xl', spends: 'text-4xl' },
  { label: '5xl', spends: 'text-5xl' },
  { label: '6xl', spends: 'text-6xl' },
]

const RADII: readonly Step[] = [
  { label: 'xs', spends: 'rounded-xs' },
  { label: 'sm', spends: 'rounded-sm' },
  { label: 'md', spends: 'rounded-md' },
  { label: 'lg', spends: 'rounded-lg' },
  { label: 'xl', spends: 'rounded-xl' },
  { label: '2xl', spends: 'rounded-2xl' },
  { label: '3xl', spends: 'rounded-3xl' },
  { label: '4xl', spends: 'rounded-4xl' },
]

// The whole entrance vocabulary: six pixels and a blur, and two things that never stop.
const MOTION: readonly Step[] = [
  { label: 'drift, on ease-out-soft', spends: 'animate-drift' },
  { label: 'breathe, on ease-in-out-soft', spends: 'animate-breathe' },
  { label: 'pulse, on ease-in-out-soft', spends: 'animate-pulse-dot' },
]

// The four that are not a colour, a size or a curve: the one shadow the interface spends, the
// blur that is meant not to be seen as blur, the edge a scrolling sheet fades under, and the
// padding that edge owes its content, which is what keeps the last line clear of the fade.
const EDGES: readonly Step[] = [
  { label: 'shadow card', spends: 'rounded-2xl bg-[var(--color-surface)] shadow-card' },
  { label: 'masked edge and its padding', spends: 'mask-fade-b pb-fade bg-[var(--color-ink-muted)]' },
]

function Heading({ title }: { title: string }) {
  return <h2 className="eyebrow text-[var(--color-ink-muted)]">{title}</h2>
}

// One shape for every sample on the page, so a caption that changes changes once and the tiles
// stay in a row with each other.
function Sample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex w-24 flex-col gap-1.5">
      {children}
      <span className="text-2xs leading-none text-[var(--color-ink-muted)]">{label}</span>
    </span>
  )
}

export function DesignTokens() {
  return (
    <div className="flex flex-col gap-10 pb-10">
      {GROUPS.map((group) => (
        <section key={group.title} className="flex flex-col gap-3">
          <Heading title={group.title} />
          <div className="flex flex-wrap gap-4">
            {group.swatches.map((swatch) => (
              <Sample key={swatch.token} label={swatch.label}>
                <span
                  className="h-12 w-full rounded-md border border-[var(--color-hairline)]"
                  style={{ background: `var(${swatch.token})` }}
                />
              </Sample>
            ))}
          </div>
        </section>
      ))}

      <section className="flex flex-col gap-3">
        <Heading title="The type scale" />
        {SCALE.map((step) => (
          <span key={step.label} className="flex items-baseline gap-4">
            <span className="text-2xs w-10 shrink-0 text-[var(--color-ink-muted)]">
              {step.label}
            </span>
            {/* The glyph carries the language and the word does not, so the Japanese stack
                applies where it belongs and a screen reader is not told that a French word is
                Japanese. */}
            <span className={step.spends}>
              <span lang="ja">下</span> descendre
            </span>
          </span>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <Heading title="The radii, one value and its multiples" />
        <div className="flex flex-wrap items-end gap-4">
          {RADII.map((step) => (
            <Sample key={step.label} label={step.label}>
              <span className={`h-12 w-full bg-[var(--color-surface-sunken)] ${step.spends}`} />
            </Sample>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Heading title="Motion, on three curves" />
        <div className="flex flex-wrap gap-4">
          {MOTION.map((step) => (
            <Sample key={step.label} label={step.label}>
              <span className={`size-4 rounded-full bg-[var(--color-brand)] ${step.spends}`} />
            </Sample>
          ))}
        </div>
        {/* The third curve is spent on a transition rather than on an animation, so it is named
            here: nothing on a page that holds still can show it. */}
        <p className="text-2xs text-[var(--color-ink-muted)]">
          ease-spring, on the dot under the deck strip
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <Heading title="Elevation, edge and letter" />
        <div className="flex flex-wrap items-start gap-4">
          {EDGES.map((step) => (
            <Sample key={step.label} label={step.label}>
              <span className={`h-12 w-full ${step.spends}`} />
            </Sample>
          ))}
          <Sample label="blur hair">
            <span lang="ja" className="blur-hair h-12 text-4xl leading-none">
              下
            </span>
          </Sample>
          <Sample label="sans, and jp where a glyph is">
            <span className="h-12 text-lg leading-none">
              Descendre <span lang="ja">下がる</span>
            </span>
          </Sample>
        </div>
      </section>
    </div>
  )
}
