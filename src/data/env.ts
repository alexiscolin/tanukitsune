import 'server-only'

import { z } from 'zod'

// An empty value means absent, not invalid: .env.example ships empty
// placeholders and bootstrap copies them into .env.local. Without the
// preprocess, a blank line either fails the whole parse or slips past a `??`
// fallback as an empty string, and both have happened.
const optionalText = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
)

// Parsed once, at the boundary. Nothing else in the application reads
// process.env.
const schema = z.object({
  DATABASE_URL: optionalText,
  TANUKITSUNE_COMMIT: optionalText,
  TANUKITSUNE_BUILT_AT: optionalText,
})

export const env = schema.parse(process.env)
