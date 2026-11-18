import type { StudyDay, StudyEntry } from '../../domain/types'

export const MAX_SUBJECTS = 12
export const MAX_SUBJECT_LENGTH = 40

/** Same name, ignoring case and surrounding space (Turkish-aware). */
function same(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('tr') === b.trim().toLocaleLowerCase('tr')
}

/** Why `name` cannot be used, in Turkish, or null when it is fine. `ignore` is the name being renamed. */
export function subjectError(list: string[], name: string, ignore?: string): string | null {
  const clean = name.trim()
  if (!clean) return 'Bir ad yaz.'
  if (clean.length > MAX_SUBJECT_LENGTH) return `En fazla ${MAX_SUBJECT_LENGTH} karakter.`
  if (list.some((s) => same(s, clean) && !(ignore !== undefined && s === ignore))) return 'Bu konu zaten var.'
  if (ignore === undefined && list.length >= MAX_SUBJECTS) return `En fazla ${MAX_SUBJECTS} konu olabilir.`
  return null
}

export function addSubject(list: string[], name: string): string[] {
  return subjectError(list, name) ? list : [...list, name.trim()]
}

export function renameSubject(list: string[], from: string, to: string): string[] {
  if (!list.includes(from) || subjectError(list, to, from)) return list
  return list.map((s) => (s === from ? to.trim() : s))
}

export function removeSubject(list: string[], name: string): string[] {
  return list.filter((s) => s !== name)
}

/** Moves a subject one place up (-1) or down (+1). */
export function moveSubject(list: string[], name: string, delta: -1 | 1): string[] {
  const i = list.indexOf(name)
  const j = i + delta
  if (i < 0 || j < 0 || j >= list.length) return list
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/**
 * Renames the subject label on every note that uses `from`. Notes keep their text.
 * Returns the same object when nothing changed (so callers can skip the write).
 */
export function renameSubjectInEntries(study: StudyDay, from: string, to: string): StudyDay {
  if (!study.entries.some((e) => e.subject === from)) return study
  const entries = study.entries.map((e): StudyEntry => {
    if (e.subject !== from) return e
    // A note whose text was just the subject name follows the rename.
    return { ...e, subject: to, text: e.text === from ? to : e.text }
  })
  return { ...study, entries }
}
