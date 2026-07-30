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

const KATAKANA = /[ァ-ヶ]/g
// Katakana sits one fixed offset above hiragana across that whole block, which is what
// makes the fold a mapping between spellings rather than a judgement about the answer.
const TO_HIRAGANA = 0x60

// Only what cannot make a wrong answer right. NFKC composes a dakuten onto its kana and
// pulls half-width kana and full-width Latin onto their canonical forms, leaving a small
// kana small, which is the distinction a reading rests on. The prolonged sound mark is
// outside the folded block on purpose: コー and こう are two readings and the reference
// says which one the item wants. Case folding is a no-op on kana, so one path serves
// both answer kinds rather than a branch reading as a rule that is not one.
function normalise(value: string): string {
  return value
    .trim()
    .normalize('NFKC')
    .replace(KATAKANA, (kana) => String.fromCharCode(kana.charCodeAt(0) - TO_HIRAGANA))
    .toLowerCase()
}
