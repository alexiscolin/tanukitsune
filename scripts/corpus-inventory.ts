// Writes down every subject the curriculum deals up to a level, so coverage can be proven against
// what a session shows rather than against what a decomposition happens to contain.
//
// Run with `pnpm corpus:inventory [levels]`, with WANIKANI_TOKEN in the environment. The file it
// writes is not committed: it carries their meanings and their identifiers, which stay on the machine
// that generated and never travel into anything published.

import { writeFileSync } from 'node:fs'

import { readInventory } from '../src/data/corpus/inventory.ts'

const OUTPUT = 'corpus/.inventory.json'

const token = process.env['WANIKANI_TOKEN']
if (token === undefined || token === '') throw new Error('WANIKANI_TOKEN is not set')

// The host is a seam rather than a constant, as it is everywhere else that reads them: the suite
// drives an account nobody owns, and a command able to reach only the real one cannot be tested.
const api = process.env['WANIKANI_API'] ?? 'https://api.wanikani.com/v2'

const upTo = Number(process.argv[2] ?? 10)
if (!Number.isInteger(upTo) || upTo < 1) throw new Error(`levels must be a whole number, got ${process.argv[2]}`)

const subjects = await readInventory({ token, api }, upTo)

writeFileSync(OUTPUT, `${JSON.stringify({ upTo, subjects }, null, 1)}\n`)

const counted = new Map<string, number>()
for (const subject of subjects) counted.set(subject.type, (counted.get(subject.type) ?? 0) + 1)

process.stdout.write(`inventory: ${subjects.length} subjects to level ${upTo}, written to ${OUTPUT}\n`)
for (const [type, count] of counted) process.stdout.write(`  ${type}: ${count}\n`)
