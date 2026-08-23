import { describe, expect, it } from 'vitest'

import type { Step } from './pipeline'
import { argumentsFor, resumeAt, stepsFor } from './pipeline'

const FR = stepsFor('fr')
const nothingRunning = () => false

describe('stepsFor', () => {
  it('orders a step after everything it reads', () => {
    const at = (name: string) => FR.findIndex((one) => one.name === name)

    expect(at('corpus:inventory')).toBeLessThan(at('corpus:key-choice'))
    expect(at('corpus:key-choice')).toBeLessThan(at('corpus:keys'))
    expect(at('corpus:key-translation')).toBeLessThan(at('corpus:keys'))
    expect(at('corpus:decomposition')).toBeLessThan(at('corpus:name'))
    expect(at('corpus:keys')).toBeLessThan(at('corpus:vocabulary'))
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

describe('argumentsFor', () => {
  const step = (name: string) => FR.find((one) => one.name === name) as Step

  // Three steps read the position after their name as something other than a locale, so one shape for
  // all seven hands a release path where a locale was meant and dies on the first of them.
  it('gives a step what that step reads, rather than one shape for all', () => {
    expect(argumentsFor(step('corpus:decomposition'), 'fr', Infinity, 60)).toEqual([])
    expect(argumentsFor(step('corpus:inventory'), 'fr', Infinity, 60)).toEqual(['60'])
    expect(argumentsFor(step('corpus:keys'), 'fr', 20, 60)).toEqual(['fr'])
    expect(argumentsFor(step('corpus:report'), 'fr', 20, 60)).toEqual(['fr'])
    expect(argumentsFor(step('corpus:name'), 'fr', 20, 60)).toEqual(['fr', '20'])
  })

  // The bound exists so a first run is read by hand before the rest is paid for. Unbounded, it is not
  // sent at all rather than sent as the word Infinity.
  it('leaves the bound out where none was given', () => {
    expect(argumentsFor(step('corpus:name'), 'fr', Infinity, 60)).toEqual(['fr'])
  })

  // The inventory command defaults to ten levels and the committed inventory carries sixty. Running it
  // with nothing would rewrite sixty levels of curriculum as ten, and every count after it is taken
  // against that file.
  it('carries the level ceiling rather than letting the inventory fall back to its own default', () => {
    expect(argumentsFor(step('corpus:inventory'), 'fr', Infinity, 10)).toEqual(['10'])
  })
})
