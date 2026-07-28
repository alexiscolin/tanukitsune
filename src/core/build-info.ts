export type BuildInfo = {
  readonly commit: string
  readonly builtAt: string
}

// An unstamped build is an answer, not a failure: the caller asked which build this is.
const UNSTAMPED = 'unknown'

export function readBuildInfo(env: Record<string, string | undefined>): BuildInfo {
  return {
    commit: env['TANUKITSUNE_COMMIT'] ?? UNSTAMPED,
    builtAt: env['TANUKITSUNE_BUILT_AT'] ?? UNSTAMPED,
  }
}
