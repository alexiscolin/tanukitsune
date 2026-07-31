import type { ReviewEntry } from './review-entry'

// The deck the loop runs on until `KnowledgeSource` supplies real assignments, written here
// rather than fetched because there is nothing to fetch from yet. Demo mode as the spec
// describes it is a seeded deck over the real corpus, which this is not: it carries no
// mnemonic, no nuance and no locale key, and it is replaced rather than grown.
//
// A reading accepts every reading the character carries on its own. Which single one an
// item wants is what an assignment says, and no assignment exists until `KnowledgeSource`
// is implemented. A meaning is accented as French is written, so an unaccented answer
// falls through to self-grade, which is what the cascade does with anything no tier placed.
const SUBJECTS = [
  { id: 'demo-ichi', characters: '一', meanings: ['un', 'une'], readings: ['いち', 'いつ'] },
  { id: 'demo-ni', characters: '二', meanings: ['deux'], readings: ['に', 'ふた'] },
  { id: 'demo-san', characters: '三', meanings: ['trois'], readings: ['さん', 'み'] },
  { id: 'demo-hito', characters: '人', meanings: ['personne', 'gens'], readings: ['ひと', 'じん', 'にん'] },
  { id: 'demo-dai', characters: '大', meanings: ['grand', 'grande'], readings: ['だい', 'たい', 'おお'] },
  { id: 'demo-yama', characters: '山', meanings: ['montagne'], readings: ['やま', 'さん'] },
  { id: 'demo-kawa', characters: '川', meanings: ['rivière'], readings: ['かわ', 'せん'] },
  { id: 'demo-kuchi', characters: '口', meanings: ['bouche'], readings: ['くち', 'こう'] },
  { id: 'demo-mizu', characters: '水', meanings: ['eau'], readings: ['みず', 'すい'] },
  { id: 'demo-hi', characters: '火', meanings: ['feu'], readings: ['ひ', 'か'] },
] as const

// Every meaning, then every reading, so a subject's two questions are never adjacent. Asked
// back to back, the second is answered from the first rather than from memory, which is the
// one thing a deck demonstrating retrieval must not do.
export const DEMO_QUEUE: readonly ReviewEntry[] = [
  ...SUBJECTS.map(
    ({ id, characters, meanings }): ReviewEntry => ({
      subjectId: id,
      characters,
      kind: 'meaning',
      accepted: meanings,
    }),
  ),
  ...SUBJECTS.map(
    ({ id, characters, readings }): ReviewEntry => ({
      subjectId: id,
      characters,
      kind: 'reading',
      accepted: readings,
    }),
  ),
]
