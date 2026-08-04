import type { z } from 'zod'

import type { KnowledgeSource, Waiting } from '@/core/knowledge-source'
import type { Component, Subject } from '@/core/subject'

import {
  assignmentCollection,
  mentionedIn,
  subjectCollection,
  toAssignment,
  toComponent,
  toSubject,
  userPayload,
} from './payload'
import type { SubjectEntry } from './payload'

// WaniKani behind `KnowledgeSource`. Everything specific to them lives here: their base URL, the
// revision they pin their shape to, the token, and the fact that a collection is paged by a URL
// they hand back.
//
// The token arrives as an argument rather than being read here, so this file is testable against
// a fake server and so nothing in data/ decides what a deployment holds. The route reads the
// environment and constructs the source.

const API = 'https://api.wanikani.com/v2'

// Their shape is versioned by date and the header is not optional: without it the response is
// whatever revision they consider current, which is a payload nobody wrote a parser for.
const REVISION = '20170710'

// What a URL can hold, and what their identifier filter is worth asking for at once. A real
// account waits on more than a thousand subjects across its two queues, so an unchunked list of
// identifiers is a request that fails on its length rather than on its content.
const IDS_PER_REQUEST = 500

export function wanikaniSource(token: string): KnowledgeSource {
  async function read(path: string): Promise<unknown> {
    const response = await fetch(path.startsWith(API) ? path : `${API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Wanikani-Revision': REVISION,
      },
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
    collection: z.ZodType<{ pages: { next_url: string | null }; data: Entry[] }>,
    first: string,
  ): Promise<Entry[]> {
    const entries: Entry[] = []
    let next: string | null = first

    while (next !== null) {
      const page = collection.parse(await read(next))
      entries.push(...page.data)
      next = page.pages.next_url

      if (next !== null && !next.startsWith(`${API}/`))
        throw new Error(`WaniKani handed back a cursor leaving the source: ${next}.`)
    }

    return entries
  }

  // The ceiling the reader's own subscription sets. A lapsed one grants nothing whatever number
  // it leaves behind: the level it reached while it was paid stays in the payload, and the
  // entitlement does not survive it.
  async function ceiling(): Promise<number> {
    const { subscription } = userPayload.parse(await read('/user')).data

    return subscription.active ? subscription.max_level_granted : 0
  }

  // The batches are independent, so they are asked together: only the walk inside a collection is
  // sequential, since the next URL comes out of the page before it. The request count is the same
  // either way, which is what the sixty a minute are counted in.
  async function subjectsIn(ids: readonly number[]): Promise<SubjectEntry[]> {
    const batches: Promise<SubjectEntry[]>[] = []

    for (let from = 0; from < ids.length; from += IDS_PER_REQUEST) {
      const batch = ids.slice(from, from + IDS_PER_REQUEST)
      batches.push(collect(subjectCollection, `/subjects?ids=${batch.join(',')}`))
    }

    return (await Promise.all(batches)).flat()
  }

  // What the subjects in hand mention, fetched in one pass and folded in: a card shows a
  // character and what it means where the source sends an identifier, and a number is neither.
  // Held to the same ceiling, because what a subject mentions runs upward as well as down: a
  // kanji names the vocabulary it appears in, which sits at levels the reader may not hold.
  async function mentions(
    entries: readonly SubjectEntry[],
    granted: number,
  ): Promise<Map<number, Component>> {
    const held = new Set(entries.map((entry) => entry.id))
    const wanted = [...new Set(entries.flatMap(mentionedIn))].filter((id) => !held.has(id))
    const named = new Map(entries.map((entry) => [entry.id, toComponent(entry)]))

    for (const entry of await subjectsIn(wanted))
      if (entry.data.level <= granted) named.set(entry.id, toComponent(entry))

    return named
  }

  // Asking for nothing would be a request for everything: an empty identifier filter is not a
  // narrower question, it is the whole collection one page at a time. The ordinary state of a
  // finished account reaches here.
  async function listSubjects(ids: readonly number[]): Promise<readonly Subject[]> {
    if (ids.length === 0) return []

    // Asked together, since neither answer is needed to ask the other question.
    const [granted, asked] = await Promise.all([ceiling(), subjectsIn(ids)])
    // Their reads are not filtered by the subscription and ours have to be: a free account is
    // sent the whole curriculum, and showing a level the reader's own plan does not include is
    // the one thing this client owes them.
    const entries = asked.filter((entry) => entry.data.level <= granted)

    const named = await mentions(entries, granted)

    return entries.map((entry) => toSubject(entry, named))
  }

  async function listWaiting(): Promise<Waiting> {
    const [lessons, reviews] = await Promise.all([
      collect(assignmentCollection, '/assignments?immediately_available_for_lessons'),
      collect(assignmentCollection, '/assignments?immediately_available_for_review'),
    ])

    // An assignment names a subject and not a level, so the ceiling is held where the subjects
    // are read. What is waiting is what the source says is waiting.
    return { lessons: lessons.map(toAssignment), reviews: reviews.map(toAssignment) }
  }

  return { listSubjects, listWaiting }
}
