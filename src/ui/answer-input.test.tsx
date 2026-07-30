import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AnswerKind } from '@/core/answer-kind'

import { AnswerInput } from './answer-input'

afterEach(cleanup)

function renderInput(kind: AnswerKind) {
  const onSubmit = vi.fn()
  render(<AnswerInput kind={kind} label="Réponse" onSubmit={onSubmit} />)

  return { field: screen.getByLabelText<HTMLInputElement>('Réponse'), onSubmit }
}

describe('AnswerInput', () => {
  it('sends what was typed and empties the field for the next question', () => {
    const { field, onSubmit } = renderInput('meaning')

    fireEvent.change(field, { target: { value: 'eau' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('eau')
    expect(field.value).toBe('')
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
