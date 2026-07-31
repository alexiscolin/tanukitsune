import 'server-only'

import { z } from 'zod'

import { asOptional } from './optional-text'

// An empty value means absent, not invalid: .env.example ships placeholders and
// bootstrap copies them into .env.local. Without the preprocess, a blank line either
// fails the whole parse or slips past a `??` fallback as an empty string, and both
// have happened. The rule itself is shared, because the migration tool and the
// end-to-end expectation have to reach the same conclusion from the same variable.
const optionalText = z.preprocess(
  (value) => asOptional(typeof value === 'string' ? value : undefined),
  z.string().min(1).optional(),
)

// Parsed once, at the boundary. Nothing else in the application reads process.env.
// What reads the raw variable outside the application is the migration configuration
// and the end-to-end expectation, through the rule above rather than around it.
const schema = z.object({
  DATABASE_URL: optionalText,
  TANUKITSUNE_COMMIT: optionalText,
  TANUKITSUNE_BUILT_AT: optionalText,
})

export const env = schema.parse(process.env)
