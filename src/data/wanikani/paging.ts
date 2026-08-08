import type { z } from 'zod'

// One request and one walk, shared by everything that reads them: the product's own reader and the
// corpus pipeline's. Two copies of a walk carrying a token is two places to remember the guards, and
// the guards are the whole reason this is not four lines inline.

// The two a request needs, carried together because neither is any use without the other.
export type Client = { readonly token: string; readonly api: string }

// Their shape is versioned by date and the header is not optional: without it the response is
// whatever revision they consider current, which is a payload nobody wrote a parser for.
const REVISION = '20170710'

export function headersFor(client: Client): Record<string, string> {
  return { Authorization: `Bearer ${client.token}`, 'Wanikani-Revision': REVISION }
}

export async function read(client: Client, path: string): Promise<unknown> {
  const response = await fetch(path.startsWith(client.api) ? path : `${client.api}${path}`, {
    headers: headersFor(client),
  })

  // Loudly, and naming the status: a read that fails silently returns an empty queue, which is
  // indistinguishable from a session with nothing left in it. 429 is the one the reader will
  // meet, sixty requests a minute being shared between what we read and what we send.
  if (!response.ok)
    throw new Error(`WaniKani answered ${response.status} for ${path.replace(client.api, '')}.`)

  return response.json()
}

// Their cursor is a URL rather than a page number, so following it is the whole of paging. It comes
// out of a response body and is carried with the reader's token on it, so it is followed only where
// it stays inside the source: a cursor naming another host is that token handed to whoever answered,
// and one naming its own page is a walk with no end.
export async function collect<Entry>(
  client: Client,
  collection: z.ZodType<{ pages: { next_url: string | null }; data: Entry[] }>,
  first: string,
): Promise<Entry[]> {
  const entries: Entry[] = []
  const walked = new Set<string>()
  let next: string | null = first

  while (next !== null) {
    // Resolved before it is remembered, since the first path is relative and every cursor after
    // it is absolute, and two spellings of one page would walk it twice before closing the loop.
    const walkedTo = next.startsWith(client.api) ? next : `${client.api}${next}`
    if (walked.has(walkedTo))
      throw new Error(`WaniKani handed back a cursor it had already: ${walkedTo}.`)
    walked.add(walkedTo)

    const page = collection.parse(await read(client, walkedTo))
    entries.push(...page.data)
    next = page.pages.next_url

    if (next !== null && !next.startsWith(`${client.api}/`))
      throw new Error(`WaniKani handed back a cursor leaving the source: ${next}.`)
  }

  return entries
}
