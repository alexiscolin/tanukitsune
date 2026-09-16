// A key handed over is a sign-in, and a sign-in another site can perform for you is one that hands the
// reader somebody else's account: every answer afterwards would be written under it and sent there. A
// cross-site form can post here without a preflight, so the request has to prove it came from this
// origin, which a form cannot forge and a browser will not lie about.
export function sameOrigin(request: Request): boolean {
  // Compared against the host the request carries rather than against the URL the framework rebuilt:
  // behind a proxy those differ by scheme or by name, and a check that refuses its own origin refuses
  // every reader.
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (origin !== null) return host !== null && new URL(origin).host === host

  // Not every same-origin request carries an origin, and the one the browser fills in for itself says
  // the same thing: a cross-site form reads as cross-site here whatever it puts in the body.
  const site = request.headers.get('sec-fetch-site')

  return site === 'same-origin' || site === 'none'
}
