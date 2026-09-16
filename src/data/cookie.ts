// Not server-only, and nothing here reads a secret of ours: it takes a request apart, which is the same
// work wherever it runs, and a module marked server-only cannot be unit tested at all.
//
// What a request is carrying under one name, or nothing. One reader for every cookie this product
// sets, since a second one written beside it is a second answer to how a value was encoded.

// Split at the first `=` and no other: a value may contain them, and base64 is the ordinary way to
// write a long random string, so cutting at every one refuses exactly the secrets a reader is most
// likely to generate. Percent-decoded, matching how it was written.
export function cookie(request: Request, name: string): string | undefined {
  for (const pair of (request.headers.get('cookie') ?? '').split(';')) {
    const at = pair.indexOf('=')
    if (at === -1) continue
    if (pair.slice(0, at).trim() !== name) continue

    try {
      return decodeURIComponent(pair.slice(at + 1))
    } catch {
      // Not something this ever wrote, so it is not the secret whatever it is.
      return undefined
    }
  }

  return undefined
}

