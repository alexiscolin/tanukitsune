import type { z } from 'zod'

import type { KnowledgeSource, SubjectQuery, Waiting } from '@/core/knowledge-source'
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

// What a URL can hold, and what their identifier filter is worth asking for at once. The corpus
// generation walks ten levels and every subject in them mentions others, so an unchunked list of
// identifiers is a request that fails on its length rather than on its content.
const IDS_PER_REQUEST = 500

export function wanikaniSource(token: string): KnowledgeSource {
  // Read once per source and held, because every list has to know the ceiling and asking again
  // per list spends a request on an answer that cannot change inside one session.
  let granted: Promise<number> | undefined

  async function read(path: string): Promise<unknown> {
    const response = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
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

  // Their cursor is a URL rather than a page number, so following it is the whole of paging.
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
    }

    return entries
  }

  async function grantedLevel(): Promise<number> {
    granted ??= read('/user')
      .then((payload) => userPayload.parse(payload).data.subscription.max_level_granted)
      .catch((reason: unknown) => {
        granted = undefined

        throw reason
      })

    return granted
  }

  async function subjectsIn(query: SubjectQuery): Promise<SubjectEntry[]> {
    const filter = 'ids' in query ? `ids=${query.ids.join(',')}` : `levels=${query.levels.join(',')}`

    return collect(subjectCollection, `/subjects?${filter}`)
  }

  // What the subjects in hand mention, fetched in one pass and folded in: a card shows a
  // character and what it means where the source sends an identifier, and a number is neither.
  async function mentions(entries: readonly SubjectEntry[]): Promise<Map<number, Component>> {
    const held = new Set(entries.map((entry) => entry.id))
    const wanted = [...new Set(entries.flatMap(mentionedIn))].filter((id) => !held.has(id))
    const named = new Map(entries.map((entry) => [entry.id, toComponent(entry)]))

    for (let from = 0; from < wanted.length; from += IDS_PER_REQUEST) {
      const batch = await subjectsIn({ ids: wanted.slice(from, from + IDS_PER_REQUEST) })
      for (const entry of batch) named.set(entry.id, toComponent(entry))
    }

    return named
  }

  async function listSubjects(query: SubjectQuery): Promise<readonly Subject[]> {
    const ceiling = await grantedLevel()
    // Their reads are not filtered by the subscription and ours have to be: a free account is
    // sent the whole curriculum, and showing a level the reader's own plan does not include is
    // the one thing this client owes them. Filtered before the mentions are resolved, so nothing
    // beyond the ceiling is even fetched a second time.
    const entries = (await subjectsIn(query)).filter((entry) => entry.data.level <= ceiling)
    const named = await mentions(entries)

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

  return { grantedLevel, listSubjects, listWaiting }
}
