// Every word a locale has committed, held to that locale's own rules. It reads the material and
// nothing else: no network, no account, no model, so it belongs in the gate rather than beside the
// commands that write the files.
//
// It exists because the commands clean what a dictionary states, and a shape the cleaning does not
// know about survives it in silence. A gloss holding the quotes an aside sat inside, a Kangxi listing,
// a key in another script: each would have stood in the corpus until somebody opened the file.
//
// Run with `pnpm check:corpus`. It refuses rather than reports, which is what makes it a gate.

import { list } from './corpus-command.ts'
import { faultInAnchorWords } from '../src/core/corpus/anchor-answer.ts'
import { faultInStory } from '../src/core/corpus/story.ts'
import type { Telling } from '../src/core/corpus/story.ts'
import { readdirSync, readFileSync, existsSync } from 'node:fs'

import { confusablePairs, notInjective } from '../src/core/corpus/allocation.ts'
import type { Allocated } from '../src/core/corpus/allocation.ts'
import { claimedWords } from '../src/core/corpus/answers.ts'
import { collidingNames } from '../src/core/corpus/decomposition.ts'
import type { ComponentNames } from '../src/core/corpus/decomposition.ts'
import { faultInKey } from '../src/core/corpus/key.ts'
import { faultInMeaning, faultInName } from '../src/core/corpus/name.ts'
import type { Shape } from '../src/core/corpus/name.ts'
import {
  answersIn,
  readAnchors,
  readComponentNames,
  readKeyOrder,
  readKeys,
  readMeanings,
  readClaimed,
  readNaming,
  readStories,
  readTelling,
  readPhonology,
} from '../src/data/corpus/artifact.ts'

let fail = 0
const refuse = (line: string) => {
  process.stderr.write(`${line}\n`)
  fail = 1
}

const root = process.argv[2] ?? 'corpus'
const locales = readdirSync(root, { withFileTypes: true })
  .filter((one) => one.isDirectory())
  .map((one) => one.name)

for (const locale of locales) check(locale)

if (locales.length === 0) refuse(`${root} holds no locale, and a corpus with none is a corpus nobody can read`)

process.exit(fail)

function check(locale: string): void {
  const at = (file: string) => `${root}/${locale}/${file}`
  if (!existsSync(at('naming.json'))) {
    refuse(`${locale}: naming.json is missing, and it is what says what this language can write`)
    return
  }

  const naming = readNaming(readFileSync(at('naming.json'), 'utf8'))
  const telling = readTelling(readFileSync(at('naming.json'), 'utf8'))

  checkNaming(locale, naming, telling)

  if (existsSync(at('keys.json'))) checkKeys(locale, readKeys(readFileSync(at('keys.json'), 'utf8')), naming)
  if (existsSync(at('components.json'))) {
    checkNames(locale, readComponentNames(readFileSync(at('components.json'), 'utf8')), naming)
  }

  for (const file of ['key-choice.json', 'key-translation.json']) {
    if (existsSync(at(file))) checkWords(locale, file, readKeyOrder(readFileSync(at(file), 'utf8')))
  }

  for (const file of ['meanings.json', 'vocabulary.json']) {
    if (existsSync(at(file))) checkMeanings(locale, file, readMeanings(readFileSync(at(file), 'utf8')), naming)
  }

  checkClaimed(locale, at)

  // The three files a learner actually reads. What the gate can hold them to from committed material is
  // that a story exists and that it names the word its card is graded on, which is the fault every other
  // rule is written around: a story that never says the answer teaches the answer to nobody. What a part
  // is and where the drawing places it comes from the curriculum, which is not committed, so the order
  // of the cast stays with `pnpm corpus:report` where the curriculum is.
  const answering: readonly [string, string, (json: string) => Readonly<Record<string, unknown>>][] = [
    ['mnemonics.json', 'keys.json', readKeys],
    ['shapes.json', 'components.json', readComponentNames],
  ]

  for (const [stories, answers, read] of answering) {
    if (!existsSync(at(stories)) || !existsSync(at(answers))) continue

    checkStories(locale, stories, readStories(readFileSync(at(stories), 'utf8')), {
      answers: read(readFileSync(at(answers), 'utf8')),
      telling,
    })
  }

  if (existsSync(at('words.json')) && existsSync(at('vocabulary.json'))) {
    const said = readMeanings(readFileSync(at('vocabulary.json'), 'utf8'))
    const first = Object.fromEntries(Object.entries(said).map(([word, meanings]) => [word, meanings[0] ?? '']))

    checkStories(locale, 'words.json', readStories(readFileSync(at('words.json'), 'utf8')), { answers: first, telling })
  }

  if (existsSync(at('anchors.json')) && existsSync(at('phonology.json'))) {
    const { bound } = readAnchors(readFileSync(at('anchors.json'), 'utf8'))
    const { apart, refuses, atMostWords } = readPhonology(readFileSync(at('phonology.json'), 'utf8'))
    const allocation = [...bound].map(([reading, one]) => ({ reading, anchor: one.anchor, phonemes: one.phonemes }))

    checkAnchors(locale, allocation, { apart, refuses, atMostWords, telling })
  }
}

// One anchor per reading and one reading per anchor, and no two anchors so near that a reader hears
// them as the same cue. The commands hold to both while they run, and this holds the committed file to
// them afterwards: an allocation is written by three passes reading each other, and a word freed by
// one and taken by another is the shape that survives a run without anybody seeing it.
// The rulebook every other check here is measured against, held to what its own schema cannot state.
// An empty article opens every name, which turns every check measured against it into a check that
// passes whatever it is given. A missing article list, an empty letter set and a name of no words are
// refused by the schema before this runs, so stating them here again would be a clause nothing reaches.
function checkNaming(locale: string, naming: Shape, telling: Telling): void {
  for (const opener of naming.opensWith) {
    if (opener.trim() === '') refuse(`${locale}: naming.json holds an article that opens on nothing, which every name then carries`)
  }

  if (telling.inflects.length === 0) {
    refuse(`${locale}: naming.json states no inflection, so a name in the plural is a name nothing matches`)
  }
}

