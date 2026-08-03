'use client'

// The tokens against each other, which is the one thing about them no gate can hold.
// `scripts/check-contrast.mjs` weighs every ink on every ground and says whether a pair is
// readable; whether the ramp still reads as a ramp, and whether two subject types are still
// told apart at a dot's size, is a question only a person looking at them answers.
//
// Rendered from the custom properties rather than from a copy of their values, so a token that
// changes changes here, and a token added without a line below is missing from the page rather
// than wrong on it.

type Swatch = { readonly label: string; readonly token: string }

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
  {
    title: 'The mastery ramp, receding toward the ink',
    swatches: [
      { label: 'lesson', token: '--color-srs-lesson' },
      { label: 'apprentice', token: '--color-srs-apprentice' },
      { label: 'guru', token: '--color-srs-guru' },
      { label: 'master', token: '--color-srs-master' },
      { label: 'enlightened', token: '--color-srs-enlightened' },
      { label: 'burned', token: '--color-srs-burned' },
    ],
  },
  {
    title: 'The one categorical use of colour',
    swatches: [
      { label: 'radical', token: '--color-radical' },
      { label: 'kanji', token: '--color-kanji' },
      { label: 'vocabulary', token: '--color-vocab' },
      { label: 'kana vocabulary', token: '--color-kana-vocab' },
      { label: 'grammar', token: '--color-grammar' },
      { label: 'conjugation', token: '--color-conjugation' },
    ],
  },
]

// Two ends and almost nothing between them, which is the claim this list is here to be judged
// against. The sample is a glyph and a word, since the scale is spent on both.
const SCALE: readonly { readonly label: string; readonly size: string }[] = [
  { label: '2xs', size: 'text-2xs' },
  { label: 'xs', size: 'text-xs' },
  { label: 'sm', size: 'text-sm' },
  { label: 'base', size: 'text-base' },
  { label: 'lg', size: 'text-lg' },
  { label: 'xl', size: 'text-xl' },
  { label: '2xl', size: 'text-2xl' },
  { label: '3xl', size: 'text-3xl' },
  { label: '4xl', size: 'text-4xl' },
  { label: '5xl', size: 'text-5xl' },
  { label: '6xl', size: 'text-6xl' },
]

const RADII: readonly { readonly label: string; readonly radius: string }[] = [
  { label: 'xs', radius: 'rounded-xs' },
  { label: 'sm', radius: 'rounded-sm' },
  { label: 'md', radius: 'rounded-md' },
  { label: 'lg', radius: 'rounded-lg' },
  { label: 'xl', radius: 'rounded-xl' },
  { label: '2xl', radius: 'rounded-2xl' },
  { label: '3xl', radius: 'rounded-3xl' },
  { label: '4xl', radius: 'rounded-4xl' },
]

// The whole entrance vocabulary: six pixels and a blur, and two things that never stop.
const MOTION: readonly { readonly label: string; readonly motion: string }[] = [
  { label: 'drift, every entrance', motion: 'animate-drift' },
  { label: 'breathe, the one control', motion: 'animate-breathe' },
  { label: 'pulse, the session running', motion: 'animate-pulse-dot' },
]

function Heading({ title }: { title: string }) {
  return <h2 className="eyebrow text-[var(--color-ink-muted)]">{title}</h2>
}

export function DesignTokens() {
  return (
    <div className="flex flex-col gap-10 pb-10">
      {GROUPS.map((group) => (
        <section key={group.title} className="flex flex-col gap-3">
          <Heading title={group.title} />
          <div className="flex flex-wrap gap-4">
            {group.swatches.map((swatch) => (
              <span key={swatch.token} className="flex w-20 flex-col gap-1.5">
                <span
                  className="h-12 w-full rounded-md border border-[var(--color-hairline)]"
                  style={{ background: `var(${swatch.token})` }}
                />
                <span className="text-2xs leading-none text-[var(--color-ink-muted)]">
                  {swatch.label}
                </span>
              </span>
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
            <span lang="ja" className={step.size}>
              下 descendre
            </span>
          </span>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <Heading title="The radii, one value and its multiples" />
        <div className="flex flex-wrap items-end gap-4">
          {RADII.map((step) => (
            <span key={step.label} className="flex w-20 flex-col gap-1.5">
              <span
                className={`h-12 w-full bg-[var(--color-surface-sunken)] ${step.radius}`}
              />
              <span className="text-2xs leading-none text-[var(--color-ink-muted)]">
                {step.label}
              </span>
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Heading title="Motion" />
        <div className="flex flex-wrap gap-8">
          {MOTION.map((step) => (
            <span key={step.label} className="flex w-32 flex-col gap-2">
              <span className={`size-4 rounded-full bg-[var(--color-brand)] ${step.motion}`} />
              <span className="text-2xs leading-none text-[var(--color-ink-muted)]">
                {step.label}
              </span>
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
