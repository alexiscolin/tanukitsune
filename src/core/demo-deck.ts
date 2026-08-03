// The seeded deck the demo runs on, and the deck every story is judged against. Six subjects
// taken from the source's own levels one to five, so every branch of the card is rendered
// against a shape that really arrives rather than one that was convenient to write.
//
// It is written here rather than fetched because there is nothing to fetch from yet:
// `KnowledgeSource` is not implemented, and docs/specs/v0.1.md describes demo mode as a
// seeded deck over the real corpus, which this is not. It carries no corpus version and no
// locale key, and it is replaced rather than grown.
//
// What is kept from the source is the structure and the characters; every French line is
// ours, since docs/specs/v0.1.md refuses a corpus derived from their English, and the raw
// payload stays in info/ which git ignores.

import type { AnswerKind } from './answer-kind'
import type { AcceptedAnswers } from './grading/judge-port'
import { acceptedIn } from './subject'
import type { Component, Subject } from './subject'

// Between them the six cover: a character with eight readings of which two are accepted, a word
// with five meanings, a word six characters long, a word carrying six whitelisted synonyms
// and four parts of speech, a radical with no character at all, and a vocabulary written in
// kana.

const GROUND: Component = { id: 440, characters: '一', meaning: 'sol' }
const HOOK: Component = { id: 8762, characters: 'ト', meaning: 'crochet' }
const COLOUR: Component = { id: 507, characters: '色', meaning: 'couleur' }
const REPEAT: Component = { id: 8769, characters: '々', meaning: 'répétition' }
const ABOVE: Component = { id: 450, characters: '上', meaning: 'dessus' }
const EXIT: Component = { id: 449, characters: '出', meaning: 'sortie' }

// Eight readings, of which the source accepts two. The six others are real and are taught
// without being answers, which is the case a card that only showed accepted readings would
// hide entirely.
export const KANJI: Subject = {
  id: 451,
  type: 'kanji',
  level: 1,
  characters: '下',
  characterImage: null,
  meanings: [
    { text: 'dessous', primary: true, accepted: true },
    { text: 'sous', primary: false, accepted: true },
    { text: 'bas', primary: false, accepted: true },
  ],
  readings: [
    { text: 'カ', primary: true, accepted: true, type: 'onyomi' },
    { text: 'ゲ', primary: false, accepted: true, type: 'onyomi' },
    { text: 'した', primary: false, accepted: false, type: 'kunyomi' },
    { text: 'さ', primary: false, accepted: false, type: 'kunyomi' },
    { text: 'くだ', primary: false, accepted: false, type: 'kunyomi' },
    { text: 'お', primary: false, accepted: false, type: 'kunyomi' },
    { text: 'しも', primary: false, accepted: false, type: 'kunyomi' },
    { text: 'もと', primary: false, accepted: false, type: 'kunyomi' },
  ],
  partsOfSpeech: [],
  sentences: [],
  components: [GROUND, HOOK],
  usedIn: [
    { id: 2493, characters: '下', meaning: 'le dessous' },
    { id: 2506, characters: '地下', meaning: 'sous-sol' },
  ],
  similar: [],
  hasAudio: false,
  refused: [],
  alsoAccepted: ['en dessous'],
  jlpt: 'N5',
  nuance: "La position, pas le mouvement : descendre se dit avec un verbe, pas avec ce kanji seul.",
  mnemonic: "Un crochet ト accroché sous le sol 一 : ce qui est en dessous.",
  patterns: [],
  hidden: false,
  srsStage: null,
  synonyms: [],
  meaningNote: 'Je le confonds toujours avec 上. Le trait part vers le bas.',
  readingNote: null,
}

