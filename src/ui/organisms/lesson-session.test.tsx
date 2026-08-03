import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { KANJI } from '@/core/demo-deck'
import { copyFor } from '@/core/site-copy'

import { LessonSession } from './lesson-session'

afterEach(cleanup)

const COPY = copyFor('fr')

// The deck names itself by what it does here, which is advance and nothing else: a lesson
// judges nothing, so it carries no verdict label for the group to be found by.
const deck = () => screen.getByRole('group', { name: COPY.review.next })

describe('LessonSession, ending', () => {
  // The end of a batch is a step of the loop like every other, so it takes the focus the same
  // way a review's end does. Only once a step has been left: a batch that arrives empty was
  // never a lesson, and taking the focus as the page loads is what no screen here does.
  it('takes the focus to the end once the last card has been left', async () => {
    render(<LessonSession deck={[KANJI]} copy={COPY.review} subjectCopy={COPY.subject} />)

    fireEvent.keyDown(deck(), { key: 'ArrowRight' })

    const done = await screen.findByText(COPY.review.done)
    await waitFor(() => expect(document.activeElement).toBe(done))
  })

  it('leaves the focus alone on a batch that arrives with nothing in it', () => {
    render(<LessonSession deck={[]} copy={COPY.review} subjectCopy={COPY.subject} />)

    expect(document.activeElement).toBe(document.body)
  })
})
