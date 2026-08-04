import { describe, expect, it } from 'vitest'

import { KANJI } from '../demo-deck'
import { questionsFor } from './question'

describe('questionsFor', () => {
  // The reader's own words for a subject are answers beside the source's, which is what makes
  // them worth reading at all: a grader that refuses what the reader themselves declared right is
  // a grader they stop trusting.
  it('accepts what the reader calls the subject, beside what the source does', () => {
    const [meaning] = questionsFor([{ ...KANJI, synonyms: ['sous la ligne'] }])

    expect(meaning?.accepted).toContain('sous la ligne')
    expect(meaning?.accepted).toContain(KANJI.meanings[0]?.text)
  })

  // A synonym is a word for the meaning, and offering it for a reading would accept an answer in
  // the wrong script entirely.
  it('leaves a reading question to the source alone', () => {
    const reading = questionsFor([{ ...KANJI, synonyms: ['sous la ligne'] }]).find(
      (question) => question.kind === 'reading',
    )

    expect(reading?.accepted).not.toContain('sous la ligne')
  })
})
