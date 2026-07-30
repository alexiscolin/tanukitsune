import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { ReviewEntry } from '@/core/review-entry'
import { copyFor } from '@/core/site-copy'

import { ReviewSession } from './review-session'

afterEach(cleanup)

const COPY = copyFor('fr').review

// The same subject twice, which is what the flat queue is: one entry is one question.
// Pairing the two is a submission rule and lives at the flush, not on the screen.
const READING: ReviewEntry = {
  subjectId: 'kanji-water',
  characters: '水',
  kind: 'reading',
  accepted: ['みず'],
}
const MEANING: ReviewEntry = {
  subjectId: 'kanji-water',
  characters: '水',
  kind: 'meaning',
  accepted: ['eau'],
}

// One change event per keystroke, because the field converts over a buffer of what was
// typed rather than over the kana already on it.
function answer(text: string) {
  const field = screen.getByLabelText<HTMLInputElement>(COPY.answerLabel)

  for (const key of text) fireEvent.change(field, { target: { value: field.value + key } })
  fireEvent.keyDown(field, { key: 'Enter' })
}

function press(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

describe('ReviewSession', () => {
  it('asks the first entry, showing the subject and which answer it wants', () => {
    render(<ReviewSession queue={[READING, MEANING]} copy={COPY} />)

    expect(screen.getByText('水')).toBeTruthy()
    expect(screen.getByText(COPY.prompt.reading)).toBeTruthy()
  })

  it('decides an exact reading and asks the next entry', async () => {
    render(<ReviewSession queue={[READING, MEANING]} copy={COPY} />)

    answer('mizu')

    expect(await screen.findByText(COPY.correct)).toBeTruthy()

    press(COPY.next)

    expect(screen.getByText(COPY.prompt.meaning)).toBeTruthy()
    // The next answer is typed without reaching for the mouse, which is the whole loop:
    // the key that moved the session on has to land in the field it opened.
    expect(document.activeElement).toBe(screen.getByLabelText(COPY.answerLabel))
  })

  it('shows the reading the item wanted on a miss, which is what tier 1 rejected it against', async () => {
    render(<ReviewSession queue={[READING]} copy={COPY} />)

    answer('mizo')

    expect(await screen.findByText(COPY.incorrect)).toBeTruthy()
    expect(screen.getByText('みず')).toBeTruthy()
  })

  it('asks the reader about a meaning no tier could place, rather than failing it', async () => {
    render(<ReviewSession queue={[MEANING]} copy={COPY} />)

    answer("de l'eau")

    expect(await screen.findByText(COPY.askSelfGrade)).toBeTruthy()
    expect(screen.queryByText(COPY.incorrect)).toBeNull()
    // Nothing to move on to: an answer nobody decided is not an answer the session owns.
    expect(screen.queryByRole('button', { name: COPY.next })).toBeNull()
  })

  it('counts what the reader graded correct and ends on the score', async () => {
    render(<ReviewSession queue={[MEANING]} copy={COPY} />)

    answer("de l'eau")
    expect(await screen.findByText(COPY.askSelfGrade)).toBeTruthy()
    press(COPY.gradeCorrect)
    press(COPY.next)

    expect(screen.getByText(COPY.done)).toBeTruthy()
    expect(screen.getByText('1 / 1')).toBeTruthy()
  })

  it('keeps self-grade on a verdict the cascade decided, since the override is the labelled disagreement', async () => {
    render(<ReviewSession queue={[READING]} copy={COPY} />)

    answer('mizu')
    expect(await screen.findByText(COPY.correct)).toBeTruthy()
    press(COPY.gradeIncorrect)

    expect(screen.getByText(COPY.incorrect)).toBeTruthy()

    press(COPY.next)

    expect(screen.getByText('0 / 1')).toBeTruthy()
  })

  it('puts the focus on the button that continues once a verdict stands', async () => {
    render(<ReviewSession queue={[READING]} copy={COPY} />)

    answer('mizu')
    expect(await screen.findByText(COPY.correct)).toBeTruthy()

    expect(document.activeElement).toBe(screen.getByRole('button', { name: COPY.next }))
  })

  it('puts the focus on the panel when the reader is the one who has to decide', async () => {
    render(<ReviewSession queue={[MEANING]} copy={COPY} />)

    answer("de l'eau")
    expect(await screen.findByText(COPY.askSelfGrade)).toBeTruthy()

    // No verdict stands, so there is no button to continue on: the panel holding the
    // question takes the focus rather than letting it fall to the document.
    expect(document.activeElement).not.toBe(document.body)
    expect(
      document.activeElement?.contains(screen.getByRole('button', { name: COPY.gradeCorrect })),
    ).toBe(true)
  })

  it('keeps the reference after grading, so grading does not remove what was graded against', async () => {
    render(<ReviewSession queue={[READING]} copy={COPY} />)

    answer('mizo')
    expect(await screen.findByText(COPY.incorrect)).toBeTruthy()
    press(COPY.gradeCorrect)

    expect(screen.getByText(COPY.correct)).toBeTruthy()
    expect(screen.getByText('みず')).toBeTruthy()
  })

  it('refuses a reading that cannot become kana instead of grading it', async () => {
    render(<ReviewSession queue={[READING]} copy={COPY} />)

    answer('123')

    expect(await screen.findByText(COPY.unconverted)).toBeTruthy()
    expect(screen.queryByText(COPY.incorrect)).toBeNull()
  })
})
