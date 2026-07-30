import type { GradedAnswer, JudgePort } from './judge-port'

// One version per tier, because the two change for different reasons: a judge prompt
// must not relabel a row the exact tier decided, and a change to normalise must.
const EXACT_TIER = 'exact:1'
const JUDGE_TIER = 'judge:1'

type CascadeOutcome =
  | { readonly verdict: 'correct' | 'incorrect'; readonly decidedBy: typeof EXACT_TIER | typeof JUDGE_TIER }
  // Nobody decided, so nothing claims to have: the reader grades it and the
  // interface shows the item card while asking.
  | { readonly verdict: 'undecided' }

// The stages in cost order, reaching for the port only where the free one cannot
// decide. A reading never reaches it: an edit of one character accepts こうえん for
// こうねん, which turns a wrong reading into a correct one and teaches it.
export async function runCascade(answer: GradedAnswer, port: JudgePort | null): Promise<CascadeOutcome> {
  if (matchesExactly(answer)) return { verdict: 'correct', decidedBy: EXACT_TIER }
  if (answer.kind === 'reading') return { verdict: 'incorrect', decidedBy: EXACT_TIER }
  if (port === null) return { verdict: 'undecided' }

  const judged = await port.judge(answer)

  // A meaning is never failed by a tier that could not place it, so an unsure
  // judge is a question for the reader rather than a wrong answer.
  if (judged === 'unsure') return { verdict: 'undecided' }

  return { verdict: judged, decidedBy: JUDGE_TIER }
}

function matchesExactly({ answer, accepted }: GradedAnswer): boolean {
  const typed = normalise(answer)

  return accepted.some((reference) => normalise(reference) === typed)
}

// Trim, compose, fold case, for both kinds. Composing before comparing is what makes
// a dakuten typed as a combining mark the same answer, and it leaves a small kana
// alone, which is the distinction a reading rests on. Folding case is a no-op on kana,
// which carries none, so one path serves both kinds rather than a branch reading as a
// rule that is not one.
function normalise(value: string): string {
  return value.trim().normalize('NFC').toLowerCase()
}
