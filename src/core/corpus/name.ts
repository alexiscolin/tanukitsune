// What a component name has to be before anybody reads it. These are the faults a single name can
// carry on its own; whether two components ended up with the same name is a question about the whole
// set and `collidingNames` in `decomposition.ts` answers it.
//
// The rules are read off the names already written rather than invented: every one of them opens on a
// definite article and none runs past three words.

// Latin letters with the diacritics French writes, plus the ligatures, the apostrophe and the hyphen.
// Anything else is another language's script or a character that wandered in from the subject.
const FRENCH = /^[a-zà-öø-ÿœæ' -]+$/i

const MOST_WORDS = 3

export function faultInName(name: string, character: string): string | null {
  const written = name.trim()

  if (!/^(le |la |les |l')/.test(written)) return 'no article'
  if (!FRENCH.test(written)) return 'not french'
  if (written.split(' ').length > MOST_WORDS) return 'too long'
  if (written.includes(character)) return 'not french'

  return null
}
