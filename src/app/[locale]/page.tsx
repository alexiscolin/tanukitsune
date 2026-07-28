import { notFound } from 'next/navigation'

import { isLocale } from '@/core/locales'
import { copyFor } from '@/core/site-copy'
import { PageShell } from '@/ui/page-shell'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const copy = copyFor(locale)

  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="text-[var(--color-ink-muted)]">{copy.tagline}</p>
    </PageShell>
  )
}
