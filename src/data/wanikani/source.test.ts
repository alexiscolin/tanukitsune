import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { wanikaniSource } from './source'

// The transport against a server that answers like theirs, which is what MSW is here for: it
// mocks third-party HTTP and never our own data layer. What is checked is what only a real
// request can be wrong about, the headers, the cursor, the ceiling and the refusal.

const API = 'https://api.wanikani.com/v2'

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  server.resetHandlers()
})
afterAll(() => {
  server.close()
})

function subject(id: number, level: number) {
  return {
    id,
    object: 'kanji',
    data: {
      level,
      hidden_at: null,
      characters: '下',
      meanings: [{ meaning: 'Below', primary: true, accepted_answer: true }],
    },
  }
}

function page(data: unknown[], next: string | null = null) {
  return HttpResponse.json({ pages: { next_url: next }, data })
}

function grants(level: number, active = true) {
  return http.get(`${API}/user`, () =>
    HttpResponse.json({ data: { subscription: { max_level_granted: level, active } } }),
  )
}

describe('wanikaniSource', () => {
  // Without the revision the answer is whatever shape they consider current, which is a payload
  // nobody wrote a parser for. Without the token there is no answer at all.
  it('carries the token and the revision they pin their shape to', async () => {
    const seen: { authorization: string | null; revision: string | null }[] = []

    server.use(
      http.get(`${API}/assignments`, ({ request }) => {
        seen.push({
          authorization: request.headers.get('authorization'),
          revision: request.headers.get('wanikani-revision'),
        })

        return page([])
      }),
    )

    await wanikaniSource('a-token').listWaiting()

    expect(seen).toContainEqual({ authorization: 'Bearer a-token', revision: '20170710' })
  })

  // Their cursor is a URL they hand back, so a client that reads one page reads a truncated
  // curriculum and calls it the whole one.
  it('follows the cursor until the source stops handing one back', async () => {
    server.use(
      grants(10),
      http.get(`${API}/subjects`, ({ request }) => {
        const asked = new URL(request.url)

        return asked.searchParams.get('page_after_id') === null
          ? page([subject(1, 1)], `${API}/subjects?page_after_id=1`)
          : page([subject(2, 1)])
      }),
    )

    const subjects = await wanikaniSource('a-token').listSubjects([1, 2])

    expect(subjects.map((entry) => entry.id)).toEqual([1, 2])
  })

  // The cursor is a URL out of a response body, and it is carried with the reader's token on it.
  // One naming another host is that token handed to whoever answered, and one naming itself is a
  // loop, so it is followed only where it stays inside the source.
  it('refuses a cursor that leads anywhere but the source', async () => {
    server.use(
      grants(10),
      http.get(`${API}/subjects`, () => page([subject(1, 1)], 'https://elsewhere.test/subjects')),
    )

    await expect(wanikaniSource('a-token').listSubjects([1])).rejects.toThrow('elsewhere.test')
  })

  // Their reads are not filtered by the subscription and ours have to be: a free account is sent
  // the whole curriculum, and showing a level the reader's own plan does not include is the one
  // thing this client owes them.
  it('drops every level beyond what the subscription grants', async () => {
    server.use(
      grants(3),
      http.get(`${API}/subjects`, () => page([subject(1, 3), subject(2, 4)])),
    )

    const subjects = await wanikaniSource('a-token').listSubjects([1, 2])

    expect(subjects.map((entry) => entry.id)).toEqual([1])
  })

  // A lapsed subscription grants nothing, whatever level it granted while it was paid: the
  // number stays where it was and the entitlement does not.
  it('shows no level at all while the subscription is lapsed', async () => {
    server.use(
      grants(60, false),
      http.get(`${API}/subjects`, () => page([subject(1, 1)])),
    )

    expect(await wanikaniSource('a-token').listSubjects([1])).toEqual([])
  })

  // What a subject mentions runs upward as well as down: a kanji names the vocabulary it appears
  // in, which sits at levels the reader may not have been granted. The ceiling is the same one.
  it('names no mentioned subject above the ceiling either', async () => {
    server.use(
      grants(3),
      http.get(`${API}/subjects`, ({ request }) => {
        const asked = new URL(request.url).searchParams.get('ids')

        return asked === '1'
          ? page([
              {
                ...subject(1, 3),
                data: { ...subject(1, 3).data, amalgamation_subject_ids: [2] },
              },
            ])
          : page([subject(2, 20)])
      }),
    )

    const [only] = await wanikaniSource('a-token').listSubjects([1])

    expect(only?.usedIn).toEqual([])
  })

  // The identifier filter travels in the URL, and a queue the size of a real account's is a URL
  // that fails on its length rather than on its content.
  it('asks for identifiers in batches a URL can carry', async () => {
    const asked: number[] = []

    server.use(
      grants(10),
      http.get(`${API}/subjects`, ({ request }) => {
        const ids = new URL(request.url).searchParams.get('ids')?.split(',') ?? []
        asked.push(ids.length)

        return page(ids.map((id) => subject(Number(id), 1)))
      }),
    )

    const many = Array.from({ length: 1201 }, (_, index) => index + 1)
    const subjects = await wanikaniSource('a-token').listSubjects(many)

    expect(subjects).toHaveLength(1201)
    expect(Math.max(...asked)).toBeLessThanOrEqual(500)
  })

  // The ordinary state of a finished account. An empty filter is not a request for nothing, it is
  // a request for the whole curriculum, one page at a time.
  it('asks the source nothing when nothing is waiting', async () => {
    expect(await wanikaniSource('a-token').listSubjects([])).toEqual([])
  })

  it('reads the two lists apart, because a lesson teaches and a review asks', async () => {
    server.use(
      http.get(`${API}/assignments`, ({ request }) => {
        const asked = new URL(request.url)
        const lessons = asked.searchParams.has('immediately_available_for_lessons')

        return page([
          {
            id: lessons ? 10 : 20,
            data: { subject_id: lessons ? 440 : 451, srs_stage: lessons ? 0 : 4 },
          },
        ])
      }),
    )

    const waiting = await wanikaniSource('a-token').listWaiting()

    expect(waiting.lessons.map((entry) => entry.subjectId)).toEqual([440])
    expect(waiting.reviews.map((entry) => entry.subjectId)).toEqual([451])
  })

  // Sixty requests a minute are shared between what we read and what we send, so this is the
  // refusal the reader will actually meet. It propagates naming the status: a read that failed
  // quietly returns an empty queue, which reads exactly like a session with nothing left in it.
  it('propagates a refusal naming the status the source answered', async () => {
    server.use(http.get(`${API}/assignments`, () => new HttpResponse(null, { status: 429 })))

    await expect(wanikaniSource('a-token').listWaiting()).rejects.toThrow('answered 429')
  })
})
