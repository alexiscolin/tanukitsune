import { z } from 'zod'

// What a naming run knows about itself between two invocations. A batch is asynchronous, so the
// command that submits one is not the command that reads it, and the identifier is the only thing
// tying the two together. Written to disk, never committed: it names a job on somebody's account.

export type Submitted = {
  readonly id: string
  // The prompt version the batch was asked at, because a prompt that moves while a batch runs makes
  // every answer it holds provenance for a question nobody asked.
  readonly version: number
}

export type Step =
  | { readonly do: 'submit'; readonly parts: readonly string[] }
  | { readonly do: 'collect'; readonly id: string }
  | { readonly do: 'nothing' }

export function nextStep(saved: Submitted | null, owed: readonly string[], version: number): Step {
  if (saved === null) return owed.length === 0 ? { do: 'nothing' } : { do: 'submit', parts: owed }

  if (saved.version !== version) {
    throw new Error(
      `batch ${saved.id} was asked at prompt version ${saved.version}, and this one is ${version}. ` +
        'Collect it under the version it was asked at, or drop the run file to abandon it.',
    )
  }

  return { do: 'collect', id: saved.id }
}

const submitted = z.strictObject({ id: z.string().min(1), version: z.number().int() })

export function readSubmitted(json: string): Submitted {
  return submitted.parse(JSON.parse(json))
}

export function submittedFile(one: Submitted): string {
  return `${JSON.stringify(one, null, 2)}\n`
}

// What a batch cost, summed over its answers. Reported by every command that collects one, because the
// input count alone reports the uncached remainder and a run reading it would call a cold prefix warm.
export type Spend = {
  input: number
  output: number
  cacheCreation: number
  cacheRead: number
}

export function noSpend(): Spend {
  return { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 }
}

export function add(spend: Spend, one: Spend): void {
  spend.input += one.input
  spend.output += one.output
  spend.cacheCreation += one.cacheCreation
  spend.cacheRead += one.cacheRead
}

export function spentLine(spend: Spend): string {
  return `spent: ${spend.input} in, ${spend.output} out, ${spend.cacheCreation} written to cache, ${spend.cacheRead} read from it\n`
}