// Five meanings, all accepted, and two the source refuses outright because they are the
// transitive verb and this one is intransitive.
export const VERB: Subject = {
  id: 2557,
  type: 'vocabulary',
  level: 2,
  characters: '出る',
  characterImage: null,
  meanings: [
    { text: 'sortir', primary: true, accepted: true },
    { text: 'partir', primary: false, accepted: true },
    { text: 'assister', primary: false, accepted: true },
    { text: 'apparaître', primary: false, accepted: true },
    { text: "s'en aller", primary: false, accepted: true },
  ],
  readings: [{ text: 'でる', primary: true, accepted: true, type: null }],
  partsOfSpeech: ['verbe intransitif', 'verbe ichidan'],
  sentences: [
    { ja: '八時に家を出る。', fr: 'Je pars de la maison à huit heures.' },
    { ja: '会議に出ますか。', fr: 'Est-ce que tu assistes à la réunion ?' },
  ],
  components: [EXIT],
  usedIn: [],
  similar: [],
  hasAudio: true,
  refused: ['retirer', 'sortir quelque chose'],
  alsoAccepted: [],
  jlpt: 'N5',
  nuance:
    "Intransitif : c'est le sujet qui sort. Faire sortir quelque chose est un autre verbe, 出す.",
  mnemonic: "La sortie 出 suivie de る : l'action de la franchir.",
  patterns: [
    { pattern: '家を出る', gloss: 'quitter la maison, le lieu quitté avec を' },
    { pattern: '会議に出る', gloss: 'assister à la réunion, la destination avec に' },
    { pattern: '結果が出る', gloss: 'le résultat sort, ce qui apparaît avec が' },
  ],
  hidden: false,
  srsStage: null,
  synonyms: [],
  meaningNote: null,
  readingNote: null,
}

// Six characters, which is the length that decides the size of every glyph on the card.
export const LONG: Subject = {
  id: 8959,
  type: 'vocabulary',
  level: 3,
  characters: 'テーブルの上',
  characterImage: null,
  meanings: [
    { text: 'sur la table', primary: true, accepted: true },
    { text: 'le dessus de la table', primary: false, accepted: true },
  ],
  readings: [{ text: 'テーブルのうえ', primary: true, accepted: true, type: null }],
  partsOfSpeech: ['expression'],
  sentences: [{ ja: 'テーブルの上に本があります。', fr: 'Il y a un livre sur la table.' }],
  components: [ABOVE],
  usedIn: [],
  similar: [],
  hasAudio: true,
  refused: ['sous la table'],
  alsoAccepted: ['au-dessus de la table'],
  jlpt: 'N5',
  nuance: 'Une expression figée : の relie le meuble à sa surface, et cet ordre ne change pas.',
  mnemonic: null,
  patterns: [{ pattern: 'テーブルの上に置く', gloss: 'poser sur la table, le point d’arrivée avec に' }],
  hidden: false,
  srsStage: null,
  synonyms: [],
  meaningNote: null,
  readingNote: null,
}

// Six whitelisted synonyms and four parts of speech. None of the six is shown: a card listing
// them would read as six meanings rather than as one meaning spelled six ways.
export const MANY: Subject = {
  id: 2773,
  type: 'vocabulary',
  level: 5,
  characters: '色々',
  characterImage: null,
  meanings: [
    { text: 'divers', primary: true, accepted: true },
    { text: 'diversement', primary: false, accepted: true },
  ],
  readings: [{ text: 'いろいろ', primary: true, accepted: true, type: null }],
  partsOfSpeech: ['adjectif en な', 'adverbe', 'nom', 'adjectif en の'],
  sentences: [{ ja: '色々なことがありました。', fr: "Il s'est passé toutes sortes de choses." }],
  components: [COLOUR, REPEAT],
  usedIn: [],
  similar: [],
  hasAudio: true,
  refused: [],
  alsoAccepted: [
    'varié',
    'toutes sortes de',
    'de toutes sortes',
    'variété',
    'ceci et cela',
    'différents',
  ],
  jlpt: 'N5',
  nuance: 'La variété, jamais la quantité : beaucoup de choses se dit autrement.',
  mnemonic: 'La couleur 色 redoublée par 々 : des couleurs et des couleurs, donc de tout.',
  patterns: [
    { pattern: '色々な人', gloss: 'des gens de toutes sortes, l’adjectif avec な' },
    { pattern: '色々と', gloss: 'de diverses façons, l’adverbe avec と' },
  ],
  hidden: false,
  srsStage: null,
  synonyms: [],
  meaningNote: null,
  readingNote: null,
}

