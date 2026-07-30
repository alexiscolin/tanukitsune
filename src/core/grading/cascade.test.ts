import { describe, expect, it, vi } from 'vitest'

import { runCascade } from './cascade'

function judgeAlways(verdict: 'correct' | 'incorrect' | 'unsure') {
  return { judge: vi.fn(() => Promise.resolve(verdict)) }
}

describe('runCascade, a meaning', () => {
  it('is correct when it matches a reference exactly, and says which tier decided', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: 'eau', accepted: ['eau'] }, null)

    expect(outcome).toEqual({ verdict: 'correct', decidedBy: 'exact:1' })
  })

  it('is correct whatever the case and the surrounding space, which nobody types consistently', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: '  Eau ', accepted: ['eau'] }, null)

    expect(outcome.verdict).toBe('correct')
  })

  it('is compared composed, so a keyboard that decomposes an accent is not punished for it', async () => {
    const decomposed = 'été'
    const outcome = await runCascade({ kind: 'meaning', answer: decomposed, accepted: ['été'] }, null)

    expect(outcome.verdict).toBe('correct')
  })

  it('is never wrong when the exact tier cannot place it, because the reader is asked instead', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: 'tache', accepted: ['tâche'] }, null)

    expect(outcome).toEqual({ verdict: 'undecided' })
  })

  it('reaches the judge only once the exact tier has failed', async () => {
    const port = judgeAlways('correct')

    const decided = await runCascade({ kind: 'meaning', answer: 'eau', accepted: ['eau'] }, port)
    expect(port.judge).not.toHaveBeenCalled()
    expect(decided).toEqual({ verdict: 'correct', decidedBy: 'exact:1' })

    const judged = await runCascade({ kind: 'meaning', answer: "de l'eau", accepted: ['eau'] }, port)
    expect(port.judge).toHaveBeenCalledTimes(1)
    expect(judged).toEqual({ verdict: 'correct', decidedBy: 'judge:1' })
  })

  it('is wrong when the judge says so, which is a decision rather than a fall-through', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: 'feu', accepted: ['eau'] }, judgeAlways('incorrect'))

    expect(outcome).toEqual({ verdict: 'incorrect', decidedBy: 'judge:1' })
  })

  it('goes to the reader when the judge is unsure, and carries no decider when nobody decided', async () => {
    const outcome = await runCascade({ kind: 'meaning', answer: 'humide', accepted: ['eau'] }, judgeAlways('unsure'))

    expect(outcome).toEqual({ verdict: 'undecided' })
  })
})

describe('runCascade, a reading', () => {
  it('is correct when the kana are the ones the item expects', async () => {
    const outcome = await runCascade({ kind: 'reading', answer: 'みず', accepted: ['みず'] }, null)

    expect(outcome).toEqual({ verdict: 'correct', decidedBy: 'exact:1' })
  })

  it('is decided at the exact tier alone, so a near miss is wrong and never sent to a judge', async () => {
    const port = judgeAlways('correct')
    const outcome = await runCascade({ kind: 'reading', answer: 'こうえん', accepted: ['こうねん'] }, port)

    expect(outcome).toEqual({ verdict: 'incorrect', decidedBy: 'exact:1' })
    expect(port.judge).not.toHaveBeenCalled()
  })

  it('treats a small kana as its own character, because it is its own sound', async () => {
    const outcome = await runCascade({ kind: 'reading', answer: 'きゆう', accepted: ['きゅう'] }, null)

    expect(outcome.verdict).toBe('incorrect')
  })

  it('treats a dakuten as its own character, and accepts one typed as a combining mark', async () => {
    const missing = await runCascade({ kind: 'reading', answer: 'か', accepted: ['が'] }, null)
    const combining = await runCascade({ kind: 'reading', answer: 'が', accepted: ['が'] }, null)

    expect(missing.verdict).toBe('incorrect')
    expect(combining.verdict).toBe('correct')
  })

  it('accepts any of the readings the item allows', async () => {
    const outcome = await runCascade({ kind: 'reading', answer: 'ゲツ', accepted: ['がつ', 'ゲツ'] }, null)

    expect(outcome.verdict).toBe('correct')
  })
})
