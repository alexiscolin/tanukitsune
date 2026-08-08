import { createServer } from 'node:http'

import {
  FAKE_LESSONS,
  FAKE_REVIEWS,
  FAKE_STUDY_MATERIALS,
  FAKE_SUBJECTS,
  FAKE_USER,
} from './fake-account.ts'

// WaniKani answered by us, on a port of our own, so the suite can drive a session that is not the
// seeded deck. The source is pointed here by WANIKANI_API and runs unchanged: it builds their
// URLs, sends their revision header, walks their cursor and parses their envelope, so what this
// covers is the client rather than a stand-in for it.
//
// A process rather than a library inside the server: the interception has to sit in front of the
// application's own fetch, and the one place early enough to put it there fights the framework's
// two builds. A port answers both of them without either knowing.
//
// Run by Playwright, through Node's type stripping. The specifier below carries its extension
// because Node resolves it and not a bundler.

// Their shape is versioned by date and they refuse a request without it, so this does too: a
// source that stopped sending the header would otherwise pass here and meet a payload nobody
// wrote a parser for.
const REVISION = '20170710'

// One page and no cursor, which is what the account holds. Paging is asserted where a second page
// can be, in src/data/wanikani/source.test.ts.
function page<Entry>(data: readonly Entry[]) {
  return { pages: { next_url: null }, data }
}

// Their identifier filter, honoured rather than ignored: the source asks for the subjects one
// sitting needs and then for what those mention, and answering both with the whole account would
// hide a second pass that never happened.
function only(url: URL, parameter: string) {
  const asked = url.searchParams.get(parameter)
  if (asked === null) return FAKE_SUBJECTS.data

  const wanted = new Set(asked.split(',').map(Number))

  return FAKE_SUBJECTS.data.filter((entry) => wanted.has(entry.id))
}

function bodyFor(url: URL): object | null {
  if (url.pathname === '/v2/user') return FAKE_USER
  if (url.pathname === '/v2/study_materials') return FAKE_STUDY_MATERIALS
  if (url.pathname === '/v2/subjects') return page(only(url, 'ids'))
  // Which queue is asked for is a bare filter carrying no value, so it is read as present or
  // absent rather than compared, which is how they spell it and how the source sends it.
  if (url.pathname === '/v2/assignments')
    return url.searchParams.has('immediately_available_for_lessons') ? FAKE_LESSONS : FAKE_REVIEWS

  return null
}

// What a submission produced. Their created review carries an identifier that is always zero, so
// the stage under the resources they updated is the whole of what a caller can read. Two stages up
// from where the fixture put the assignment, which is a number no read serves and so cannot be
// mistaken for one.
const ADVANCED_TO = 5

// Every submission this process took, in order. The suite reads it to assert that a session
// replayed produces one set of submissions rather than two, which is an acceptance criterion no
// assertion against our own tables can make: what must not happen twice is the call leaving here.
const taken: unknown[] = []

// Whether this source is reachable. Set by the suite so a spec can drive the case the cache exists
// for: the reader has a session and the account cannot be reached. It answers by destroying the
// connection rather than by a status, because a status is an answer and what is being simulated is
// no answer at all.
let unreachable = false

const port = Number(process.argv[2])

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)
  const answer = (status: number, body: object) => {
    response.writeHead(status, { 'content-type': 'application/json' })
    response.end(JSON.stringify(body))
  }

  // Ours rather than theirs, and the only path answered unauthenticated: it says the process is
  // up, which is what the runner waits on before starting the server that reads it.
  if (url.pathname === '/') return answer(200, { listening: true })
  if (url.pathname === '/taken') return answer(200, { taken })

  if (url.pathname === '/unreachable') {
    unreachable = url.searchParams.get('is') === 'true'

    return answer(200, { unreachable })
  }

  if (unreachable) return request.destroy()

  // The token is never checked for what it says, only that it was sent: this account belongs to
  // nobody, and what the suite is covering is that the source authenticates at all.
  if (request.headers.authorization === undefined)
    return answer(401, { error: 'No token was sent.' })
  if (request.headers['wanikani-revision'] !== REVISION)
    return answer(400, { error: 'No revision was pinned.' })

  // The one write they take. What was sent is echoed under the review, so a spec can assert the
  // counts the flush aggregated without the fake keeping any state of its own.
  if (request.method === 'POST' && url.pathname === '/v2/reviews') {
    let sent = ''

    request.on('data', (chunk: Buffer) => (sent += chunk.toString()))

    return request.on('end', () => {
      const body: unknown = JSON.parse(sent === '' ? '{}' : sent)

      taken.push(body)

      answer(201, {
        id: 0,
        data: body,
        resources_updated: { assignment: { data: { srs_stage: ADVANCED_TO } } },
      })
    })
  }

  const body = bodyFor(url)

  return body === null
    ? answer(404, { error: `Nothing answers ${url.pathname}.` })
    : answer(200, body)
}).listen(port)
