#!/bin/bash
# Refuses a token pair the interface spends as text that a reader cannot read. The audit in
# e2e/ already catches this, but only on a state a spec reaches: it audits the route as it
# first renders, so an ink spent on a block that appears after an answer is never weighed.
# This reads the values instead of the screen, so every pair is checked whether or not a
# story drives the state that shows it.
#
# It sits in `gate` rather than in `verify` because the lint rule next to it sends every
# call site to these tokens: `check-tokens.sh` refuses an arbitrary colour and names
# globals.css as the place to take one from, so a token under the floor turns that rule into
# an instruction to write unreadable text.
#
# 4.5:1 throughout, which is what WCAG asks of text under 18.66px bold or 24px plain. The
# interface sets its labels at ten pixels, so the large-text allowance never applies here and
# a second threshold would only be a way to let one through.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

node --input-type=module -e '
import { readFile } from "node:fs/promises"

const css = await readFile("src/app/globals.css", "utf8")

// The two blocks the interface actually resolves against. A token absent from the dark block
// keeps its light value, which is why the dark map starts as a copy rather than empty.
const blockOf = (head) => {
  const at = css.indexOf(head)
  if (at < 0) return null
  const open = css.indexOf("{", at)
  let depth = 0
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1
    if (css[i] === "}") { depth -= 1; if (depth === 0) return css.slice(open + 1, i) }
  }
  return null
}

// Only the opaque forms. A token carrying an alpha is a glow or a hairline, never the ink a
// word is set in, and blending it would report a ratio no reader ever sees.
const tokensIn = (block) => {
  const found = new Map()
  const pattern = /--(color-[a-z0-9-]+):\s*oklch\(\s*([0-9.]+)%\s+([0-9.]+)\s+([0-9.]+)\s*\)/g
  for (const [, name, l, c, h] of block.matchAll(pattern)) {
    found.set(name, [Number(l) / 100, Number(c), Number(h)])
  }
  return found
}

const srgb = ([L, C, H]) => {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return linear.map((v) => Math.min(1, Math.max(0, v)))
}

const luminance = (linear) => 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

const ratio = (ink, ground) => {
  const a = luminance(srgb(ink)) + 0.05
  const b = luminance(srgb(ground)) + 0.05
  return a > b ? a / b : b / a
}

// Named rather than every combination, because a ratio between two colours the interface
// never puts together is a failure nobody can act on. Each line is a pair a component sets
// today, and a pair that stops being spent belongs out of this list.
const PAIRS = [
  ["color-ink", "color-canvas"],
  ["color-ink", "color-surface"],
  ["color-ink", "color-surface-sunken"],
  ["color-ink-muted", "color-canvas"],
  ["color-ink-muted", "color-surface"],
  ["color-ink-muted", "color-surface-sunken"],
  ["color-brand", "color-canvas"],
  ["color-brand", "color-surface"],
  ["color-destructive", "color-canvas"],
  ["color-destructive", "color-surface"],
  ["color-success-foreground", "color-brand"],
  // The mastery ramp names the stage in its own colour on the card, so every rung of it is
  // ink. The six type colours are not here: they fill a dot six pixels wide and never a word.
  ["color-srs-lesson", "color-surface"],
  ["color-srs-apprentice", "color-surface"],
  ["color-srs-guru", "color-surface"],
  ["color-srs-master", "color-surface"],
  ["color-srs-enlightened", "color-surface"],
  ["color-srs-burned", "color-surface"],
]

const FLOOR = 4.5

const light = tokensIn(blockOf("@theme"))
const dark = new Map([...light, ...tokensIn(blockOf(":root[data-theme='"'"'dark'"'"']"))])

let failed = 0
let checked = 0

for (const [label, theme] of [["light", light], ["dark", dark]]) {
  for (const [ink, ground] of PAIRS) {
    const a = theme.get(ink)
    const b = theme.get(ground)
    if (a === undefined || b === undefined) {
      console.error(`${label}: --${ink} on --${ground} names a token globals.css does not declare.`)
      failed += 1
      continue
    }
    checked += 1
    const measured = ratio(a, b)
    if (measured < FLOOR) {
      console.error(`${label}: --${ink} on --${ground} reads at ${measured.toFixed(2)}:1, under ${FLOOR}:1.`)
      failed += 1
    }
  }
}

// The comparator proves itself against two pairs whose answer is known, or a arithmetic
// slip that returned a passing number for everything would report a clean palette and this
// gate would be the quietest thing in the repository.
const black = [0, 0, 0]
const white = [1, 0, 0]
if (ratio(black, white) < 20) {
  console.error("The comparator puts black on white under 20:1, so it cannot be measuring contrast.")
  failed += 1
}
if (ratio(white, white) > 1.01) {
  console.error("The comparator puts white on white above 1:1, so its own floor means nothing.")
  failed += 1
}

if (failed > 0) {
  console.error("\nA token pair the interface sets text in is under the readable floor. Move the")
  console.error("value in src/app/globals.css rather than the call site: every screen spends these.")
  process.exit(1)
}

console.log(`contrast: ${checked} pairs at ${FLOOR}:1 or better`)
'
