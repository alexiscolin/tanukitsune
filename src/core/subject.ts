// A subject as the interface consumes it, shaped on what the source actually sends so the
// design is fitted to real data rather than to a card that happens to look good. Every
// field names where it comes from, because `KnowledgeSource` is not written yet and this is
// where the mapping is currently visible.
//
// It is our view and not the wire: the wire shape belongs to the port, and a component
// reading snake_case straight off an HTTP response is a boundary that was never drawn.
// Three groups sit here side by side, and the card treats them differently: what the source
// sends, what our corpus generates in French, and what the reader wrote themselves.

// Six, of which the source sends four. It distinguishes a vocabulary written in kana from
// one written with kanji, and they differ in what a card can show: kana vocabulary carries no
// reading of its own, because its characters are the reading. Grammar and conjugation are
// ours and arrive with the corpus rather than from the source, so nothing sends them yet and
// the card is written for them all the same: a taxonomy that grows by a case the components
// never saw is a taxonomy that breaks the day it grows.
export type SubjectType =
  | 'radical'
  | 'kanji'
  | 'vocabulary'
  | 'kanaVocabulary'
  | 'grammar'
  | 'conjugation'

// `meanings` and `readings` both carry `primary` and `accepted_answer`, and the two are not
// the same question. A gloss can be shown and still be refused as an answer, so a card that
// lists them all on one line tells the reader that something is accepted when it is not.
type Gloss = {
  readonly text: string
  readonly primary: boolean
  readonly accepted: boolean
}

// A reading borrowed from Chinese, one that was already Japanese, or one used only in names.
// The card leans on the convention that writes the first in katakana and the second in
// hiragana, so the script itself says which is which before any label does.
export type ReadingType = 'onyomi' | 'kunyomi' | 'nanori'

export type Reading = Gloss & {
  readonly type: ReadingType | null
}

// `component_subject_ids` and `visually_similar_subject_ids` arrive as identifiers and are
// resolved before they reach a component: the card shows a character and what it means, and
// a number is neither.
export type Component = {
  readonly id: number
  readonly characters: string
  readonly meaning: string
}

type Sentence = {
  readonly ja: string
  readonly fr: string
}

// How the word is actually joined to a sentence, which is the thing a list of meanings never
// teaches: which particle follows it, what it takes as an object. Ours to generate, since
// the source has no such field.
type Pattern = {
  readonly pattern: string
  readonly gloss: string
}

export type Subject = {
  readonly id: number
  readonly type: SubjectType
  readonly level: number
  // Null on a radical that has no Unicode character at all. That radical renders as an SVG
  // from `character_images`, the one place in the interface where a glyph is not text.
  readonly characters: string | null
  readonly characterImage: string | null

  // From the source.
  readonly meanings: readonly Gloss[]
  readonly readings: readonly Reading[]
  readonly partsOfSpeech: readonly string[]
  readonly sentences: readonly Sentence[]
  readonly components: readonly Component[]
  // `amalgamation_subject_ids`, the relation the other way: what this one is a piece of. A
  // radical that appears in nine kanji is learnt once and recognised nine times, and that is
  // the whole reason for learning radicals at all.
  readonly usedIn: readonly Component[]
  readonly similar: readonly Component[]
  // Whether `pronunciation_audios` is non-empty, which is what decides whether the one
  // control on the card carries a second state.
  readonly hasAudio: boolean
  // `auxiliary_meanings`, which carry two opposite jobs under one field. A blacklisted one is
  // never accepted whatever a tier decides, which is why a refusal has two causes and not
  // one. A whitelisted one is accepted and never shown: the source sends up to eleven of them
  // on a single word, and a card listing them would read as eleven meanings rather than as
  // one meaning spelled eleven ways. They reach the cascade and never the card.
  readonly refused: readonly string[]
  readonly alsoAccepted: readonly string[]

  // Not sent by the source at all. docs/specs/v0.1.md admits the same gap and holds the
  // same condition: shown once a redistributable mapping is named, and absent until then.
  readonly jlpt: string | null

  // From our corpus, in French, written rather than translated. `nuance` is what the meaning
  // covers and what it does not, which is the half a one-word gloss always drops.
  readonly nuance: string | null
  readonly mnemonic: string | null
  readonly patterns: readonly Pattern[]

  // `hidden_at`, which is content the source has withdrawn. Never rendered and never asked:
  // it is filtered out of a queue rather than handled by a card.
  readonly hidden: boolean

  // From the assignment rather than the subject, because it is what this reader has done with
  // it and not what it is. Null while it has never been studied.
  readonly srsStage: number | null

  // From the reader, through study materials: `meaning_synonyms`, which are accepted as
  // answers beside the source's own, and the two free notes, which are theirs alone.
  readonly synonyms: readonly string[]
  readonly meaningNote: string | null
  readonly readingNote: string | null
}

// The stages the default system runs, which the source describes rather than fixes: a subject
// following another one has its own count, so the band is read off the position and never
// hard-coded per stage.
export type Band = 'lesson' | 'apprentice' | 'guru' | 'master' | 'enlightened' | 'burned'

export function bandOf(stage: number | null): Band | null {
  if (stage === null) return null
  if (stage === 0) return 'lesson'
  if (stage <= 4) return 'apprentice'
  if (stage <= 6) return 'guru'
  if (stage === 7) return 'master'
  if (stage === 8) return 'enlightened'

  return 'burned'
}

// The split `accepted` draws, which the card, the deck and the grader all have to read the
// same way: what a tier may take as an answer, and what a reader may see written somewhere
// and must not answer with. `Reading` carries the same pair as `Gloss`, so both split here.
export function acceptedIn(glosses: readonly Gloss[]): readonly string[] {
  return glosses.filter((gloss) => gloss.accepted).map((gloss) => gloss.text)
}

export function refusedIn(glosses: readonly Gloss[]): readonly string[] {
  return glosses.filter((gloss) => !gloss.accepted).map((gloss) => gloss.text)
}

// A lesson teaches and a review asks, and they are two flows rather than two states: the
// summary endpoint returns them as separate lists, and an assignment is started before it is
// ever reviewed. The card shows everything from the first frame in one and holds it back in
// the other.
export type Flow = 'lesson' | 'review'
