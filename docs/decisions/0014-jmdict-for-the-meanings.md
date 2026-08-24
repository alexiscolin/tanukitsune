# 0014. JMdict for the meanings

## Status

Accepted.

## Context

A card teaches what a word means, and nothing said what the words of the curriculum mean in French. Three sources could answer.

WaniKani states a meaning for every subject it deals, in English. Its curriculum is its content and its
inventory is not published from here, so a meaning read there cannot travel into a corpus anybody else
receives. It is also English, and translating it would make the French layer a translation of theirs
rather than a corpus of ours.

A model could write the meanings directly. It would cover every word and cost a few dollars, and it
would produce a corpus nobody can check: a wrong meaning is a defect that ships to every reader
forever, and checking six thousand of them means a person reading six thousand of them.

JMdict states each word of the language with its senses and glosses a subset in French.

## Decision

Meanings are read from JMdict. A word it does not gloss in the locale is left out rather than
half-written, and being left out is what says the word is owed to a later run.

This follows the rule the corpus already holds everywhere: what a table can decide, the table decides,
and the model writes prose. It is the same shape as keys, which come from KANJIDIC2 with a model only
ordering the glosses a character already has.

## Consequences

JMdict glosses about four fifths of them. What it leaves is largely transparent compounds it does not
bother stating, and those are what `corpus:word` asks a model for, so every word of the curriculum
carries a meaning between the two.

JMdict is CC BY-SA 4.0, from the same group as KANJIDIC2 and under the same licence, so one attribution
answers for both and the derived file committed here carries that licence. `docs/sources.md` holds the
attribution.

A meaning in the corpus can be checked against the release that stated it. That is the property the
model could not have given, and it is the whole reason for the choice.
