import { describe, expect, it } from 'vitest'

import { resumeAt, stepsFor } from './pipeline'

const FR = stepsFor('fr')
const nothingRunning = () => false

describe('stepsFor', () => {
  it('orders a step after everything it reads', () => {
    const at = (name: string) => FR.findIndex((one) => one.name === name)

    expect(at('corpus:inventory')).toBeLessThan(at('corpus:key-choice'))
    expect(at('corpus:key-choice')).toBeLessThan(at('corpus:keys'))
    expect(at('corpus:key-translation')).toBeLessThan(at('corpus:keys'))
    expect(at('corpus:decomposition')).toBeLessThan(at('corpus:name'))
    expect(at('corpus:report')).toBe(FR.length - 1)
  })

  // The estimate shown before a run is counted over these, so a step that pays and does not say so
  // is a run that spends without announcing it.
  it('says which steps pay a model', () => {
    const paid = FR.filter((one) => one.paid).map((one) => one.name)

    expect(paid).toEqual(['corpus:key-choice', 'corpus:key-translation', 'corpus:name'])
  })

  it('keys a locale step by that locale and leaves a shared one alone', () => {
    expect(stepsFor('fr').find((one) => one.name === 'corpus:name')?.batch).toBe('corpus/fr/.naming-batch.json')
    expect(stepsFor('de').find((one) => one.name === 'corpus:name')?.batch).toBe('corpus/de/.naming-batch.json')
    expect(FR.find((one) => one.name === 'corpus:decomposition')?.batch).toBeNull()
  })
})

describe('resumeAt', () => {
  it('starts at the beginning when no batch is waiting', () => {
    expect(resumeAt(FR, nothingRunning)).toBe(0)
  })

  // A batch is asynchronous, so a run that submitted one ends and a later run collects it. Starting
  // over would submit the same requests again and pay for them twice.
  it('starts at the step whose batch is waiting to be collected', () => {
    const waiting = (path: string) => path === 'corpus/fr/.naming-batch.json'

    expect(FR[resumeAt(FR, waiting)]?.name).toBe('corpus:name')
  })

  it('starts at the first of two waiting batches, since the later one reads what the earlier writes', () => {
    const waiting = (path: string) =>
      path === 'corpus/fr/.naming-batch.json' || path === 'corpus/fr/.key-choice-batch.json'

    expect(FR[resumeAt(FR, waiting)]?.name).toBe('corpus:key-choice')
  })
})
