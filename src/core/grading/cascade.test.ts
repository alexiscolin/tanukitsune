import { describe, expect, it, vi } from 'vitest'

import { runCascade } from './cascade'

function judgeAlways(verdict: 'correct' | 'incorrect' | 'unsure') {
  return { judge: vi.fn(() => Promise.resolve(verdict)) }
}

describe('runCascade, a meaning', () => {
  it('is correct when it matches a reference exactly, and says which tier decided', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: 'eau', accepted: ['eau'], refused: [] }, null)

    expect(outcome).toEqual({ verdict: 'correct', decidedBy: 'exact:2' })
  })

  it('is correct whatever the case and the surrounding space, which nobody types consistently', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: '  Eau ', accepted: ['eau'], refused: [] }, null)

    expect(outcome.verdict).toBe('correct')
  })

  it('is compared composed, so a keyboard that decomposes an accent is not punished for it', async () => {
    const decomposed = 'été'
    const outcome = await runCascade({ kind: 'meaning', answer: decomposed, accepted: ['été'], refused: [] }, null)

    expect(outcome.verdict).toBe('correct')
  })

  it('is correct when a full-width keyboard typed it, which is the same word twice over', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: 'ｅａｕ', accepted: ['eau'], refused: [] }, null)

    expect(outcome.verdict).toBe('correct')
  })

  it('is never wrong when the exact tier cannot place it, because the reader is asked instead', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: 'tache', accepted: ['tâche'], refused: [] }, null)

    expect(outcome).toEqual({ verdict: 'undecided' })
  })

  // The tier between them, and the reason a reader stops self-grading every third card: the answer
  // they knew, typed the way people type.
  it('places a mistyped meaning at a tier of its own, and names it', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: 'philosphie', accepted: ['philosophie'], refused: [] }, null)

    expect(outcome).toEqual({ verdict: 'correct', decidedBy: 'fuzzy:1' })
  })

  // The guard, on a pair the curriculum really holds: both words are answers, one edit apart, and
  // opposite. Accepting either for the other is the failure tier 2 exists to avoid.
  it('leaves a near miss that answers another card to the reader', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: 'nourriture', accepted: ['pourriture'], refused: [] }, null)

    expect(outcome).toEqual({ verdict: 'undecided' })
  })

  it('reaches the judge only once the exact tier has failed', async () => {
    const port = judgeAlways('correct')

    const decided = await runCascade({ kind: 'meaning', answer: 'eau', accepted: ['eau'], refused: [] }, port)
    expect(port.judge).not.toHaveBeenCalled()
    expect(decided).toEqual({ verdict: 'correct', decidedBy: 'exact:2' })

    const judged = await runCascade({ kind: 'meaning', answer: 'liquide', accepted: ['eau'], refused: [] }, port)
    expect(port.judge).toHaveBeenCalledTimes(1)
    expect(judged).toEqual({ verdict: 'correct', decidedBy: 'judge:1' })
  })

  it('is wrong when the judge says so, which is a decision rather than a fall-through', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: 'feu', accepted: ['eau'], refused: [] }, judgeAlways('incorrect'))

    expect(outcome).toEqual({ verdict: 'incorrect', decidedBy: 'judge:1' })
  })

  it('goes to the reader when the judge is unsure, and carries no decider when nobody decided', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: 'humide', accepted: ['eau'], refused: [] }, judgeAlways('unsure'))

    expect(outcome).toEqual({ verdict: 'undecided' })
  })
})

describe('runCascade, a reading', () => {
  it('is correct when the kana are the ones the item expects', async () => {
    const outcome = await runCascade({ kind: 'reading', answer: 'みず', accepted: ['みず'], refused: [] }, null)

    expect(outcome).toEqual({ verdict: 'correct', decidedBy: 'exact:2' })
  })

  // Nothing fuzzy touches kana. An edit of one character accepts こうえん for こうねん, which turns a
  // wrong reading into a correct one and teaches it.
  it('is never placed by the fuzzy tier, whatever a single kana costs', async () => {
    const outcome = await runCascade({ kind: 'reading', answer: 'せんせえ', accepted: ['せんせい'], refused: [] }, null)

    expect(outcome).toEqual({ verdict: 'incorrect', decidedBy: 'exact:2' })
  })

  it('is decided at the exact tier alone, so a near miss is wrong and never sent to a judge', async () => {
    const port = judgeAlways('correct')
    const outcome = await runCascade({ kind: 'reading', answer: 'こうえん', accepted: ['こうねん'], refused: [] }, port)

    expect(outcome).toEqual({ verdict: 'incorrect', decidedBy: 'exact:2' })
    expect(port.judge).not.toHaveBeenCalled()
  })

  it('treats a small kana as its own character, because it is its own sound', async () => {
    const outcome = await runCascade({ kind: 'reading', answer: 'きゆう', accepted: ['きゅう'], refused: [] }, null)

    expect(outcome.verdict).toBe('incorrect')
  })

  it('treats a dakuten as its own character, and accepts one typed as a combining mark', async () => {
    const missing = await runCascade({ kind: 'reading', answer: 'か', accepted: ['が'], refused: [] }, null)
    const combining = await runCascade({ kind: 'reading', answer: 'が', accepted: ['が'], refused: [] }, null)

    expect(missing.verdict).toBe('incorrect')
    expect(combining.verdict).toBe('correct')
  })

  it('accepts the same reading written in katakana, which is a spelling and not another answer', async () => {
    const outcome = await runCascade({ kind: 'reading', answer: 'ミズ', accepted: ['みず'], refused: [] }, null)

    expect(outcome.verdict).toBe('correct')
  })

  it('accepts half-width kana, which a keyboard shortcut produces and no reader intends', async () => {
    const outcome = await runCascade({ kind: 'reading', answer: 'ﾐｽﾞ', accepted: ['みず'], refused: [] }, null)

    expect(outcome.verdict).toBe('correct')
  })

  it('keeps a small kana small through the fold, since it is its own sound', async () => {
    const outcome = await runCascade({ kind: 'reading', answer: 'キュウ', accepted: ['きゅう'], refused: [] }, null)

    expect(outcome.verdict).toBe('correct')
  })

  it('leaves the prolonged sound mark alone, because the reference says which reading the item wants', async () => {
    const outcome = await runCascade({ kind: 'reading', answer: 'コー', accepted: ['こう'], refused: [] }, null)

    expect(outcome.verdict).toBe('incorrect')
  })

  it('accepts any of the readings the item allows', async () => {
    const outcome = await runCascade({ kind: 'reading', answer: 'ゲツ', accepted: ['がつ', 'ゲツ'], refused: [] }, null)

    expect(outcome.verdict).toBe('correct')
  })
})
