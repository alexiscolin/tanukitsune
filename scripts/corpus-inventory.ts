// Writes down every subject the curriculum deals up to a level, so coverage can be proven against
// what a session shows rather than against what a decomposition happens to contain.
//
// Run with `pnpm corpus:inventory [levels]`. The token comes from `.env.local`, which the command
// loads itself: the application is handed it by the framework, and a plain Node run is not. The file it
// writes is not committed: it carries their meanings and their identifiers, which stay on the machine
// that generated and never travel into anything published.

import { writeFileSync } from 'node:fs'

import { INVENTORY_FILE, readInventory } from '../src/data/corpus/inventory.ts'
import { asOptional } from '../src/data/optional-text.ts'
import { API } from '../src/data/wanikani/paging.ts'
import { loadLocalEnv } from './corpus-command.ts'

loadLocalEnv()

const token = asOptional(process.env['WANIKANI_TOKEN'])
if (token === undefined) throw new Error('WANIKANI_TOKEN is not set')

// The host is a seam rather than a constant, as it is everywhere else that reads them: the suite
// drives an account nobody owns, and a command able to reach only the real one cannot be tested. The
// default is the one the product falls back to, read from where both now hold it.
const api = asOptional(process.env['WANIKANI_API']) ?? API

const upTo = Number(process.argv[2] ?? 10)
if (!Number.isInteger(upTo) || upTo < 1) throw new Error(`levels must be a whole number, got ${process.argv[2]}`)

const subjects = await readInventory({ token, api }, upTo)

writeFileSync(INVENTORY_FILE, `${JSON.stringify({ upTo, subjects }, null, 1)}\n`)

const counted = new Map<string, number>()
for (const subject of subjects) counted.set(subject.type, (counted.get(subject.type) ?? 0) + 1)

process.stdout.write(`inventory: ${subjects.length} subjects to level ${upTo}, written to ${INVENTORY_FILE}\n`)
for (const [type, count] of counted) process.stdout.write(`  ${type}: ${count}\n`)
