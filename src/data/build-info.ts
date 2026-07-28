import 'server-only'

import { readBuildInfo, type BuildInfo } from '@/core/build-info'
import { env } from './env'

export function currentBuild(): BuildInfo {
  return readBuildInfo(env)
}
