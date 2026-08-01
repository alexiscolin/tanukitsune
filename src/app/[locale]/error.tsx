'use client'

import { useParams } from 'next/navigation'

import { copyFor } from '@/core/site-copy'
import { PageShell } from '@/ui/atoms/page-shell'

export default function SegmentError({ reset }: { error: Error; reset: () => void }) {
  const { locale } = useParams<{ locale: string }>()
  const copy = copyFor(locale)

  return (
    <PageShell>
      <h1 className="text-2xl font-semibold">{copy.error}</h1>
      <button
        type="button"
        onClick={reset}
        className="self-start rounded-md bg-[var(--color-surface-raised)] px-4 py-2"
      >
        {copy.retry}
      </button>
    </PageShell>
  )
}
