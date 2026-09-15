// French numbers written as digits, so a reader typing 2 for deux, or dix minutes where a card writes
// 10 minutes, is answering with the same number. A number is read only where French writes it that way:
// a run is summed, written back out in words, and kept as digits only if the words come back the same.
// Anything else is left as typed, since a number that is not a number is not an answer to round off.

const UNITS: Readonly<Record<string, number>> = {
  zero: 0,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  vingt: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
}

const WORDS = Object.fromEntries(Object.entries(UNITS).filter(([word]) => word !== 'une').map(([word, value]) => [value, word]))

const SCALES = new Set(['cent', 'mille', 'million'])

// Every word a French number is written with, plurals included, which is what a slip is held against:
// a word one letter from one of these is a number misspelt.
export const NUMBER_WORDS: readonly string[] = [...Object.keys(UNITS), 'zéro', 'vingts', ...SCALES, 'cents', 'millions']

// One word of a number as it is compared: the plural a hundred or a score takes is a spelling rule
// rather than a different number, and zéro is written with its accent or without.
function atomOf(word: string): string {
  const bare = word === 'zéro' ? 'zero' : word

  return bare === 'vingts' || bare === 'cents' || bare === 'millions' ? bare.slice(0, -1) : bare
}

function isNumberAtom(atom: string): boolean {
  return atom in UNITS || SCALES.has(atom) || atom === 'et'
}

function belowHundred(value: number): readonly string[] {
  if (value <= 16 || value % 10 === 0 && value <= 60) return [WORDS[value] ?? '']
  if (value < 20) return ['dix', WORDS[value - 10] ?? '']
  if (value < 70) {
    const unit = value % 10

    return [WORDS[value - unit] ?? '', ...(unit === 1 ? ['et'] : []), WORDS[unit] ?? '']
  }
  if (value < 80) return ['soixante', ...(value === 71 ? ['et'] : []), ...belowHundred(value - 60)]

  return ['quatre', 'vingt', ...(value > 80 ? belowHundred(value - 80) : [])]
}

function belowThousand(value: number): readonly string[] {
  const hundreds = Math.floor(value / 100)
  const rest = value % 100

  return [
    ...(hundreds > 1 ? [WORDS[hundreds] ?? ''] : []),
    ...(hundreds > 0 ? ['cent'] : []),
    ...(rest > 0 ? belowHundred(rest) : []),
  ]
}

// The words French writes a number in, one atom each, which is what a run typed is held to.
function wordsFor(value: number): readonly string[] {
  if (value === 0) return ['zero']

  const millions = Math.floor(value / 1_000_000)
  const thousands = Math.floor(value / 1000) % 1000
  const rest = value % 1000

  return [
    ...(millions > 0 ? [...belowThousand(millions), 'million'] : []),
    ...(thousands > 1 ? belowThousand(thousands) : []),
    ...(thousands > 0 ? ['mille'] : []),
    ...belowThousand(rest),
  ]
}

function sum(atoms: readonly string[]): number {
  let total = 0
  let current = 0

  for (const [index, atom] of atoms.entries()) {
    if (atom === 'et') continue
    if (atom === 'cent') current = (current || 1) * 100
    else if (atom === 'mille' || atom === 'million') {
      total += (current || 1) * (atom === 'mille' ? 1000 : 1_000_000)
      current = 0
    } else if (atom === 'vingt' && atoms[index - 1] === 'quatre') current += 76
    else current += UNITS[atom] ?? 0
  }

  return total + current
}

function asNumber(atoms: readonly string[]): string | null {
  if (atoms[0] === 'et' || atoms.at(-1) === 'et') return null
  // Neuf is also new, and alone nothing says which.
  if (atoms.length === 1 && atoms[0] === 'neuf') return null

  const value = sum(atoms)
  const written = wordsFor(value)
  const typed = atoms.map((atom) => (atom === 'une' ? 'un' : atom))

  return written.length === typed.length && written.every((word, index) => word === typed[index]) ? String(value) : null
}

export function numbersAsDigits(text: string): string {
  const tokens = text.replace(/(\d) (?=\d{3}\b)/gu, '$1').split(' ')
  const out: string[] = []
  let run: string[] = []
  let runTokens: string[] = []

  const close = () => {
    const number = runTokens.length === 0 ? null : asNumber(run)
    out.push(...(number === null ? runTokens : [number]))
    run = []
    runTokens = []
  }

  for (const token of tokens) {
    const atoms = token.split('-').map(atomOf)

    if (atoms.every(isNumberAtom)) {
      run.push(...atoms)
      runTokens.push(token)
    } else {
      close()
      out.push(token)
    }
  }

  close()

  return out.join(' ')
}
