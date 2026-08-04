import type { z } from 'zod'

import type { KnowledgeSource, Waiting } from '@/core/knowledge-source'
import type { Component, Subject } from '@/core/subject'

import {
  assignmentCollection,
  mentionedIn,
  studyMaterialCollection,
  subjectCollection,
  toAssignment,
  toComponent,
  toStudyMaterial,
  toSubject,
  userPayload,
} from './payload'
import type { StudyMaterial, SubjectEntry } from './payload'

// WaniKani behind `KnowledgeSource`. Everything specific to them lives here: their base URL, the
// revision they pin their shape to, the token, and the fact that a collection is paged by a URL
// they hand back.
//
// The token travels as an argument rather than being read here or captured once, so this file is
// testable against a fake server, nothing in data/ decides what a deployment holds, and no long
// lived object keeps a scope alive around it. The route reads the environment and calls this.

const API = 'https://api.wanikani.com/v2'

// Their shape is versioned by date and the header is not optional: without it the response is
// whatever revision they consider current, which is a payload nobody wrote a parser for.
const REVISION = '20170710'

// What a URL can hold, and what their identifier filter is worth asking for at once. A real
// account waits on more than a thousand subjects across its two queues, so an unchunked list of
// identifiers is a request that fails on its length rather than on its content.
const IDS_PER_REQUEST = 500

async function read(token: string, path: string): Promise<unknown> {
  const response = await fetch(path.startsWith(API) ? path : `${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Wanikani-Revision': REVISION },
  })

  // Loudly, and naming the status: a read that fails silently returns an empty queue, which is
  // indistinguishable from a session with nothing left in it. 429 is the one the reader will
  // meet, sixty requests a minute being shared between what we read and what we send.
  if (!response.ok)
    throw new Error(`WaniKani answered ${response.status} for ${path.replace(API, '')}.`)

  return response.json()
}

// Their cursor is a URL rather than a page number, so following it is the whole of paging. It
// comes out of a response body and is carried with the reader's token on it, so it is followed
// only where it stays inside the source: a cursor naming another host is that token handed to
// whoever answered, and one naming its own page is a walk with no end.
async function collect<Entry>(
  token: string,
  collection: z.ZodType<{ pages: { next_url: string | null }; data: Entry[] }>,
  first: string,
): Promise<Entry[]> {
  const entries: Entry[] = []
  const walked = new Set<string>()
  let next: string | null = first

  while (next !== null) {
    // Resolved before it is remembered, since the first path is relative and every cursor after
    // it is absolute, and two spellings of one page would walk it twice before closing the loop.
    const walkedTo = next.startsWith(API) ? next : `${API}${next}`
    if (walked.has(walkedTo))
      throw new Error(`WaniKani handed back a cursor it had already: ${walkedTo}.`)
    walked.add(walkedTo)

    const page = collection.parse(await read(token, walkedTo))
    entries.push(...page.data)
    next = page.pages.next_url

    if (next !== null && !next.startsWith(`${API}/`))
      throw new Error(`WaniKani handed back a cursor leaving the source: ${next}.`)
  }

  return entries
}

// Every filter by identifier is chunked the same way, and the batches are asked together: only
// the walk inside one collection is sequential, since the next URL comes out of the page before
// it. The request count is the same either way, which is what the sixty a minute are counted in.
async function batched<Entry>(
  token: string,
  collection: z.ZodType<{ pages: { next_url: string | null }; data: Entry[] }>,
  path: (batch: readonly number[]) => string,
  ids: readonly number[],
): Promise<Entry[]> {
  const batches: Promise<Entry[]>[] = []

  for (let from = 0; from < ids.length; from += IDS_PER_REQUEST)
    batches.push(collect(token, collection, path(ids.slice(from, from + IDS_PER_REQUEST))))

  return (await Promise.all(batches)).flat()
}

function subjectsIn(token: string, ids: readonly number[]): Promise<SubjectEntry[]> {
  return batched(token, subjectCollection, (batch) => `/subjects?ids=${batch.join(',')}`, ids)
}

// The ceiling the reader's own subscription sets, which is the whole of it: the source drops the
// number to three when a subscription lapses and holds it there for an account that never had
// one, so `active` says whether they are paying and nothing about what they may see. Gating on it
// grants a free reader nothing at all, and their three levels are exactly what this client owes
// them.
async function ceiling(token: string): Promise<number> {
  return userPayload.parse(await read(token, '/user')).data.subscription.max_level_granted
}

// What the reader wrote about these subjects, which is a second endpoint because it is theirs
// rather than the source's.
async function written(token: string, ids: readonly number[]): Promise<Map<number, StudyMaterial>> {
  const entries = await batched(
    token,
    studyMaterialCollection,
    (batch) => `/study_materials?subject_ids=${batch.join(',')}`,
    ids,
  )

  return new Map(entries.map(toStudyMaterial).map((entry) => [entry.subjectId, entry]))
}

// What the subjects in hand mention, fetched in one pass and folded in: a card shows a character
// and what it means where the source sends an identifier, and a number is neither. Held to the
// same ceiling, because what a subject mentions runs upward as well as down: a kanji names the
// vocabulary it appears in, which sits at levels the reader may not hold.
async function mentions(
  token: string,
  entries: readonly SubjectEntry[],
  granted: number,
): Promise<Map<number, Component>> {
  const held = new Set(entries.map((entry) => entry.id))
  const wanted = [...new Set(entries.flatMap(mentionedIn))].filter((id) => !held.has(id))
  const named = new Map(entries.map((entry) => [entry.id, toComponent(entry)]))

  for (const entry of await subjectsIn(token, wanted))
    if (entry.data.level <= granted) named.set(entry.id, toComponent(entry))

  return named
}

// Asking for nothing would be a request for everything: an empty identifier filter is not a
// narrower question, it is the whole collection one page at a time. The ordinary state of a
// finished account reaches here.
async function listSubjects(token: string, ids: readonly number[]): Promise<readonly Subject[]> {
  if (ids.length === 0) return []

  // Asked together, since no answer here is needed to ask any of the other questions.
  const [granted, asked, mine] = await Promise.all([
    ceiling(token),
    subjectsIn(token, ids),
    written(token, ids),
  ])
  // Their reads are not filtered by the subscription and ours have to be: a free account is sent
  // the whole curriculum, and showing a level the reader's own plan does not include is the one
  // thing this client owes them.
  const entries = asked.filter((entry) => entry.data.level <= granted)
  const named = await mentions(token, entries, granted)

  return entries.map((entry) => toSubject(entry, named, mine.get(entry.id)))
}

async function listWaiting(token: string): Promise<Waiting> {
  const [lessons, reviews] = await Promise.all([
    collect(token, assignmentCollection, '/assignments?immediately_available_for_lessons'),
    collect(token, assignmentCollection, '/assignments?immediately_available_for_review'),
  ])

  // An assignment names a subject and not a level, so the ceiling is held where the subjects are
  // read, and a queue can name more than a deck deals. What that costs a lapsed subscriber is in
  // docs/backlog.md.
  return { lessons: lessons.map(toAssignment), reviews: reviews.map(toAssignment) }
}

export function wanikaniSource(token: string): KnowledgeSource {
  return {
    listSubjects: (ids) => listSubjects(token, ids),
    listWaiting: () => listWaiting(token),
  }
}
