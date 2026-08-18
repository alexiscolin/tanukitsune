import type { TextBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { describe, expect, it } from 'vitest'

import { keyChoicePrefix, keyChoiceRequest, readKeyChoice } from './key-choice'

// A language that is not French, so a rule leaking back into the prompt shows up here rather than in a
// run six months from now.
const prefix = keyChoicePrefix('Latin')

const GLOSSES = ['chic', 'dernier', 'second']

describe('keyChoicePrefix', () => {
  it('names the language it is ordering for', () => {
    expect(prefix).toContain('Latin')
  })

  it('asks for an order over what it is given rather than for a word', () => {
    expect(prefix).toContain('Order')
  })
})

describe('keyChoiceRequest', () => {
  const request = keyChoiceRequest(prefix, { character: '乙', glosses: GLOSSES })

  it('carries the prefix as a cached system block', () => {
    const [block] = request.system as TextBlockParam[]

    expect(block?.text).toBe(prefix)
    expect(block?.cache_control).toEqual({ type: 'ephemeral', ttl: '1h' })
  })

  // Every value that is not ours arrives delimited and labelled as something to read rather than
  // something to do, which is the posture docs/ai-engineering.md holds for any untrusted text.
  it('delimits the character and every gloss it is weighing', () => {
    const [message] = request.messages

    expect(message?.content).toContain('<character>乙</character>')
    expect(message?.content).toContain('<gloss>chic</gloss>')
  })
})

describe('readKeyChoice', () => {
  it('reads an order the model returned over the glosses it was given', () => {
    expect(readKeyChoice('{"order":["dernier","second","chic"]}', GLOSSES)).toEqual(['dernier', 'second', 'chic'])
  })

  // The whole guard. An order is only a reordering: a model that invents a word, drops one or repeats
  // one has not answered the question, and the source order stands rather than a made-up key being
  // written. Nothing here throws, since one bad answer must not lose a batch already paid for.
  it('refuses an order that invents a gloss', () => {
    expect(readKeyChoice('{"order":["dernier","second","élégant"]}', GLOSSES)).toBeNull()
  })

  it('refuses an order that drops a gloss', () => {
    expect(readKeyChoice('{"order":["dernier","second"]}', GLOSSES)).toBeNull()
  })

  it('refuses an order that repeats a gloss', () => {
    expect(readKeyChoice('{"order":["dernier","dernier","second"]}', GLOSSES)).toBeNull()
  })

  it('refuses an answer it cannot read at all', () => {
    expect(readKeyChoice('not json', GLOSSES)).toBeNull()
  })
})
