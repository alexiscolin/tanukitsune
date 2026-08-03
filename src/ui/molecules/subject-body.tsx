'use client'

import { SubjectFiling } from '@/ui/atoms/subject-filing'
import { SubjectLine } from '@/ui/atoms/subject-line'
import { SubjectPatterns } from '@/ui/atoms/subject-patterns'
import { SubjectProse } from '@/ui/atoms/subject-prose'
import { SubjectReadingBlock } from '@/ui/molecules/subject-reading-block'
import { SubjectSentences } from '@/ui/atoms/subject-sentences'
import { SubjectStrip } from '@/ui/atoms/subject-strip'
import { SubjectWell } from '@/ui/atoms/subject-well'
import { acceptedIn } from '@/core/subject'
import type { AnswerKind } from '@/core/answer-kind'
import type { Flow, Subject } from '@/core/subject'
import type { SubjectCopy } from '@/core/site-copy'

// The order is the order it is learnt in: what it means, what that really covers, how it is
// read, how to keep it, what it is made of, and only then how it behaves in a sentence.
export function SubjectBody({
  subject,
  copy,
  flow,
  asked,
}: {
  subject: Subject
  copy: SubjectCopy
  flow: Flow
  asked?: AnswerKind
}) {
  return (
    <>
      {/* The one the headline is not. Asked for a reading, the meaning is what the reader
          still has to be told, and it takes a heading here rather than the middle. */}
      {asked === 'reading' ? (
        <SubjectLine label={copy.meaning} values={acceptedIn(subject.meanings)} />
      ) : null}
      <SubjectProse label={copy.nuance} text={subject.nuance} />
      <SubjectLine label={copy.synonyms} values={subject.synonyms} />
      {/* An untyped reading is exactly what the headline already carries, so it is dropped
          there and kept everywhere it says something more: on'yomi and kun'yomi are a
          distinction no single line can make. */}
      <SubjectReadingBlock
        copy={copy}
        readings={
          asked === 'reading'
            ? subject.readings.filter((reading) => reading.type !== null)
            : subject.readings
        }
      />
      {/* What the character is made of, then how to keep it, in that order and inside the
          well: the pieces are what the mnemonic is built out of, so reading them second means
          reading the story before its words. */}
      {subject.components.length === 0 && subject.mnemonic === null ? null : (
        <SubjectWell>
          <SubjectStrip label={copy.components} parts={subject.components} />
          <SubjectProse label={copy.mnemonic} text={subject.mnemonic} />
        </SubjectWell>
      )}
      <SubjectProse label={copy.yourNote} text={subject.meaningNote} />
      <SubjectProse label={copy.yourNote} text={subject.readingNote} />
      <SubjectStrip label={copy.usedIn} parts={subject.usedIn} />
      <SubjectStrip label={copy.similar} parts={subject.similar} />
      <SubjectLine label={copy.wordType} values={subject.partsOfSpeech} />
      <SubjectPatterns patterns={subject.patterns} label={copy.patterns} />
      <SubjectSentences sentences={subject.sentences} label={copy.sentences} />

      {/* An answer the source refuses outright, whatever a tier would have decided. Shown
          while teaching, where knowing what will not be accepted is the lesson, and never
          during recall, where it would be the answer. */}
      {flow === 'lesson' ? (
        <SubjectLine label={copy.never} values={subject.refused} struck />
      ) : null}

      <SubjectFiling subject={subject} copy={copy} />
    </>
  )
}
