import { CLAIMED } from './claimed'
import { fuzzyVerdict } from './fuzzy'
import type { GradedAnswer, JudgePort, Verdict } from './judge-port'
import { normalise } from './normalise'

// One version per tier, because the two change for different reasons: a judge prompt
// must not relabel a row the exact tier decided, and a change to normalise must.
const EXACT_TIER = 'exact:2'
const FUZZY_TIER = 'fuzzy:1'
const JUDGE_TIER = 'judge:1'

// Named for the screen that holds it: the tier that decided is written to the review event
// beside the verdict, so a screen keeping only the verdict would drop half of what it owes.
export type CascadeOutcome =
  | {
      readonly verdict: Verdict
      readonly decidedBy: typeof EXACT_TIER | typeof FUZZY_TIER | typeof JUDGE_TIER
    }
  // Nobody decided, so nothing claims to have: the reader grades it and the
  // interface shows the item card while asking.
  | { readonly verdict: 'undecided' }

// The stages in cost order, reaching for the port only where the free ones cannot
// decide. A reading never reaches the fuzzy tier: an edit of one character accepts こうえん for
// こうねん, which turns a wrong reading into a correct one and teaches it. What the fuzzy tier may
// not do to a meaning is in fuzzy.ts.
export async function runCascade(answer: GradedAnswer, port: JudgePort | null): Promise<CascadeOutcome> {
  if (matchesExactly(answer)) return { verdict: 'correct', decidedBy: EXACT_TIER }
  if (answer.kind === 'reading') return { verdict: 'incorrect', decidedBy: EXACT_TIER }
  if (fuzzyVerdict(answer, CLAIMED) === 'correct') return { verdict: 'correct', decidedBy: FUZZY_TIER }
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
