import { notFound } from 'next/navigation'

import { DEMO_QUESTIONS } from '@/core/demo-deck'
import { isLocale } from '@/core/locales'
import { copyFor } from '@/core/site-copy'

import { DemoReview } from './demo-review'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const copy = copyFor(locale)

  // The screen carries its own shell, because it is full bleed and owns its gutters: nothing
  // wraps it here. The deck is the seeded one until `KnowledgeSource` can supply assignments,
  // and the answers it produces are written to the browser's own queue.
  return (
    <DemoReview
      locale={locale}
      questions={DEMO_QUESTIONS}
      copy={copy.review}
      subjectCopy={copy.subject}
    />
  )
}
