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
// What reads a raw variable outside the application is the migration configuration
// and the end-to-end expectation, through the rule above rather than around it.
const schema = z.object({
  DATABASE_URL: optionalText,
  // Which directory the file-backed database opens, where no server one is named. Absent is the
  // default beside the repository, and why a second one exists is in docs/verification.md.
  TANUKITSUNE_LOCAL_DATABASE: optionalText,
  // Optional because one public URL is both the demo and the product: with no token the demo
  // deck is served, and only a deployment reviewing a real account holds one. Single user and
  // unencrypted by decision, per the out-of-scope section of docs/specs/v0.1.md.
  WANIKANI_TOKEN: optionalText,
  // Where the source answers. Absent everywhere but the end-to-end suite, which names a server of
  // its own so a session can be driven against an account nobody owns. Absent is what points the
  // source at the real API, so a deployment that sets nothing reaches WaniKani and one that sets
  // this reaches whatever it named.
  WANIKANI_API: optionalText,
  // What the backup route requires of a caller. Absent closes that route rather than opening it:
  // a deployment that lost the variable would otherwise accept a batch from anyone who found the
  // path, and an unreachable backup is a failure the reader sees where an open one is not.
  TANUKITSUNE_SYNC_SECRET: optionalText,
  // Present means the flush may reach the source. Absent it runs whole and stops short of the
  // submission, marking nothing: a submission is irreversible, it advances or drops a real SRS
  // stage, and the source offers no sandbox. The end-to-end suite sets it against a source that
  // belongs to nobody, which is the only place it is on.
  TANUKITSUNE_UPSTREAM_WRITE: optionalText,
  TANUKITSUNE_COMMIT: optionalText,
  TANUKITSUNE_BUILT_AT: optionalText,
})

export const env = schema.parse(process.env)
