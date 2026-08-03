'use client'

import { Line } from '@/ui/atoms/subject-line'
import { Patterns } from '@/ui/atoms/subject-patterns'
import { Prose } from '@/ui/atoms/subject-prose'
import { ReadingBlock } from '@/ui/atoms/subject-reading-block'
import { Sentences } from '@/ui/atoms/subject-sentences'
import { Strip } from '@/ui/atoms/subject-strip'
import { SubjectFiling } from '@/ui/atoms/subject-filing'
import { Well } from '@/ui/atoms/subject-well'
import { acceptedIn } from '@/core/subject'
import type { AnswerKind } from '@/core/answer-kind'
import type { Band, Flow, Subject } from '@/core/subject'
import type { SubjectCopy } from '@/core/site-copy'

// The order is the order it is learnt in: what it means, what that really covers, how it is
// read, how to keep it, what it is made of, and only then how it behaves in a sentence.
export function SubjectBody({
  subject,
  copy,
  flow,
  band,
  asked,
}: {
  subject: Subject
  copy: SubjectCopy
  flow: Flow
  band: Band | null
  asked?: AnswerKind
}) {
  return (
    <>
      {/* The one the headline is not. Asked for a reading, the meaning is what the reader
          still has to be told, and it takes a heading here rather than the middle. */}
      {asked === 'reading' ? (
        <Line
          label={copy.meaning}
          values={acceptedIn(subject.meanings)}
        />
      ) : null}
      <Prose label={copy.nuance} text={subject.nuance} />
      <Line label={copy.synonyms} values={subject.synonyms} />
      {/* An untyped reading is exactly what the headline already carries, so it is dropped
          there and kept everywhere it says something more: on'yomi and kun'yomi are a
          distinction no single line can make. */}
      <ReadingBlock
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
        <Well>
          <Strip label={copy.components} parts={subject.components} />
          <Prose label={copy.mnemonic} text={subject.mnemonic} />
        </Well>
      )}
      <Prose label={copy.yourNote} text={subject.meaningNote} />
      <Prose label={copy.yourNote} text={subject.readingNote} />
      <Strip label={copy.usedIn} parts={subject.usedIn} />
      <Strip label={copy.similar} parts={subject.similar} />
      <Line label={copy.wordType} values={subject.partsOfSpeech} />
      <Patterns patterns={subject.patterns} label={copy.patterns} />
      <Sentences sentences={subject.sentences} label={copy.sentences} />

      {/* An answer the source refuses outright, whatever a tier would have decided. Shown
          while teaching, where knowing what will not be accepted is the lesson, and never
          during recall, where it would be the answer. */}
      {flow === 'lesson' ? (
        <Line label={copy.never} values={subject.refused} struck />
      ) : null}

      <SubjectFiling subject={subject} copy={copy} band={band} />
    </>
  )
}
