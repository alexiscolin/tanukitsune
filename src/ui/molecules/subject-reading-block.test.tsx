import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { KANJI } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'
import type { Reading } from '@/core/subject'

import { SubjectReadingBlock } from './subject-reading-block'

afterEach(cleanup)

const COPY = copyFor('fr').subject

// The block decides how many blocks there are and what goes in each: readings are grouped by
// the kind the convention gives them, and each group is split between what may be answered and
// what is taught without being an answer. Getting the split wrong tells a reader that a reading
// is accepted when it is not, which is the one thing the card must never do.

function reading(text: string, type: Reading['type'], accepted: boolean): Reading {
  return { text, type, accepted, primary: false }
}

describe('SubjectReadingBlock', () => {
  it('draws nothing at all when there is no reading', () => {
    const { container } = render(<SubjectReadingBlock readings={[]} copy={COPY} />)

    expect(container.childElementCount).toBe(0)
  })

  it('gives each kind its own block, labelled by the kind', () => {
    render(<SubjectReadingBlock readings={KANJI.readings} copy={COPY} />)

    expect(screen.getByText(COPY.reading.onyomi)).toBeTruthy()
    expect(screen.getByText(COPY.reading.kunyomi)).toBeTruthy()
  })

  // A reading the convention gives no kind takes the plain label, since the script cannot say
  // for itself which of the two it is.
  it('labels an untyped kind plainly', () => {
    render(<SubjectReadingBlock readings={[reading('でる', null, true)]} copy={COPY} />)

    expect(screen.getByText(COPY.plainReading)).toBeTruthy()
  })

  it('keeps what may be answered apart from what is only shown', () => {
    render(
      <SubjectReadingBlock
        readings={[
          reading('カ', 'onyomi', true),
          reading('ゲ', 'onyomi', true),
          reading('した', 'kunyomi', false),
        ]}
        copy={COPY}
      />,
    )

    expect(screen.getByText('カ · ゲ')).toBeTruthy()
    expect(screen.getByText('した', { exact: false })).toBeTruthy()
  })

  // The source sends six kun'yomi on this character and accepts none of them. Dropping the
  // group would teach that the character has two readings when it has eight.
  it('keeps a kind whose every reading is refused, and says why once', () => {
    const refusedOnly = KANJI.readings.filter((entry) => entry.type === 'kunyomi')

    render(<SubjectReadingBlock readings={refusedOnly} copy={COPY} />)

    expect(screen.getByText(COPY.reading.kunyomi)).toBeTruthy()
    expect(screen.getAllByText(COPY.alsoShown)).toHaveLength(1)
  })

  it('says it once per kind rather than once per reading', () => {
    render(<SubjectReadingBlock readings={KANJI.readings} copy={COPY} />)

    expect(screen.getAllByText(COPY.alsoShown)).toHaveLength(1)
  })
})
