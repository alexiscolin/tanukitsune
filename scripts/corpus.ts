// The whole layer of one locale in one command, re-runnable by reflex.
//
// Run with `pnpm corpus [locale] [most]`. Every step is still its own command and still runnable
// alone, which is how one of them is read by hand; this runs them in the order each reads what the one
// before it wrote, and resumes rather than restarting.
//
// Batch submission is asynchronous, so one command does not mean one minute: four of the steps submit
// one and end, and this waits for each and asks it to collect rather than handing the wait back. What
// follows a batch reads what that batch is about to write, so nothing after it runs until it lands.
// What decides the order, the arguments each step reads and where a re-run picks up is in
// `src/data/corpus/pipeline.ts`, where a test reaches it.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'

import { argumentsFor, resumeAt, stepsFor } from '../src/data/corpus/pipeline.ts'
import { INVENTORY_FILE, readInventoryFile } from '../src/data/corpus/inventory.ts'

const locale = process.argv[2] ?? 'fr'
const bound = process.argv[3]
if (bound !== undefined && (!Number.isInteger(Number(bound)) || Number(bound) < 1)) {
  throw new Error(`most must be a whole number above zero, got ${bound}`)
}
const most = bound === undefined ? Infinity : Number(bound)

// The ceiling the inventory already carries, since corpus:inventory falls back to ten of its own and
// rewriting sixty levels of curriculum as ten would move every count taken against that file. Sixty
// where none has been read yet, the keys and the anchors being settled across all of them.
const levels = existsSync(INVENTORY_FILE) ? readInventoryFile(readFileSync(INVENTORY_FILE, 'utf8')).upTo : 60

// A batch is minutes rather than seconds, and asking more often than this costs a request per answer
// nobody is waiting on. Two hours before the run gives up, which is longer than any batch here has
// taken and short enough that a batch that will never end does not hold the terminal overnight.
const WAIT = 30_000
const MOST_WAITS = 240

const steps = stepsFor(locale)
const left = steps.slice(resumeAt(steps, existsSync))

// The free report first, so what the run is about to pay for is on screen before anything is
// confirmed. It reaches no model and needs no key, which is why nothing here asks for one: each paid
// step refuses on its own if the key is missing.
run('corpus:report')

process.stdout.write(`\n${locale}: ${left.length} steps to run, from ${left[0]?.name}, ${levels} levels\n`)
announce(left.filter((one) => one.paid))

if (!(await confirmed())) {
  process.stdout.write('nothing run\n')
  process.exit(0)
}

for (const step of left) {
  run(step.name)
  if (step.batch === null) continue

  // A step that submits leaves its batch written down and ends, so the run waits and asks it to
  // collect rather than handing the wait back to whoever typed the command: four steps submit, and a
  // run they each end is a run somebody restarts eight times. The batch file going is what says the
  // step is done with it, and each of them is re-runnable by reflex, so asking again is free.
  for (let asked = 0; existsSync(step.batch); asked += 1) {
    if (asked >= MOST_WAITS) {
      throw new Error(`${step.name} still holds ${step.batch} after ${(MOST_WAITS * WAIT) / 60000} minutes. Run it alone to see what it says`)
    }

    await new Promise((wake) => setTimeout(wake, WAIT))
    run(step.name)
  }
}

function run(name: string): void {
  const step = steps.find((one) => one.name === name)
  const args = step === undefined ? [name, locale] : [name, ...argumentsFor(step, locale, most, levels)]
  const { status } = spawnSync('pnpm', args, { stdio: 'inherit' })

  if (status !== 0) throw new Error(`${name} ended with ${status}. Nothing after it was run`)
}

// What the run will spend, in requests rather than in money: a price written here is a price that is
// wrong the day the provider publishes another one, and the count is what the bound acts on anyway.
// Each paid step counts its own and says so before it submits, since only that step knows what it owes.
function announce(paid: readonly { name: string }[]): void {
  if (paid.length === 0) {
    process.stdout.write('none of them reaches a model, so this run spends nothing\n')
    return
  }

  const held = most === Infinity ? 'no bound, so each asks for everything it owes' : `at most ${most} requests each`
  process.stdout.write(`${paid.length} reach a model and cost real money: ${paid.map((one) => one.name).join(', ')}\n`)
  process.stdout.write(`${held}. Each says how many it is asking for as it submits\n`)
}

// A terminal nobody is watching cannot answer, and a run that spends because nothing said no is the
// failure this question exists to prevent. So a non-interactive run refuses rather than assuming yes.
async function confirmed(): Promise<boolean> {
  if (!process.stdin.isTTY) {
    process.stdout.write('not a terminal, so nothing is confirmed here. Run the steps you want alone\n')
    return false
  }

  const line = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await line.question('run them? [y/N] ')
  line.close()

  return answer.trim().toLowerCase() === 'y'
}
