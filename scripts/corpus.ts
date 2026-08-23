// The whole French layer in one command, the locale as a parameter, re-runnable by reflex.
//
// Run with `pnpm corpus [locale] [most]`. Every step is still its own command and still runnable
// alone, which is how one of them is read by hand; this runs them in the order each reads what the one
// before it wrote, and resumes rather than restarting.
//
// Batch submission is asynchronous, so one command does not mean one minute. A step that submits a
// batch ends, and this command is run again to collect it. What decides where a re-run picks up is in
// `src/data/corpus/pipeline.ts`, where a test can reach it.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'

import { asked } from './corpus-command.ts'
import { resumeAt, stepsFor } from '../src/data/corpus/pipeline.ts'

const { locale, most } = asked(process.argv)

const steps = stepsFor(locale)
const from = resumeAt(steps, existsSync)
const left = steps.slice(from)

// The free report first, so what the run is about to pay for is on screen before anything is
// confirmed. It counts what each step owes, which is the count this command must not answer its own
// way, and it runs again at the end over what is left.
run('corpus:report')

process.stdout.write(`\n${locale}: ${left.length} steps to run, from ${left[0]?.name}\n`)
report(left.filter((one) => one.paid).map((one) => one.name))

if (!(await confirmed())) {
  process.stdout.write('nothing run\n')
  process.exit(0)
}

for (const step of left) run(step.name)

function run(name: string): void {
  const args = most === Infinity ? [name, locale] : [name, locale, String(most)]
  const { status } = spawnSync('pnpm', args, { stdio: 'inherit' })

  if (status !== 0) throw new Error(`${name} ended with ${status}. Nothing after it was run`)
}

function report(paid: readonly string[]): void {
  if (paid.length === 0) {
    process.stdout.write('none of them reaches a model, so this run spends nothing\n')
    return
  }

  const bound = most === Infinity ? 'no bound, so every item owed is asked for' : `at most ${most} items each`
  process.stdout.write(`${paid.length} of them reach a model and cost real money: ${paid.join(', ')}\n`)
  process.stdout.write(`${bound}. The counts above say how many that is\n`)
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
