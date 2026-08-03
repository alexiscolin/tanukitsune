import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { VERB } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'
import type { Reading } from '@/core/subject'

import { SubjectReadingBlock } from './subject-reading-block'

afterEach(cleanup)

const COPY = copyFor('fr').subject

// The block decides how many blocks there are and what goes in each: readings are grouped by
// the kind the convention gives them, and each group is split between what may be answered and
// what is taught without being an answer. Getting the split wrong tells a reader that a reading
// is accepted when it is not, which is the one thing the card must never do.
//
// The readings are built here rather than taken from the demo deck, except where the deck
// carries the shape by nature: how many kinds a subject has and how many of its readings are
// refused is the corpus's business, and a molecule test that leans on it goes red when the
// demo changes with nothing wrong in the molecule.
function reading(text: string, type: Reading['type'], accepted: boolean): Reading {
  return { text, type, accepted, primary: false }
}

describe('SubjectReadingBlock', () => {
  it('draws nothing at all when there is no reading', () => {
    const { container } = render(<SubjectReadingBlock readings={[]} copy={COPY} />)

    expect(container.childElementCount).toBe(0)
  })

  it('gives each kind its own block, labelled by the kind', () => {
    render(
      <SubjectReadingBlock
        readings={[reading('カ', 'onyomi', true), reading('した', 'kunyomi', true)]}
        copy={COPY}
      />,
    )

    expect(screen.getByText(COPY.reading.onyomi)).toBeTruthy()
    expect(screen.getByText(COPY.reading.kunyomi)).toBeTruthy()
  })

  // A reading the convention gives no kind takes the plain label, since the script cannot say
  // for itself which of the two it is. Taken from the deck, which carries exactly that shape.
  it('labels an untyped kind plainly', () => {
    render(<SubjectReadingBlock readings={VERB.readings} copy={COPY} />)

    expect(screen.getByText(COPY.plainReading)).toBeTruthy()
  })

  // The split is the decision, not the punctuation between two readings of one kind, so what
  // is asserted is that the two lines are two lines.
  it('keeps what may be answered apart from what is only shown', () => {
    render(
      <SubjectReadingBlock
        readings={[
          reading('カ', 'onyomi', true),
          reading('ゲ', 'onyomi', true),
          reading('した', 'onyomi', false),
        ]}
        copy={COPY}
      />,
    )

    const answerable = screen.getByText(/カ/)
    const shown = screen.getByText(/した/)

    expect(answerable.textContent).toContain('ゲ')
    expect(shown).not.toBe(answerable)
    expect(answerable.textContent).not.toContain('した')
  })

  // The source sends six kun'yomi on 下 and accepts none of them. Dropping the group would
  // teach that the character has two readings when it has eight.
  it('keeps a kind whose every reading is refused', () => {
    render(
      <SubjectReadingBlock
        readings={[reading('した', 'kunyomi', false), reading('もと', 'kunyomi', false)]}
        copy={COPY}
      />,
    )

    expect(screen.getByText(COPY.reading.kunyomi)).toBeTruthy()
    expect(screen.getByText(/した/).textContent).toContain('もと')
  })

  it('says nothing extra on a kind whose readings are all answerable', () => {
    render(
      <SubjectReadingBlock
        readings={[reading('カ', 'onyomi', true), reading('した', 'kunyomi', false)]}
        copy={COPY}
      />,
    )

    expect(screen.getAllByText(COPY.alsoShown)).toHaveLength(1)
  })
})
