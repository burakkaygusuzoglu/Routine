/** Pure logic for the 8-box one-time code input. */

export const CODE_LENGTH = 8
export const RESEND_SECONDS = 30

export type Cells = readonly string[]

export const emptyCells = (): string[] => Array.from({ length: CODE_LENGTH }, () => '')

/** Keeps letters and digits only (drops spaces, dashes, anything pasted along). */
export function cleanChars(raw: string): string {
  // Sign-in codes are upper case; normalise so lower-case typing or pasting still works.
  return raw.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase()
}

export interface CellsUpdate {
  cells: string[]
  /** Box that should have focus afterwards. */
  focus: number
}

/** Writes `chars` into the boxes starting at `from`; extra characters are dropped. */
export function fillFrom(cells: Cells, from: number, raw: string): CellsUpdate {
  const next = [...cells]
  const chars = Array.from(cleanChars(raw))
  let i = from
  for (const c of chars) {
    if (i >= CODE_LENGTH) break
    next[i++] = c
  }
  return { cells: next, focus: Math.min(chars.length === 0 ? from : i, CODE_LENGTH - 1) }
}

/**
 * Handles the text a box reports after an edit. Typing over a filled box gives
 * two characters; the new one wins. Several characters (autofill) spread forward.
 */
export function inputAt(cells: Cells, index: number, raw: string): CellsUpdate {
  const prev = cells[index]
  let chars = Array.from(cleanChars(raw))
  if (chars.length === 0) {
    const next = [...cells]
    next[index] = ''
    return { cells: next, focus: index }
  }
  if (prev && chars.length === 2) {
    chars = chars[0] === prev ? [chars[1]] : chars[1] === prev ? [chars[0]] : chars
  }
  return fillFrom(cells, index, chars.join(''))
}

/** Backspace: clears this box, or when it is already empty steps back and clears that one. */
export function backspaceAt(cells: Cells, index: number): CellsUpdate {
  const next = [...cells]
  if (next[index]) {
    next[index] = ''
    return { cells: next, focus: index }
  }
  const prev = Math.max(0, index - 1)
  next[prev] = ''
  return { cells: next, focus: prev }
}

export const codeOf = (cells: Cells): string => cells.join('')

export const isComplete = (cells: Cells): boolean => cells.length === CODE_LENGTH && cells.every((c) => c.length > 0)

/** Whole seconds left before "resend" unlocks; 0 once the wait is over. */
export function resendSecondsLeft(sentAt: number, now: number, total = RESEND_SECONDS): number {
  return Math.max(0, Math.ceil(total - (now - sentAt) / 1000))
}
