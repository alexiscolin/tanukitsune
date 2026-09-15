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

  // The item says what is not the answer as well as what is, and the words it refuses are the ones
  // nearest the right one. They travel with the question because the tier that tolerates a slip is the
  // one that would otherwise reach them.
  it('carries what the item refuses onto the question it is asked with', () => {
    const [meaning] = questionsFor([{ ...KANJI, refused: ['au-dessus'] }])

    expect(meaning?.refused).toEqual(['au-dessus'])
  })

  it('refuses the words the card never prints as well as the ones it does', () => {
    const [meaning] = questionsFor([{ ...KANJI, refused: ['au-dessus'], alsoRefused: ['over'] }])

    expect(meaning?.refused).toEqual(['au-dessus', 'over'])
  })

  // A refusal is a word for the meaning, so it belongs to the meaning question for the same reason a
  // synonym does: on a reading it would refuse an answer in the wrong script entirely.
  it('leaves a reading question nothing to refuse', () => {
    const reading = questionsFor([{ ...KANJI, refused: ['au-dessus'] }]).find(
      (question) => question.kind === 'reading',
    )

    expect(reading?.refused).toEqual([])
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
