import type { NextConfig } from 'next'

import { DEFAULT_LOCALE } from './src/core/locales'
import { startPath } from './src/core/routes'

const config: NextConfig = {
  reactCompiler: true,
  // Off by design: the one cacheable resource is served as an immutable versioned
  // URL instead. See docs/framing.md, rendering and caching.
  cacheComponents: false,
  // Every page lives under a locale segment, so the bare root has nowhere to go.
  redirects: () =>
    Promise.resolve([
      { source: '/', destination: startPath(DEFAULT_LOCALE), permanent: false },
    ]),
  // The three that cost nothing and need no per-request value. A full script-src
  // needs a nonce, which is an owed decision rather than a guess made here.
  headers: () =>
    Promise.resolve([
      {
        // The session document is dealt from an account, so it is nobody else's to keep: the service
        // worker holds what a response allows it to hold, and a shared device would otherwise open on
        // the last reader's cards.
        source: '/:locale/session',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        ],
      },
    ]),
}

export default config
