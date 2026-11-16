import { describe, expect, it } from 'vitest'
import { backspaceAt, cleanChars, codeOf, emptyCells, fillFrom, inputAt, isComplete, resendSecondsLeft } from './codeCells'

describe('code input', () => {
  it('keeps letters and digits only', () => {
    expect(cleanChars(' ab-12 c3\n')).toBe('ab12c3')
  })

  it('types one character and moves to the next box', () => {
    const r = inputAt(emptyCells(), 0, 'a')
    expect(r.cells[0]).toBe('a')
    expect(r.focus).toBe(1)
  })

  it('stays on the last box after the last character', () => {
    const r = inputAt(emptyCells(), 7, '9')
    expect(r.cells[7]).toBe('9')
    expect(r.focus).toBe(7)
  })

  it('replaces a filled box with the newly typed character', () => {
    const cells = fillFrom(emptyCells(), 0, 'a').cells
    expect(inputAt(cells, 0, 'ab').cells[0]).toBe('b')
    expect(inputAt(cells, 0, 'ba').cells[0]).toBe('b')
  })

  it('ignores characters that are not letters or digits', () => {
    const r = inputAt(emptyCells(), 2, '-')
    expect(r.cells).toEqual(emptyCells())
    expect(r.focus).toBe(2)
  })

  it('paste fills all boxes, ignoring separators and overflow', () => {
    const r = fillFrom(emptyCells(), 0, ' AB12 cd34-XYZ ')
    expect(codeOf(r.cells)).toBe('AB12cd34')
    expect(isComplete(r.cells)).toBe(true)
    expect(r.focus).toBe(7)
  })

  it('a short paste focuses the first empty box', () => {
    const r = fillFrom(emptyCells(), 0, '123')
    expect(r.focus).toBe(3)
    expect(isComplete(r.cells)).toBe(false)
  })

  it('autofill into a middle box spreads forward', () => {
    const r = inputAt(emptyCells(), 5, 'abcdef')
    expect(codeOf(r.cells)).toBe('abc')
    expect(r.cells.slice(5)).toEqual(['a', 'b', 'c'])
  })

  it('backspace clears a filled box and stays', () => {
    const cells = fillFrom(emptyCells(), 0, 'abc').cells
    const r = backspaceAt(cells, 2)
    expect(r.cells[2]).toBe('')
    expect(r.focus).toBe(2)
  })

  it('backspace on an empty box goes back and clears the previous one', () => {
    const cells = fillFrom(emptyCells(), 0, 'abc').cells
    const r = backspaceAt(cells, 3)
    expect(r.cells[2]).toBe('')
    expect(r.cells[1]).toBe('b')
    expect(r.focus).toBe(2)
  })

  it('backspace on the first empty box does nothing harmful', () => {
    const r = backspaceAt(emptyCells(), 0)
    expect(r.cells).toEqual(emptyCells())
    expect(r.focus).toBe(0)
  })

  it('counts the resend wait down from 30 seconds', () => {
    expect(resendSecondsLeft(1000, 1000)).toBe(30)
    expect(resendSecondsLeft(1000, 1500)).toBe(30)
    expect(resendSecondsLeft(1000, 11_000)).toBe(20)
    expect(resendSecondsLeft(1000, 31_000)).toBe(0)
    expect(resendSecondsLeft(1000, 99_000)).toBe(0)
  })
})
