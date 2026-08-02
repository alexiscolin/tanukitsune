import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DEMO_QUESTIONS, KANJI } from '@/core/demo-deck'
import type { Question } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { ReviewSession } from './review-session'

afterEach(cleanup)

const COPY = copyFor('fr')

// Named rather than taken from the head of the deck, because the answers below are this
// subject's: a deck reordered around them would leave a verdict rendering another one.
const MEANING = DEMO_QUESTIONS.filter(
  (question) => question.subject.id === KANJI.id && question.kind === 'meaning',
)

function session(questions: readonly Question[] = MEANING) {
  render(
    <ReviewSession questions={questions} copy={COPY.review} subjectCopy={COPY.subject} />,
  )

  return screen.getByLabelText<HTMLInputElement>(COPY.review.prompt.meaning)
}

function answer(field: HTMLInputElement, typed: string) {
  fireEvent.change(field, { target: { value: typed } })
  fireEvent.keyDown(field, { key: 'Enter' })
}

describe('ReviewSession, asking', () => {
  // The heading and not any of the glyphs: the deck strip repeats the character, which is
  // why it is hidden from the accessibility tree in the first place.
  it('shows the character and names which of the two questions it is asking', () => {
    session()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(KANJI.characters)
    expect(screen.getByLabelText(COPY.review.prompt.meaning)).toBeTruthy()
  })

  it('takes the focus on the first card, since the keyboard never leaves this screen', () => {
    const field = session()

    expect(document.activeElement).toBe(field)
  })

  it('shows nothing of the sheet until something has been answered', () => {
    session()

    expect(screen.queryByText(COPY.subject.nuance)).toBeNull()
  })
})

describe('ReviewSession, answering', () => {
  it('opens the sheet on the answer that was wanted once a tier has decided', async () => {
    const field = session()

    answer(field, KANJI.meanings[0]?.text ?? '')

    expect(await screen.findByText(COPY.subject.nuance)).toBeTruthy()
  })

  // There is nothing left to compare it against, and the answer standing alone under the
  // character is the whole point of the card opening.
  it('takes the field away once the answer stood', async () => {
    const field = session()

    answer(field, KANJI.meanings[0]?.text ?? '')

    await waitFor(() => expect(screen.queryByLabelText(COPY.review.prompt.meaning)).toBeNull())
  })

  // v0.1 ships no fuzzy tier, so a meaning the exact tier cannot match is undecided rather
  // than wrong, and the reader is what resolves it.
  it('keeps an answer no tier could place, so it can be read again and corrected', async () => {
    const field = session()

    answer(field, 'quelque chose que rien ne place')

    expect(await screen.findByText(COPY.subject.nuance)).toBeTruthy()
    expect(screen.getByLabelText(COPY.review.prompt.meaning)).toBeTruthy()
  })

  it('opens the sheet with nothing to grade when the reader gives up instead of answering', async () => {
    session()

    fireEvent.click(screen.getByRole('button', { name: COPY.subject.reveal }))

    expect(await screen.findByText(COPY.subject.nuance)).toBeTruthy()
  })
})

describe('ReviewSession, moving on', () => {
  it('leaves the deck ungradable until an answer has been given', () => {
    session()

    expect(screen.getByRole('group', { name: COPY.review.askSelfGrade }).getAttribute('aria-disabled')).toBe('true')
  })

  it('ends where a session ends rather than on an empty card', () => {
    render(<ReviewSession questions={[]} copy={COPY.review} subjectCopy={COPY.subject} />)

    expect(screen.getByText(COPY.review.done)).toBeTruthy()
  })
})
