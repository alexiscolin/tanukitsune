import { notFound } from 'next/navigation'

import { isLocale } from '@/core/locales'
import { copyFor } from '@/core/site-copy'

import { Start } from './start'
import { servesDemo } from './waiting'

// Rendered per request, because which deck a deployment serves is read from its environment and a
// build holds none: prerendered, this screen said demo whatever the deployment was. It carries no
// account data all the same, so one document still serves every reader of it.
export const dynamic = 'force-dynamic'

// It carries no counts. What this renders is the same document for every reader of a deployment,
// which is what lets the service worker hold it and serve it with no network, and what keeps an
// account's queue out of a cache on disk; the counts are asked for by the screen.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return <Start locale={locale} copy={copyFor(locale)} demo={servesDemo()} />
}
