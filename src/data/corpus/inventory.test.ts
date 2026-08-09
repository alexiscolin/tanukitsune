import { afterEach, describe, expect, it, vi } from 'vitest'

import { readInventory, readInventoryFile } from './inventory'

function page(next: string | null, ...data: readonly unknown[]) {
  return { pages: { next_url: next }, data }
}

function subject(id: number, object: string, characters: string, meaning: string) {
  return {
    id,
    object,
    data: {
      level: 1,
      hidden_at: null,
      characters,
      meanings: [{ meaning, primary: true, accepted_answer: true }],
      readings: [{ reading: 'ご', primary: true, accepted_answer: true, type: 'onyomi' }],
      component_subject_ids: [11, 12],
    },
  }
}

function answering(...pages: readonly unknown[]) {
  const responses = [...pages]

  return vi.fn((url: string): Promise<Response> => {
    const body = responses.shift()

    return Promise.resolve({ ok: true, url, json: () => Promise.resolve(body) } as unknown as Response)
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readInventory', () => {
  it('reads every subject the levels hold, with what the account accepts as its meaning', async () => {
    vi.stubGlobal('fetch', answering(page(null, subject(1, 'kanji', '語', 'language'))))

    const inventory = await readInventory({ token: 't', api: 'https://fake' }, 3)

    expect(inventory).toEqual([
      {
        id: 1,
        type: 'kanji',
        level: 1,
        characters: '語',
        hidden: false,
        meanings: ['language'],
        readings: [{ value: 'ご', type: 'onyomi', primary: true }],
        componentIds: [11, 12],
      },
    ])
  })

  // Their collections are paged by a URL they hand back, and an inventory missing its last page is
  // a coverage report that says a subject does not exist.
  it('follows the cursor until they stop handing one back', async () => {
    const fetching = answering(
      page('https://fake/subjects?page_after_id=1', subject(1, 'kanji', '語', 'language')),
      page(null, subject(2, 'vocabulary', '日本語', 'japanese')),
    )
    vi.stubGlobal('fetch', fetching)

    const inventory = await readInventory({ token: 't', api: 'https://fake' }, 3)

    expect(inventory.map((entry) => entry.id)).toEqual([1, 2])
    expect(fetching).toHaveBeenCalledTimes(2)
  })

  // The corpus covers what the curriculum deals, so a level beyond what is asked for is a subject
  // nothing will ever show and a name nobody owes.
  it('asks for the levels it was given and no others', async () => {
    const fetching = answering(page(null))
    vi.stubGlobal('fetch', fetching)

    await readInventory({ token: 't', api: 'https://fake' }, 3)

    expect(String(fetching.mock.calls[0]?.[0])).toContain('levels=1,2,3')
  })
})

describe('readInventoryFile', () => {
  const written = JSON.stringify({
    upTo: 3,
    subjects: [
      {
        id: 1,
        type: 'kanji',
        level: 1,
        characters: '語',
        hidden: false,
        meanings: ['language'],
        readings: [{ value: 'ご', type: 'onyomi', primary: true }],
        componentIds: [11],
      },
    ],
  })

  it('reads back what the command wrote, so one fetch serves every step', () => {
    expect(readInventoryFile(written).subjects[0]?.componentIds).toEqual([11])
  })

  it('refuses a file that is not an inventory', () => {
    expect(() => readInventoryFile('{"subjects":[]}')).toThrow()
  })
})