// No Unicode character at all, which is a shape the source really sends: it invents bricks
// that no encoding carries, so the card has to render one from a vector. The brick is drawn
// here and named here, since docs/specs/v0.1.md refuses their invented set, names included.
export const IMAGED: Subject = {
  id: 8766,
  type: 'radical',
  level: 4,
  characters: null,
  characterImage: '/demo/radical-cle-barree.svg',
  meanings: [{ text: 'clé barrée', primary: true, accepted: true }],
  readings: [],
  partsOfSpeech: [],
  sentences: [],
  components: [],
  usedIn: [{ id: 9451, characters: '丐', meaning: 'mendier' }],
  similar: [],
  hasAudio: false,
  refused: [],
  alsoAccepted: [],
  jlpt: null,
  nuance: "Une brique de découpage, pas une clé traditionnelle : elle sert à lire le caractère et ne se rencontre jamais seule.",
  mnemonic: null,
  patterns: [],
  hidden: false,
  srsStage: null,
  synonyms: [],
  meaningNote: null,
  readingNote: null,
}

export const KANA_VOCABULARY: Subject = {
  id: 9210,
  type: 'kanaVocabulary',
  level: 5,
  characters: 'ありがとう',
  characterImage: null,
  meanings: [{ text: 'merci', primary: true, accepted: true }],
  readings: [],
  partsOfSpeech: ['interjection'],
  sentences: [{ ja: 'ありがとうございます。', fr: 'Merci beaucoup.' }],
  components: [],
  usedIn: [],
  similar: [],
  hasAudio: true,
  refused: [],
  alsoAccepted: ['merci bien'],
  jlpt: 'N4',
  nuance: 'Familier. La forme polie ajoute ございます, et on ne la coupe pas entre amis.',
  mnemonic: null,
  patterns: [{ pattern: '〜てくれてありがとう', gloss: 'merci de m’avoir fait telle chose' }],
  hidden: false,
  srsStage: null,
  synonyms: ['merci beaucoup'],
  meaningNote: null,
  readingNote: null,
}

export const DEMO_DECK: readonly Subject[] = [KANJI, VERB, LONG, MANY, IMAGED, KANA_VOCABULARY]

// One question, which is a subject asked for one of the two things it can be asked for.
export type Question = {
  readonly subject: Subject
  readonly kind: AnswerKind
  readonly accepted: AcceptedAnswers
}

// What tells one question from another, and it is the pair rather than the subject: the same
// subject is asked twice in a deck, once for its meaning and once for its reading. Three things
// key on it and two of them are load-bearing, the card the deck is dealing and the field that
// remounts per question, so they are the same string by construction rather than by agreement.
export function questionKey({ subject, kind }: Question): string {
  return `${subject.id}-${kind}`
}

// What a tier may accept, which is not everything the card shows: a gloss can be listed and
// refused in the same breath, and the whitelist is accepted without ever being shown. A
// question with nothing acceptable cannot be asked at all, so it is dropped rather than
// guarded against at the moment of grading.
function ask(subject: Subject, kind: AnswerKind): Question | null {
  const glosses = kind === 'reading' ? subject.readings : subject.meanings
  const shown = acceptedIn(glosses)
  const [first, ...rest] = kind === 'meaning' ? [...shown, ...subject.alsoAccepted] : shown

  return first === undefined ? null : { subject, kind, accepted: [first, ...rest] }
}

// Every meaning, then every reading, so a subject's two questions are never adjacent. Asked
// back to back, the second is answered from the first rather than from memory, which is the
// one thing a deck demonstrating retrieval must not do. Content the source has withdrawn is
// never asked: a subject that must not be rendered must not be queued.
const ASKABLE = DEMO_DECK.filter((subject) => !subject.hidden)

export const DEMO_QUESTIONS: readonly Question[] = [
  ...ASKABLE.map((subject) => ask(subject, 'meaning')),
  ...ASKABLE.map((subject) => ask(subject, 'reading')),
].filter((question): question is Question => question !== null)
