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

import { collidingNames } from '../src/core/corpus/decomposition.ts'
import type { ComponentNames } from '../src/core/corpus/decomposition.ts'
import { faultInKey } from '../src/core/corpus/key.ts'
import { faultInName } from '../src/core/corpus/name.ts'
import type { Shape } from '../src/core/corpus/name.ts'
import { readComponentNames, readKeyOrder, readKeys, readNaming } from '../src/data/corpus/artifact.ts'

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
