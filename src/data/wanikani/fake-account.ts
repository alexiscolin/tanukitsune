import type { z } from 'zod'

import type {
  assignmentCollection,
  studyMaterialCollection,
  subjectCollection,
  userPayload,
} from './payload'

// The account the end-to-end suite reviews, which is nobody's. Every session the suite could run
// before this was the seeded deck, because a server started with a token deals whoever's account
// the machine holds and a suite asserting what is waiting would then pass or fail on somebody's
// study day.
//
// Written as the wire rather than as `Subject` and `Assignment`, and typed against the parsers in
// payload.ts, so the source's own HTTP is what the suite drives: the revision header, the cursor
// walk, the subscription ceiling and the parse all run exactly as they do against theirs.
//
// The identifiers are five digits and start at 9001, far from the levels one to five the seeded
// deck is drawn from, so a card belonging to the wrong deck names itself.

type Subjects = z.infer<typeof subjectCollection>
type Assignments = z.infer<typeof assignmentCollection>
type StudyMaterials = z.infer<typeof studyMaterialCollection>

// One page and no cursor. Paging is exercised by the unit tests in source.test.ts, where a
// second page can be asserted on; what this account is for is a session, and a queue of five
// spread over two pages would only make the fixture harder to read.
function page<Entry>(data: readonly Entry[]) {
  return { pages: { next_url: null }, data: [...data] }
}

function radical(id: number, characters: string, meaning: string) {
  return {
    id,
    object: 'radical',
    data: { level: 1, hidden_at: null, characters, meanings: [primary(meaning)] },
  }
}

function primary(meaning: string) {
  return { meaning, primary: true, accepted_answer: true }
}

function said(reading: string) {
  return { reading, primary: true, accepted_answer: true }
}

// The whole curriculum, granted and paid for: what the ceiling costs a lapsed subscriber is its
// own case, and it belongs to the unit tests rather than to a session the suite drives.
export const FAKE_USER: z.infer<typeof userPayload> = {
  data: { subscription: { max_level_granted: 60, active: true } },
}

// Nothing written on it. The join is exercised where it can be asserted on, which is source.test.ts.
export const FAKE_STUDY_MATERIALS: StudyMaterials = page<StudyMaterials['data'][number]>([])

// A radical asked for its meaning alone, then a kanji and a vocabulary asked for both. Three
// subjects and five questions, which is the smallest deck where a subject held back for want of
// its second answer is a case the flush will meet.
export const FAKE_REVIEWS: Assignments = page([
  { id: 8001, data: { subject_id: 9001, srs_stage: 4 } },
  { id: 8002, data: { subject_id: 9002, srs_stage: 2 } },
  { id: 8003, data: { subject_id: 9003, srs_stage: 1 } },
])

// Stage zero, which is what makes an assignment a lesson: unlocked and never studied.
export const FAKE_LESSONS: Assignments = page([
  { id: 8004, data: { subject_id: 9004, srs_stage: 0 } },
  { id: 8005, data: { subject_id: 9005, srs_stage: 0 } },
])

// Six for five queued, because a card shows what its subject mentions and 9006 is mentioned by a
// kanji without being due itself. Fetching it is the second pass the source makes, and leaving it
// out would let that pass be dropped without a suite noticing.
export const FAKE_SUBJECTS: Subjects = page([
  radical(9001, '大', 'big'),
  {
    id: 9002,
    object: 'kanji',
    data: {
      level: 1,
      hidden_at: null,
      characters: '女',
      meanings: [primary('woman')],
      readings: [{ ...said('じょ'), type: 'onyomi' as const }],
      component_subject_ids: [9001],
      amalgamation_subject_ids: [9006],
    },
  },
  {
    id: 9003,
    object: 'vocabulary',
    data: {
      level: 1,
      hidden_at: null,
      characters: '人',
      meanings: [primary('person')],
      readings: [said('ひと')],
      parts_of_speech: ['noun'],
    },
  },
  radical(9004, '山', 'mountain'),
  {
    id: 9005,
    object: 'kanji',
    data: {
      level: 1,
      hidden_at: null,
      characters: '川',
      meanings: [primary('river')],
      readings: [{ ...said('せん'), type: 'onyomi' as const }],
      component_subject_ids: [9004],
    },
  },
  {
    id: 9006,
    object: 'vocabulary',
    data: {
      level: 1,
      hidden_at: null,
      characters: '女の人',
      meanings: [primary('woman')],
      readings: [said('おんなのひと')],
      component_subject_ids: [9002],
    },
  },
])

// What the first review card asks, spelled from the queue rather than repeated: the deck asks
// every meaning before any reading, so this is the subject the first assignment names.
export function firstReviewed(): Subjects['data'][number] {
  const [first] = FAKE_REVIEWS.data
  const subject = FAKE_SUBJECTS.data.find((entry) => entry.id === first?.data.subject_id)

  if (subject === undefined) throw new Error('The fake account queues a subject it does not hold.')

  return subject
}
