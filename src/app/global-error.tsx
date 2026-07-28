'use client'

import { DEFAULT_LOCALE } from '@/core/locales'
import { copyFor } from '@/core/site-copy'

// This boundary replaces the root layout, so the stylesheet and the theme script
// are both gone. A dark-first product shows a light page here unless the
// boundary carries the colours itself, which is why these are inline.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const copy = copyFor(DEFAULT_LOCALE)

  return (
    <html lang={DEFAULT_LOCALE}>
      <body
        style={{
          colorScheme: 'light dark',
          background: 'Canvas',
          color: 'CanvasText',
          font: '1rem/1.5 system-ui, sans-serif',
          display: 'grid',
          placeItems: 'center',
          minHeight: '100dvh',
          margin: 0,
        }}
      >
        <main style={{ display: 'grid', gap: '1rem', padding: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{copy.error}</h1>
          <button type="button" onClick={reset} style={{ justifySelf: 'start', padding: '0.5rem 1rem' }}>
            {copy.retry}
          </button>
        </main>
      </body>
    </html>
  )
}
