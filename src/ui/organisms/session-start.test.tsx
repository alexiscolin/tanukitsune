import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { copyFor } from '@/core/site-copy'

import { SessionStart } from './session-start'

afterEach(cleanup)

const COPY = copyFor('fr')

const QUEUES = {
  lesson: { count: 6, href: '/fr/session?flow=lesson' },
  review: { count: 12, href: '/fr/session?flow=review' },
}

function startScreen(queues = QUEUES) {
  render(
    <SessionStart
      title={COPY.title}
      tagline={COPY.tagline}
      copy={COPY.start}
      queues={queues}
    />,
  )
}

describe('SessionStart', () => {
  // The screen the installed app opens on, so what it owes the reader is what is waiting and
  // the way in, per flow. A count with no way in, or a way in with no count, is half of it.
  it('names each flow with what is waiting in it and links to that session', () => {
    startScreen()

    const lesson = screen.getByRole('link', { name: new RegExp(COPY.start.flow.lesson) })
    const review = screen.getByRole('link', { name: new RegExp(COPY.start.flow.review) })

    expect(lesson.getAttribute('href')).toBe(QUEUES.lesson.href)
    expect(lesson.textContent).toContain('6')
    expect(review.getAttribute('href')).toBe(QUEUES.review.href)
    expect(review.textContent).toContain('12')
  })

  // A session of nothing is not a session, and a control that leads to an empty deck lands the
  // reader on an end they never reached. The row stays, because a flow that is empty today is
  // the same flow tomorrow and its absence would read as a feature that is gone.
  it('offers no way into a flow with nothing waiting in it', () => {
    startScreen({ lesson: { count: 0, href: '/fr/session?flow=lesson' }, review: QUEUES.review })

    expect(screen.queryByRole('link', { name: new RegExp(COPY.start.flow.lesson) })).toBeNull()
    expect(screen.getByText(COPY.start.flow.lesson)).toBeTruthy()
  })
})
