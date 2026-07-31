import { notFound } from 'next/navigation'

import { DEMO_QUEUE } from '@/core/demo-queue'
import { isLocale } from '@/core/locales'
import { copyFor } from '@/core/site-copy'
import { PageShell } from '@/ui/page-shell'
import { ReviewSession } from '@/ui/review-session'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const copy = copyFor(locale)

  return (
    <PageShell>
      <ReviewSession queue={DEMO_QUEUE} copy={copy.review} />
    </PageShell>
  )
}
