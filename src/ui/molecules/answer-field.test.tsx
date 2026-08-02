import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AnswerKind } from '@/core/answer-kind'

import { AnswerField } from './answer-field'

afterEach(cleanup)

const UNCONVERTED = "La conversion n'est pas terminée."

// One change event per keystroke, appending to what the field holds, because that is the
// only shape in which the buffer behind the field can be told apart from the kana on it.
function type(field: HTMLInputElement, romaji: string) {
  for (const key of romaji) fireEvent.change(field, { target: { value: field.value + key } })
}

function renderInput(kind: AnswerKind, { autoFocus = false, judged = false } = {}) {
  const onSubmit = vi.fn()
  const onEdit = vi.fn()
  render(
    <AnswerField
      kind={kind}
      label="Réponse"
      unconverted={UNCONVERTED}
      autoFocus={autoFocus}
      judged={judged}
      onSubmit={onSubmit}
      onEdit={onEdit}
    />,
  )

  return { field: screen.getByLabelText<HTMLInputElement>('Réponse'), onSubmit, onEdit }
}

describe('AnswerField', () => {
  it('sends what was typed and keeps it, because it is what has to be looked at again', () => {
    const { field, onSubmit } = renderInput('meaning')

    fireEvent.change(field, { target: { value: 'eau' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('eau')
    expect(field.value).toBe('eau')
  })

  it('withdraws a verdict as soon as the reader types again, since it was about other text', () => {
    const { field, onEdit } = renderInput('meaning', { judged: true })

    fireEvent.change(field, { target: { value: 'ea' } })

    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('says nothing about text nothing has judged yet', () => {
    const { field, onEdit } = renderInput('meaning')

    fireEvent.change(field, { target: { value: 'ea' } })

    expect(onEdit).not.toHaveBeenCalled()
  })

  it('sends the answer unnormalised, because the judge is what decides what a match is', () => {
    const { field, onSubmit } = renderInput('meaning')

    fireEvent.change(field, { target: { value: '  Eau ' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('  Eau ')
  })

  it('sends nothing from a field holding only whitespace, which is not an answer', () => {
    const { field, onSubmit } = renderInput('meaning')

    fireEvent.change(field, { target: { value: '   ' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('sends nothing on the Enter the editor is using to confirm a conversion', () => {
    const { field, onSubmit } = renderInput('reading')

    fireEvent.change(field, { target: { value: 'みず' } })
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(field.value).toBe('みず')
  })

  it('sends nothing on the Enter that ended a composition, then sends on the next one', () => {
    const { field, onSubmit } = renderInput('reading')

    fireEvent.change(field, { target: { value: 'みず' } })
    fireEvent.compositionEnd(field)
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('みず')
  })

  it('takes the focus as it appears when it replaced another field', () => {
    const { field } = renderInput('reading', { autoFocus: true })

    expect(document.activeElement).toBe(field)
  })

  // The first field of a session is not a field that replaced anything, and taking the
  // focus there reads the field to a screen reader before the question it answers.
  it('leaves the focus alone otherwise', () => {
    renderInput('reading')

    expect(document.activeElement).toBe(document.body)
  })

  // `fireEvent` returns false when the handler prevented the default, which is the only
  // thing a document with no next screen in it can assert about the key being consumed.
  it('consumes the Enter it sent an answer on, so nothing that replaces the field is pressed', () => {
    const { field } = renderInput('meaning')

    fireEvent.change(field, { target: { value: 'eau' } })

    expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(false)
  })

  it('consumes the Enter it refused a reading on, for the same reason', () => {
    const { field } = renderInput('reading')

    type(field, '123')

    expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(false)
  })

  it('leaves the Enter an editor is confirming a conversion with to the editor', () => {
    const { field } = renderInput('reading')

    fireEvent.change(field, { target: { value: 'みず' } })

    expect(fireEvent.keyDown(field, { key: 'Enter', isComposing: true })).toBe(true)
  })

  it('ignores a key that is not Enter, so the answer is still being typed', () => {
    const { field, onSubmit } = renderInput('meaning')

    fireEvent.change(field, { target: { value: 'ea' } })
    fireEvent.keyDown(field, { key: 'u' })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('lets nothing but the editor change the field, so the verdict grades what was typed', () => {
    const { field } = renderInput('meaning')

    expect(field.getAttribute('autocorrect')).toBe('off')
    expect(field.getAttribute('autocapitalize')).toBe('off')
    expect(field.getAttribute('autocomplete')).toBe('off')
    expect(field.getAttribute('spellcheck')).toBe('false')
  })

  it('declares a reading field Japanese, so a screen reader and a keyboard pick the right language', () => {
    const { field } = renderInput('reading')

    expect(field.getAttribute('lang')).toBe('ja')
  })

  it('leaves a meaning field to inherit the document language, which the locale segment sets', () => {
    const { field } = renderInput('meaning')

    expect(field.hasAttribute('lang')).toBe(false)
  })
})

describe('AnswerField, converting a reading', () => {
  it('turns romaji into kana as it is typed, so no Japanese keyboard is needed', () => {
    const { field } = renderInput('reading')

    fireEvent.change(field, { target: { value: 'mizu' } })

    expect(field.value).toBe('みず')
  })

  it('reads a doubled n as the syllable it starts, keystroke by keystroke', () => {
    const { field } = renderInput('reading')

    type(field, 'tennou')

    expect(field.value).toBe('てんのう')
  })

  it('does the same where the syllable is not the last one', () => {
    const { field } = renderInput('reading')

    type(field, 'konnichi')

    expect(field.value).toBe('こんにち')
  })

  it('corrects a lone n once a vowel follows it', () => {
    const { field } = renderInput('reading')

    type(field, 'kan')
    expect(field.value).toBe('かん')

    type(field, 'i')
    expect(field.value).toBe('かに')
  })

  it('leaves a meaning alone, since it is typed in the language of the interface', () => {
    const { field, onSubmit } = renderInput('meaning')

    fireEvent.change(field, { target: { value: 'eau' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('eau')
  })

  it('leaves the text to an editor from the moment it starts, before it has said what it holds', () => {
    const { field } = renderInput('reading')

    fireEvent.compositionStart(field)
    fireEvent.change(field, { target: { value: 'ka' } })

    expect(field.value).toBe('ka')
  })

  it('leaves the text to a Japanese editor while it composes, rather than converting under it', () => {
    const { field } = renderInput('reading')

    fireEvent.compositionStart(field)
    fireEvent.compositionUpdate(field, { data: 'みず' })
    fireEvent.change(field, { target: { value: 'ka' } })

    expect(field.value).toBe('ka')
  })

  it('converts through a Latin composition, which is what an Android keyboard produces', () => {
    const { field } = renderInput('reading')

    fireEvent.compositionStart(field)
    fireEvent.compositionUpdate(field, { data: 'ka' })
    fireEvent.change(field, { target: { value: 'ka' } })

    expect(field.value).toBe('か')
  })

  it('converts again once the editor has handed the text back', () => {
    const { field } = renderInput('reading')

    fireEvent.compositionStart(field)
    fireEvent.compositionUpdate(field, { data: 'みず' })
    fireEvent.compositionEnd(field)
    fireEvent.change(field, { target: { value: 'ka' } })

    expect(field.value).toBe('か')
  })

  it('leaves a correction made mid-answer as typed, so the caret stays where the reader put it', () => {
    const { field } = renderInput('reading')

    fireEvent.change(field, { target: { value: 'みずうみ' } })
    fireEvent.change(field, { target: { value: 'みずkaうみ', selectionStart: 5 } })

    expect(field.value).toBe('みずkaうみ')
  })
})

describe('AnswerField, refusing a reading that is not kana', () => {
  it('finalises on Enter what a correction left mid-answer', () => {
    const { field, onSubmit } = renderInput('reading')

    fireEvent.change(field, { target: { value: 'みずうみ' } })
    fireEvent.change(field, { target: { value: 'みずkaうみ', selectionStart: 5 } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('みずかうみ')
  })

  it('accepts half-width kana, which the judge folds and no message should stand in front of', () => {
    const { field, onSubmit } = renderInput('reading')

    fireEvent.change(field, { target: { value: 'ﾐｽﾞ' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('ﾐｽﾞ')
  })

  it('says it again on a second Enter, since a live region announces a change and not a state', () => {
    const { field } = renderInput('reading')

    fireEvent.change(field, { target: { value: '漢字' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    const first = screen.getByText(UNCONVERTED)

    fireEvent.keyDown(field, { key: 'Enter' })

    expect(screen.getByText(UNCONVERTED)).not.toBe(first)
  })

  it('sends nothing, keeps the text, and says what is missing', () => {
    const { field, onSubmit } = renderInput('reading')

    fireEvent.change(field, { target: { value: '漢字' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(field.value).toBe('漢字')
    expect(screen.getByText(UNCONVERTED)).toBeDefined()
  })

  it('marks the field invalid and points it at the message, for a reader who cannot see it', () => {
    const { field } = renderInput('reading')

    fireEvent.change(field, { target: { value: '漢字' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(field.getAttribute('aria-invalid')).toBe('true')
    const describedBy = field.getAttribute('aria-describedby')
    expect(describedBy).not.toBeNull()
    expect(document.getElementById(describedBy ?? '')?.textContent).toBe(UNCONVERTED)
  })

  it('drops the message as soon as the reader types again', () => {
    const { field } = renderInput('reading')

    fireEvent.change(field, { target: { value: '漢字' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    fireEvent.change(field, { target: { value: 'かんじ' } })

    expect(screen.queryByText(UNCONVERTED)).toBeNull()
    expect(field.getAttribute('aria-invalid')).toBeNull()
  })

  it('refuses punctuation the converter accepts, which would cost an item its stage', () => {
    const { field, onSubmit } = renderInput('reading')

    fireEvent.change(field, { target: { value: '/' } })
    expect(field.value).toBe('・')

    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(UNCONVERTED)).toBeDefined()
  })

  it('sends the reading once it is kana, and the prolonged sound mark counts as kana', () => {
    const { field, onSubmit } = renderInput('reading')

    fireEvent.change(field, { target: { value: 'こー' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('こー')
  })
})
