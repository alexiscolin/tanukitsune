// Every word a locale has committed, held to that locale's own rules. It reads the material and
// nothing else: no network, no account, no model, so it belongs in the gate rather than beside the
// commands that write the files.
//
// It exists because the commands clean what a dictionary states, and a shape the cleaning does not
// know about survives it in silence. A gloss holding the quotes an aside sat inside, a Kangxi listing,
// a key in another script: each would have stood in the corpus until somebody opened the file.
//
// Run with `pnpm check:corpus`. It refuses rather than reports, which is what makes it a gate.

import { readdirSync, readFileSync, existsSync } from 'node:fs'

import { confusablePairs, notInjective } from '../src/core/corpus/allocation.ts'
import type { Allocated } from '../src/core/corpus/allocation.ts'
import { collidingNames } from '../src/core/corpus/decomposition.ts'
import type { ComponentNames } from '../src/core/corpus/decomposition.ts'
import { faultInKey } from '../src/core/corpus/key.ts'
import { faultInMeaning, faultInName } from '../src/core/corpus/name.ts'
import type { Shape } from '../src/core/corpus/name.ts'
import {
  readAnchors,
  readComponentNames,
  readKeyOrder,
  readKeys,
  readMeanings,
  readNaming,
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

  if (existsSync(at('anchors.json')) && existsSync(at('phonology.json'))) {
    const { bound } = readAnchors(readFileSync(at('anchors.json'), 'utf8'))
    const { apart } = readPhonology(readFileSync(at('phonology.json'), 'utf8'))
    const allocation = [...bound].map(([reading, one]) => ({ reading, anchor: one.anchor, phonemes: one.phonemes }))

    checkAnchors(locale, allocation, apart)
  }
}

// One anchor per reading and one reading per anchor, and no two anchors so near that a reader hears
// them as the same cue. The commands hold to both while they run, and this holds the committed file to
// them afterwards: an allocation is written by three passes reading each other, and a word freed by
// one and taken by another is the shape that survives a run without anybody seeing it.
function checkAnchors(locale: string, allocation: readonly Allocated[], apart: number): void {
  for (const anchor of notInjective(allocation)) {
    refuse(`${locale}: "${anchor}" stands for more than one reading, so one cue has two answers`)
  }

  for (const [one, other] of confusablePairs(allocation, apart)) {
    refuse(`${locale}: the anchors for ${one} and ${other} sit nearer than ${apart}, so they are one cue`)
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
