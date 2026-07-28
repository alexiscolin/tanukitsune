import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { DEFAULT_LOCALE, isLocale, LOCALES } from '@/core/locales'
import { copyFor } from '@/core/site-copy'
import '../globals.css'

// Sets the attribute and the colour scheme in the same tick. The second is what
// stops form controls, scrollbars and the page background from flashing, and it
// only works before paint, which rules out an effect.
const APPLY_THEME = `(()=>{try{const s=localStorage.getItem('theme');const t=s==='dark'||s==='light'?s:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch{}})()`

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const copy = copyFor(locale)

  return { title: copy.title, description: copy.tagline }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <html lang={isLocale(locale) ? locale : DEFAULT_LOCALE} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_THEME }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
