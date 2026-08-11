import { describe, expect, it } from 'vitest'

import { nextStep, readSubmitted, submittedFile } from './naming-run'

const IN_FLIGHT = { id: 'msgbatch_01', version: 2, asked: 30 }

describe('nextStep', () => {
  it('submits what is owed when no batch is in flight', () => {
    expect(nextStep(null, ['囗', '厶'], 2)).toEqual({ do: 'submit', parts: ['囗', '厶'] })
  })

  // Every component has a name and no batch is running, which is the state the command is re-run
  // into once the work is done. Submitting an empty batch there bills a job that asks nothing.
  it('does nothing when there is nothing owed and nothing running', () => {
    expect(nextStep(null, [], 2)).toEqual({ do: 'nothing' })
  })

  // A batch in flight is collected whatever is owed, because what it holds is the answer to part of
  // what is owed, and submitting a second one for the same components pays twice for one question.
  it('collects the batch in flight rather than submitting beside it', () => {
    expect(nextStep(IN_FLIGHT, ['囗'], 2)).toEqual({ do: 'collect', id: 'msgbatch_01' })
  })

  // The prompt moved while a batch ran. Writing its answers now records them under a version they
  // were never asked at, which is a provenance that reads as true, and the file is where the reader
  // will look for it later.
  it('refuses to collect a batch asked at another version, naming both', () => {
    expect(() => nextStep(IN_FLIGHT, ['囗'], 3)).toThrow(/2.*3|3.*2/)
  })
})

describe('readSubmitted', () => {
  it('reads back what the command wrote when it submitted', () => {
    expect(readSubmitted(submittedFile(IN_FLIGHT))).toEqual(IN_FLIGHT)
  })

  // The file is what stands between a re-run and a second batch for the same question, so one that
  // cannot be read is a state to fail on rather than to treat as no batch at all.
  it('refuses a file that is not one', () => {
    expect(() => readSubmitted('{"id":"msgbatch_01"}')).toThrow()
    expect(() => readSubmitted('{}')).toThrow()
  })
})
