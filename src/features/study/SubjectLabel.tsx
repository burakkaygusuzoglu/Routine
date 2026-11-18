import { ROUTINE_COLOR_KEYS, ROUTINE_COLORS, routineInk, tint } from '../../design/palette'

/** Stable colour per subject: its position in the list; removed subjects get the neutral look. */
export function subjectColorKey(subjects: string[], name: string | null | undefined) {
  if (!name) return null
  const i = subjects.indexOf(name)
  return i < 0 ? null : ROUTINE_COLOR_KEYS[i % ROUTINE_COLOR_KEYS.length]
}

/** CSS colour for bars and dots. */
export function subjectFill(subjects: string[], name: string | null | undefined): string {
  const k = subjectColorKey(subjects, name)
  return k ? ROUTINE_COLORS[k] : 'var(--color-muted)'
}

/** Small tinted label with the subject name. */
export function SubjectLabel({ subjects, name }: { subjects: string[]; name: string }) {
  const k = subjectColorKey(subjects, name)
  return (
    <span
      className="inline-block max-w-full truncate rounded-cell px-2 py-0.5 align-middle text-caption font-semibold"
      style={
        k
          ? { background: tint(k), color: routineInk(k) }
          : { background: 'var(--color-bg)', color: 'var(--color-muted)' }
      }
    >
      {name}
    </span>
  )
}
