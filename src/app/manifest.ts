import type { MetadataRoute } from 'next'

import { DEFAULT_LOCALE } from '@/core/locales'
import { startPath } from '@/core/routes'
import { copyFor } from '@/core/site-copy'

// What makes the app installable, which is also what exempts its storage from Safari's seven-day
// eviction: a queue built in the browser is not lost because the reader did not come back for a
// week. See docs/specs/v0.1.md, under what ships.

// Where an installed app opens, which is where a session starts and never inside one: no step of
// the loop is reached by navigating, and the loop is a state rather than a destination.
const OPENS_AT = startPath(DEFAULT_LOCALE)

// The ground the shell paints, mirroring --color-canvas in src/app/globals.css. Written here as a
// literal because a manifest is JSON and cannot read a stylesheet, so the two are held together by
// this line and by nothing else.
const GROUND = '#fbf5ef'

export default function manifest(): MetadataRoute.Manifest {
  const copy = copyFor(DEFAULT_LOCALE)

  return {
    name: copy.title,
    short_name: copy.title,
    description: copy.tagline,
    start_url: OPENS_AT,
    scope: '/',
    display: 'standalone',
    background_color: GROUND,
    theme_color: GROUND,
    lang: DEFAULT_LOCALE,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
