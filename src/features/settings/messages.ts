/** Turns an unknown error into a short, non-blaming Turkish message. */
export function sheetErrorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Bir şey ters gitti. Tekrar dene.'
}
