import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

// Two cards, so what the deck does on the first one is visible on the second rather than only
// in the absence of the first.
const PAIR = DEMO_QUESTIONS.filter((question) => question.subject.id === KANJI.id)

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

const deck = () => screen.getByRole('group', { name: COPY.review.askSelfGrade })

// The tally sets each number above the word that qualifies it, so the word is what finds the
// number rather than the other way round.
function tallyUnder(label: string): string | undefined {
  return screen.getByText(label).parentElement?.firstElementChild?.textContent ?? undefined
}

// A graded card leaves on a timer before the next one is asked, so an assertion made straight
// after the gesture reads the card that is still on its way out. Longer than that timer,
// because what is being asserted is what the deck settled on and not what it passed through.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400))
  })
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

  // The sheet is the only thing on the card that scrolls, and a subject with enough readings
  // fills it past the window. A region that scrolls and cannot be reached shows a keyboard
  // reader its first lines and hides the rest, so it carries a tab stop of its own.
  it('lets the keyboard reach the sheet it has to scroll', async () => {
    const field = session()

    answer(field, KANJI.meanings[0]?.text ?? '')
    await screen.findByText(COPY.subject.nuance)

    const sheet = screen.getByText(COPY.subject.nuance).closest('[class*="overflow-y-auto"]')

    expect(sheet?.getAttribute('tabindex')).toBe('0')
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

    expect(deck().getAttribute('aria-disabled')).toBe('true')
  })

  it('ends where a session ends rather than on an empty card', () => {
    render(<ReviewSession questions={[]} copy={COPY.review} subjectCopy={COPY.subject} />)

    expect(screen.getByText(COPY.review.done)).toBeTruthy()
  })

  it('leaves the deck gradable once something has been answered', async () => {
    const field = session()

    answer(field, KANJI.meanings[0]?.text ?? '')
    await screen.findByText(COPY.subject.nuance)

    expect(deck().getAttribute('aria-disabled')).toBeNull()
  })

  // The keyboard reaches the same two outcomes as the gesture, because a control only a
  // pointer can operate is one a keyboard reader does not have.
  it('grades from the keyboard when the deck itself is what holds the focus', async () => {
    const field = session(PAIR)

    answer(field, KANJI.meanings[0]?.text ?? '')
    await screen.findByText(COPY.subject.nuance)

    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    await settle()

    expect(screen.getByLabelText(COPY.review.prompt.reading)).toBeTruthy()
  })

  // An answer no tier could place leaves the field on the card, and the field is inside the
  // deck. An arrow moving the caret through what was typed must not reach the gesture that
  // grades: the reader is re-reading their answer, not ruling on it.
  it('does not grade the card when an arrow key moves the caret in the field', async () => {
    const field = session(PAIR)

    answer(field, 'quelque chose que rien ne place')
    await screen.findByText(COPY.subject.nuance)

    fireEvent.keyDown(screen.getByLabelText(COPY.review.prompt.meaning), { key: 'ArrowLeft' })
    await settle()

    expect(screen.queryByLabelText(COPY.review.prompt.reading)).toBeNull()
    expect(screen.getByLabelText(COPY.review.prompt.meaning)).toBeTruthy()
  })

  it('asks the next question and moves the counter with it', async () => {
    const field = session(PAIR)

    expect(screen.getByText(`/${PAIR.length}`)).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()

    answer(field, KANJI.meanings[0]?.text ?? '')
    await screen.findByText(COPY.subject.nuance)
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    await settle()

    expect(screen.getByLabelText(COPY.review.prompt.reading)).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  // Counted rather than read off the position: a card the reader got wrong and one they got
  // right are the same step through the deck, and only one of the two has to come back.
  it('counts a card graded wrong, and leaves the count alone on one graded right', async () => {
    const field = session(PAIR)

    answer(field, KANJI.meanings[0]?.text ?? '')
    await screen.findByText(COPY.subject.nuance)
    fireEvent.keyDown(deck(), { key: 'ArrowLeft' })
    await settle()

    const second = screen.getByLabelText<HTMLInputElement>(COPY.review.prompt.reading)
    answer(second, PAIR[1]?.accepted[0] ?? '')
    await screen.findByText(COPY.review.tally.missed)

    expect(tallyUnder(COPY.review.tally.missed)).toBe('1')
    expect(tallyUnder(COPY.review.tally.done)).toBe('0')
  })

  it('ends the session once the last card has been graded rather than on an empty one', async () => {
    const field = session()

    answer(field, KANJI.meanings[0]?.text ?? '')
    await screen.findByText(COPY.subject.nuance)
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    await settle()

    expect(screen.getByText(COPY.review.done)).toBeTruthy()
    expect(screen.queryByLabelText(COPY.review.prompt.meaning)).toBeNull()
  })

  // What tier 1 rejected it against, which is the only thing that makes a miss worth reading:
  // a verdict with nothing beside it says the answer was wrong and not what was wanted.
  it('shows the reading the card wanted when the answer missed', async () => {
    const reading = PAIR.filter((question) => question.kind === 'reading')
    render(
      <ReviewSession questions={reading} copy={COPY.review} subjectCopy={COPY.subject} />,
    )
    const field = screen.getByLabelText<HTMLInputElement>(COPY.review.prompt.reading)

    answer(field, 'ねこ')

    expect(await screen.findByText(COPY.subject.nuance)).toBeTruthy()
    // Substring, because a card with more than one accepted reading sets them on one line.
    expect(screen.getAllByText(reading[0]?.accepted[0] ?? '', { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getByLabelText(COPY.review.prompt.reading)).toBeTruthy()
  })

  // Giving up is not answering, so there is nothing for a tier to decide and the reader rules
  // on a card they never wrote on. It still grades and it still counts.
  it('grades a card the reader gave up on rather than answered', async () => {
    session(PAIR)

    fireEvent.click(screen.getByRole('button', { name: COPY.subject.reveal }))
    await screen.findByText(COPY.subject.nuance)

    expect(deck().getAttribute('aria-disabled')).toBeNull()

    fireEvent.keyDown(deck(), { key: 'ArrowLeft' })
    await settle()

    expect(screen.getByLabelText(COPY.review.prompt.reading)).toBeTruthy()
  })

  // The refusal is the field's, and it stops short of the cascade: nothing has been graded, so
  // the sheet stays shut and the deck stays closed to the gesture.
  it('refuses a reading that cannot become kana instead of grading it', async () => {
    const reading = PAIR.filter((question) => question.kind === 'reading')
    render(
      <ReviewSession questions={reading} copy={COPY.review} subjectCopy={COPY.subject} />,
    )
    const field = screen.getByLabelText<HTMLInputElement>(COPY.review.prompt.reading)

    answer(field, 'water')

    expect(await screen.findByText(COPY.review.unconverted)).toBeTruthy()
    expect(screen.queryByText(COPY.subject.nuance)).toBeNull()
    expect(deck().getAttribute('aria-disabled')).toBe('true')
  })
})
