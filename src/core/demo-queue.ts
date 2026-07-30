import type { ReviewEntry } from './review-entry'

// The deck demo mode runs on, written here rather than fetched, because the demo ships
// without a token and has to work in a browser that has never been online.
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

export const DEMO_QUEUE: readonly ReviewEntry[] = SUBJECTS.flatMap(
  ({ id, characters, meanings, readings }): ReviewEntry[] => [
    { subjectId: id, characters, kind: 'meaning', accepted: meanings },
    { subjectId: id, characters, kind: 'reading', accepted: readings },
  ],
)
