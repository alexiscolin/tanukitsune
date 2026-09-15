import { describe, expect, it } from 'vitest'

import { numbersAsDigits } from './numbers'

describe('numbersAsDigits', () => {
  it('writes a number word as its digits', () => {
    expect(numbersAsDigits('deux')).toBe('2')
    expect(numbersAsDigits('un')).toBe('1')
    expect(numbersAsDigits('une')).toBe('1')
    expect(numbersAsDigits('zéro')).toBe('0')
  })

  it('reads the compounds French builds its numbers from', () => {
    expect(numbersAsDigits('dix-sept')).toBe('17')
    expect(numbersAsDigits('vingt et un')).toBe('21')
    expect(numbersAsDigits('vingt-et-un')).toBe('21')
    expect(numbersAsDigits('soixante-dix')).toBe('70')
    expect(numbersAsDigits('soixante et onze')).toBe('71')
    expect(numbersAsDigits('quatre-vingts')).toBe('80')
    expect(numbersAsDigits('quatre-vingt-dix-sept')).toBe('97')
    expect(numbersAsDigits('quarante-deux')).toBe('42')
  })

  it('reads hundreds, thousands and millions', () => {
    expect(numbersAsDigits('cent')).toBe('100')
    expect(numbersAsDigits('cent un')).toBe('101')
    expect(numbersAsDigits('trois cents')).toBe('300')
    expect(numbersAsDigits('deux cent vingt')).toBe('220')
    expect(numbersAsDigits('mille')).toBe('1000')
    expect(numbersAsDigits('dix mille')).toBe('10000')
    expect(numbersAsDigits('cent mille')).toBe('100000')
    expect(numbersAsDigits('mille deux cents')).toBe('1200')
    expect(numbersAsDigits('dix millions')).toBe('10000000')
  })

  it('writes the number inside a phrase and leaves the words around it', () => {
    expect(numbersAsDigits('dix minutes')).toBe('10 minutes')
    expect(numbersAsDigits('le huit')).toBe('le 8')
    expect(numbersAsDigits('cinq cents yens')).toBe('500 yens')
  })

  it('joins digits a space groups by the thousand', () => {
    expect(numbersAsDigits('10 000 personnes')).toBe('10000 personnes')
  })

  // A run French never writes is not a number anybody meant, so it is left as typed rather than summed
  // into one: deux deux is not quatre, and cent cent is not dix mille.
  it('leaves a run of number words that is not how French writes a number', () => {
    expect(numbersAsDigits('deux deux')).toBe('deux deux')
    expect(numbersAsDigits('cent cent')).toBe('cent cent')
    expect(numbersAsDigits('un mille')).toBe('un mille')
    expect(numbersAsDigits('vingt-un')).toBe('vingt-un')
  })

  it('leaves a word that only starts like a number', () => {
    expect(numbersAsDigits('quarante-deuxième étage')).toBe('quarante-deuxième étage')
    expect(numbersAsDigits('au-dessus')).toBe('au-dessus')
    expect(numbersAsDigits('et')).toBe('et')
  })
})
