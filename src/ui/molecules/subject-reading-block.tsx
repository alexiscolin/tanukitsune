'use client'

import { SubjectBlock } from '@/ui/atoms/subject-block'
import { acceptedIn, refusedIn } from '@/core/subject'
import type { Reading } from '@/core/subject'
import type { SubjectCopy } from '@/core/site-copy'

// Grouped by kind and written in the script the convention gives each: katakana for a
// reading borrowed from Chinese, hiragana for one that was already Japanese. The script
// carries the distinction and the label only confirms it.
// A kind with no reading at all has no block. A kind whose readings are all listed without
// being accepted still has one, because those readings are real and worth learning: the
// source sends six kun'yomi on 下 and accepts none of them as an answer, and dropping them
// would teach that the character has two readings when it has eight. Accepted ones carry the
// weight, the rest recede and say why once.
export function SubjectReadingBlock({
  readings,
  copy,
}: {
  readings: readonly Reading[]
  copy: SubjectCopy
}) {
  const kinds = [...new Set(readings.map((reading) => reading.type))]

  return (
    <>
      {kinds.map((kind) => {
        const mine = readings.filter((reading) => reading.type === kind)
        const answerable = acceptedIn(mine)
        const listed = refusedIn(mine)

        return (
          <SubjectBlock
            key={kind ?? 'plain'}
            label={kind === null ? copy.plainReading : copy.reading[kind]}
          >
            {answerable.length === 0 ? null : (
              <p lang="ja" className="text-xl leading-relaxed">
                {answerable.join(' · ')}
              </p>
            )}
            {listed.length === 0 ? null : (
              <p lang="ja" className="text-sm text-[var(--color-ink-muted)]">
                {listed.join(' · ')}
                <span className="eyebrow ml-2">{copy.alsoShown}</span>
              </p>
            )}
          </SubjectBlock>
        )
      })}
    </>
  )
}
