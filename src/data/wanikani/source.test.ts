import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { wanikaniSource } from './source'

// The transport against a server that answers like theirs, which is what MSW is here for: it
// mocks third-party HTTP and never our own data layer. What is checked is what only a real
// request can be wrong about, the headers, the cursor, the ceiling and the refusal.

const API = 'https://api.wanikani.com/v2'

// Two answers most of these cases are not about: an account with nothing written on it, and a
// subscription that grants the whole curriculum. Both are defaults rather than a handler in each,
// and the cases that are about them say so by overriding.
const server = setupServer(
  http.get(`${API}/study_materials`, () => page([])),
  grants(60),
)

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

// The source holds `max_level_granted` at three for an account that is not paying and at sixty
// for one that is, so the two are one number rather than a number and a flag.
function grants(level: number) {
  return http.get(`${API}/user`, () =>
    HttpResponse.json({
      data: { subscription: { max_level_granted: level, active: level > 3 } },
    }),
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

  // A free account is not a lapsed one and neither is granted nothing: the source drops the number
  // to three and keeps it there, so the three levels it names are what the reader may study. A
  // client reading the paid flag instead serves them an empty app.
  it('grants a free account the levels its own subscription names', async () => {
    server.use(
      grants(3),
      http.get(`${API}/subjects`, () => page([subject(1, 3), subject(2, 4)])),
    )

    const subjects = await wanikaniSource('a-token').listSubjects([1, 2])

    expect(subjects.map((entry) => entry.id)).toEqual([1])
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

  // What the reader wrote is theirs and arrives from a second endpoint, so a subject that reaches
  // the card without it is one whose own synonyms the grader will refuse.
  it("folds what the reader wrote onto the subject it is about", async () => {
    server.use(
      http.get(`${API}/subjects`, () => page([subject(451, 1)])),
      http.get(`${API}/study_materials`, () =>
        page([
          {
            id: 65231,
            data: {
              subject_id: 451,
              meaning_synonyms: ['sous la ligne'],
              meaning_note: 'à ne pas confondre avec 上',
              reading_note: null,
            },
          },
        ]),
      ),
    )

    const [only] = await wanikaniSource('a-token').listSubjects([451])

    expect(only?.synonyms).toEqual(['sous la ligne'])
    expect(only?.meaningNote).toBe('à ne pas confondre avec 上')
    expect(only?.readingNote).toBeNull()
  })

  // The ordinary state of a finished account. An empty filter is not a request for nothing, it is
  // a request for the whole curriculum, one page at a time.
  it('asks the source nothing when nothing is waiting', async () => {
    expect(await wanikaniSource('a-token').listSubjects([])).toEqual([])
  })

  // The cursor is followed only forward: a page naming one already walked is a loop with no end,
  // and the walk is what carries the reader's token.
  it('refuses a cursor it has already followed', async () => {
    server.use(
      grants(60),
      http.get(`${API}/subjects`, () => page([subject(1, 1)], `${API}/subjects?ids=1`)),
    )

    await expect(wanikaniSource('a-token').listSubjects([1])).rejects.toThrow('already')
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

  // Their unit is the assignment and two counts of wrong answers, where ours is a row per
  // question, so what leaves here is what their API takes and not what the queue holds.
  it('submits a review against the assignment, with a count per kind', async () => {
    let sent: unknown = null

    server.use(
      http.post(`${API}/reviews`, async ({ request }) => {
        sent = await request.json()

        return HttpResponse.json(
          { id: 0, resources_updated: { assignment: { data: { srs_stage: 5 } } } },
          { status: 201 },
        )
      }),
    )

    const advanced = await wanikaniSource('a-token').submitReview({
      assignmentId: 8002,
      incorrectMeanings: 1,
      incorrectReadings: 2,
    })

    expect(sent).toEqual({
      review: {
        assignment_id: 8002,
        incorrect_meaning_answers: 1,
        incorrect_reading_answers: 2,
      },
    })
    // The stage they landed the item on, which is theirs to decide and is never computed here.
    expect(advanced.srsStage).toBe(5)
  })

  // A submission carries the same two headers a read does. Without the revision their answer is a
  // shape nobody parses, and a submission parsed wrong is an item advanced on a guess.
  it('sends the revision and the token when it submits', async () => {
    const seen: Headers[] = []

    server.use(
      http.post(`${API}/reviews`, ({ request }) => {
        seen.push(request.headers)

        return HttpResponse.json(
          { id: 0, resources_updated: { assignment: { data: { srs_stage: 1 } } } },
          { status: 201 },
        )
      }),
    )

    await wanikaniSource('a-token').submitReview({
      assignmentId: 8001,
      incorrectMeanings: 0,
      incorrectReadings: 0,
    })

    expect(seen[0]?.get('Wanikani-Revision')).toBe('20170710')
    expect(seen[0]?.get('Authorization')).toBe('Bearer a-token')
  })

  // Their 422 means the item was not due, so the submission is dropped and the state re-read
  // rather than sent again. What this layer owes is the status, named, so the caller can tell that
  // case from a network that dropped.
  it('propagates a refused submission naming the status', async () => {
    server.use(http.post(`${API}/reviews`, () => new HttpResponse(null, { status: 422 })))

    await expect(
      wanikaniSource('a-token').submitReview({
        assignmentId: 8001,
        incorrectMeanings: 0,
        incorrectReadings: 0,
      }),
    ).rejects.toThrow('answered 422')
  })

  // Sixty requests a minute are shared between what we read and what we send, so this is the
  // refusal the reader will actually meet. It propagates naming the status: a read that failed
  // quietly returns an empty queue, which reads exactly like a session with nothing left in it.
  it('propagates a refusal naming the status the source answered', async () => {
    server.use(http.get(`${API}/assignments`, () => new HttpResponse(null, { status: 429 })))

    await expect(wanikaniSource('a-token').listWaiting()).rejects.toThrow('answered 429')
  })
})
