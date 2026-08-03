// Refuses a token pair the interface sets text in that a reader cannot read.
//
// The audit in e2e/ weighs the rendered screen and reaches more of it than this does: the
// catalogue drives every story's play function before auditing, in both themes. Two things
// are left. A rung of the mastery ramp is spent by no story, because every demo subject
// carries a null srsStage and the band never renders. And this needs no browser, so it fits
// `gate` and the hook that runs at every turn, and it weighs a token before a call site
// spends it rather than after.
//
// It belongs beside `check:tokens` for that reason: that rule refuses an arbitrary colour and
// names src/app/globals.css as the place to take one from, so a token under the floor turns
// it into an instruction to write text nobody can read.
//
// 4.5:1 throughout, which is what WCAG asks of text under 18.66px bold or 24px plain. The
// interface sets its labels at ten pixels, so the large-text allowance never applies here and
// a second threshold would only be a way to let one through.

import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8')

// The two blocks the interface resolves against. A token absent from the dark block keeps its
// light value, which is why the dark map starts as a copy rather than empty.
function blockOf(head) {
  const at = css.indexOf(head)
  if (at < 0) return null

  const open = css.indexOf('{', at)
  let depth = 0
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    if (css[i] === '}') {
      depth -= 1
      if (depth === 0) return css.slice(open + 1, i)
    }
  }

  return null
}

// Only the opaque forms, so a pair below is a colour and never a blend. An alpha applied at
// the call site is out of reach here by construction, which is what leaves the receded glyph
// of the deck strip to the audit rather than to this.
function tokensIn(block) {
  const found = new Map()
  const pattern = /--(color-[a-z0-9-]+):\s*oklch\(\s*([0-9.]+)%\s+([0-9.]+)\s+([0-9.]+)\s*\)/g
  for (const [, name, l, c, h] of block.matchAll(pattern)) {
    found.set(name, [Number(l) / 100, Number(c), Number(h)])
  }

  return found
}

function srgb([L, C, H]) {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)))
}

function luminance(linear) {
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function ratio(ink, ground) {
  const a = luminance(srgb(ink)) + 0.05
  const b = luminance(srgb(ground)) + 0.05

  return a > b ? a / b : b / a
}

// Every ink against every ground it can land on, rather than the pairs a component happens to
// set today: a ground and an ink meet only once ancestry resolves, so a list of what is spent
// now would be a census this cannot keep true, and it would go stale on the first move of a
// call site with nothing to report it.
const GROUNDS = ['color-canvas', 'color-surface', 'color-surface-raised', 'color-surface-sunken']
const INKS = ['color-ink', 'color-ink-muted', 'color-brand', 'color-destructive']

// The mastery ramp names the stage in its own colour, and the card is the only thing that
// carries it. The six type colours are not here: they fill a dot six pixels wide, never a word.
const RAMP = ['lesson', 'apprentice', 'guru', 'master', 'enlightened', 'burned']

const PAIRS = [
  ...INKS.flatMap((ink) => GROUNDS.map((ground) => [ink, ground])),
  ...RAMP.map((rung) => [`color-srs-${rung}`, 'color-surface']),
]

const FLOOR = 4.5

const light = tokensIn(blockOf('@theme'))
const dark = new Map([...light, ...tokensIn(blockOf(":root[data-theme='dark']"))])

let fail = 0
let checked = 0

for (const [label, theme] of [
  ['light', light],
  ['dark', dark],
]) {
  for (const [ink, ground] of PAIRS) {
    const a = theme.get(ink)
    const b = theme.get(ground)
    if (a === undefined || b === undefined) {
      console.error(`${label}: --${ink} on --${ground} names a token globals.css does not declare.`)
      fail = 1
      continue
    }

    checked += 1
    const measured = ratio(a, b)
    if (measured < FLOOR) {
      console.error(`${label}: --${ink} on --${ground} reads at ${measured.toFixed(2)}:1, under ${FLOOR}:1.`)
      fail = 1
    }
  }
}

// The comparator answers for two pairs whose answer is known, the way the probes beside this
// do: an arithmetic slip returning a passing number for everything would report a clean
// palette, and this would be the quietest thing in the repository.
if (ratio([0, 0, 0], [1, 0, 0]) < 20) {
  console.error('The comparator puts black on white under 20:1, so it is not measuring contrast.')
  fail = 1
}
if (ratio([1, 0, 0], [1, 0, 0]) > 1.01) {
  console.error('The comparator puts white on white above 1:1, so its own floor means nothing.')
  fail = 1
}

if (fail !== 0) {
  console.error('\nA token pair the interface sets text in is under the readable floor. Move the')
  console.error('value in src/app/globals.css rather than the call site: every screen spends these.')
  process.exit(1)
}

console.log(`contrast: ${checked} pairs at ${FLOOR}:1 or better`)
