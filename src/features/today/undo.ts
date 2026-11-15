import type { CompletionStatus, DateKey, Routine } from '../../domain/types'

/** How long the undo toast stays on screen. */
export const UNDO_MS = 4000

/** An undoable change: enough to restore the entry as it was before. */
export interface UndoEntry {
  /** Changes with every new toast, so a repeat of the same change restarts the timer. */
  key: number
  routineId: string
  date: DateKey
  message: string
  /** Status to restore; null means "no entry". */
  previous: CompletionStatus | null
}

/** Toast text for the status that was just set (null = cleared). */
export function undoMessage(routineName: string, next: CompletionStatus | null): string {
  const label =
    next === 'full' ? 'Tamamlandı' : next === 'min' ? 'Minimum yapıldı' : next === 'skipped' ? 'Atlandı' : 'İşaret kaldırıldı'
  return `${routineName} · ${label}`
}

/** Builds the undo entry for a change, or null when nothing actually changed. */
export function makeUndo(
  routine: Pick<Routine, 'id' | 'name'>,
  date: DateKey,
  previous: CompletionStatus | null | undefined,
  next: CompletionStatus | null,
  key: number,
): UndoEntry | null {
  const prev = previous ?? null
  if (prev === next) return null
  return { key, routineId: routine.id, date, message: undoMessage(routine.name, next), previous: prev }
}

/** The store call that reverses `entry`. */
export function inverseAction(entry: UndoEntry): { routineId: string; date: DateKey; status: CompletionStatus | null } {
  return { routineId: entry.routineId, date: entry.date, status: entry.previous }
}