function checkStories(
  locale: string,
  file: string,
  stories: ReadonlyMap<string, { readonly meaning: string }>,
  against: { readonly answers: Readonly<Record<string, unknown>>; readonly telling: Telling },
): void {
  for (const [subject, told] of stories) {
    const key = against.answers[subject]
    if (typeof key !== 'string' || key === '') continue

    const fault = faultInStory({ text: told.meaning, parts: [], key }, against.telling)
    if (fault !== null) refuse(`${locale}: ${file} tells ${subject} a story that ${fault}`)
  }
}

function checkAnchors(
  locale: string,
  allocation: readonly Allocated[],
  bounds: {
    readonly apart: number
    readonly refuses: ReadonlySet<string>
    readonly atMostWords: number
    readonly telling: Telling
  },
): void {
  for (const anchor of notInjective(allocation)) {
    refuse(`${locale}: "${anchor}" stands for more than one reading, so one cue has two answers`)
  }

  for (const [one, other] of confusablePairs(allocation, bounds.apart)) {
    refuse(`${locale}: the anchors for ${one} and ${other} sit nearer than ${bounds.apart}, so they are one cue`)
  }

  // The refusals the writing run applies to every candidate it ranks, applied here to what it committed:
  // a rule held only while a command runs is a rule the file drifts out of the moment the list behind it
  // grows. Not the whole pool rule: whether a word already names a component is answered against
  // components.json, which `corpus:name` writes after this file is read.
  for (const one of allocation) {
    const fault = faultInAnchorWords(one.anchor, bounds.refuses, bounds.telling)
    if (fault !== null) refuse(`${locale}: ${one.reading} is cued by "${one.anchor}", where ${fault}`)

    if (one.anchor.split(/\s+/).length > bounds.atMostWords) {
      refuse(`${locale}: ${one.reading} is cued by "${one.anchor}", which is more words than a cue carries`)
    }
  }
}

function checkKeys(locale: string, keys: Readonly<Record<string, string>>, naming: Shape): void {
  const held = new Map<string, string>()

  for (const [character, key] of Object.entries(keys)) {
    const fault = faultInKey(key, naming)
    if (fault !== null) refuse(`${locale}: ${character} is keyed "${key}", which is ${fault}`)

    // One key per subject and one subject per key: two characters answering to one word cannot be
    // graded apart, and the writer folds case, so the check does too.
    const taken = held.get(key.toLowerCase())
    if (taken !== undefined) refuse(`${locale}: ${character} and ${taken} are both keyed "${key}"`)
    held.set(key.toLowerCase(), character)
  }
}

// Every word a subject is graded on, which is looser than a key and still has to be readable: a meaning
// nothing of this language can be read out of is a card asking for a word it never gave.
function checkMeanings(
  locale: string,
  file: string,
  said: Readonly<Record<string, readonly string[]>>,
  naming: Shape,
): void {
  for (const [subject, meanings] of Object.entries(said)) {
    if (meanings.length === 0) refuse(`${locale}: ${file} leaves ${subject} with no meaning at all`)

    for (const meaning of meanings) {
      const fault = faultInMeaning(meaning, naming)
      if (fault !== null) refuse(`${locale}: ${file} says ${subject} means "${meaning}", which is ${fault}`)
    }
  }
}

// The guard the judge reads is derived from the three files above, so a word rewritten in one of them
// and not rebuilt here leaves the fuzzy tier free to place an answer on a word that now answers another
// card. Recomputed rather than trusted: the file states a count, and a count nothing recomputes is a
// claim.
function checkClaimed(locale: string, at: (file: string) => string): void {
  const files = ['claimed.json', 'components.json', 'meanings.json', 'vocabulary.json']
  // A locale that has written none of them owes no guard yet, which is every locale on its first day.
  if (!files.every((file) => existsSync(at(file)))) return

  const answers = answersIn((file) => readFileSync(at(file), 'utf8'))
  const written = readClaimed(readFileSync(at('claimed.json'), 'utf8'))
  const owed = claimedWords(answers)

  const missing = owed.filter((word) => !written.includes(word))
  const extra = written.filter((word) => !owed.includes(word))

  if (missing.length > 0) refuse(`${locale}: claimed.json is missing ${list(missing)}, so run pnpm corpus:claimed`)
  if (extra.length > 0) refuse(`${locale}: claimed.json still holds ${list(extra)}, so run pnpm corpus:claimed`)
}

function checkNames(locale: string, names: ComponentNames, naming: Shape): void {
  for (const [component, name] of Object.entries(names)) {
    const fault = faultInName(name, naming)
    if (fault !== null) refuse(`${locale}: ${component} is named "${name}", which is ${fault}`)
  }

  for (const name of collidingNames(names)) refuse(`${locale}: "${name}" names more than one component`)
}

function checkWords(locale: string, file: string, stated: ReadonlyMap<string, readonly string[]>): void {
  for (const [character, words] of stated) {
    if (words.length === 0) refuse(`${locale}: ${file} holds nothing for ${character}`)
    if (new Set(words).size !== words.length) refuse(`${locale}: ${file} states a word twice for ${character}`)
    for (const word of words) {
      if (word.trim() === '') refuse(`${locale}: ${file} holds an empty word for ${character}`)
    }
  }
}
