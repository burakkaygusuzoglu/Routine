import { useId, useState } from 'react'
import { ROUTINE_COLORS, ROUTINE_COLOR_KEYS, type RoutineColor } from '../../design/palette'
import { store } from '../../data/store'
import type { AnchorType, Routine } from '../../domain/types'
import { Button } from './components/Button'
import { SegmentedControl } from './components/SegmentedControl'
import { sheetErrorText } from './messages'
import { Sheet } from './components/Sheet'
import { Switch } from './components/Switch'
import {
  DAY_LONG,
  DAY_SHORT,
  applyDraft,
  createRoutine,
  draftFromRoutine,
  isChanged,
  isValid,
  newDraft,
  toggleDay,
  validateDraft,
  type RoutineDraft,
} from './logic'

const COLOR_NAMES: Record<RoutineColor, string> = {
  amber: 'Sarı',
  sky: 'Gök mavisi',
  violet: 'Mor',
  coral: 'Mercan',
  blue: 'Mavi',
  green: 'Yeşil',
  pink: 'Pembe',
  teal: 'Turkuaz',
}

const ANCHORS: { value: AnchorType; label: string }[] = [
  { value: 'wake', label: 'Uyanınca' },
  { value: 'fixed', label: 'Sabit saat' },
  { value: 'bedtime', label: 'Yatmadan önce' },
]

const FIELD =
  'min-h-[var(--tap)] w-full rounded-control border border-field-line bg-bg px-3 text-body text-text'

interface Props {
  /** The routine to edit, or null to create a new one. */
  routine: Routine | null
  /** All routines including archived, used to place a new routine last. */
  all: Routine[]
  onClose: () => void
}

/** Mount this only while the sheet is wanted; it starts from a fresh draft each time. */
export function RoutineEditSheet({ routine, all, onClose }: Props) {
  const [draft, setDraft] = useState<RoutineDraft>(() => (routine ? draftFromRoutine(routine) : newDraft()))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nameId = useId()
  const timeId = useId()
  const offsetId = useId()
  const minId = useId()

  const set = <K extends keyof RoutineDraft>(key: K, value: RoutineDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const errors = validateDraft(draft)
  const canSave = !busy && isValid(draft) && (routine === null || isChanged(routine, draft))

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await task()
      onClose()
    } catch (e) {
      setError(sheetErrorText(e))
      setBusy(false)
    }
  }

  const save = () =>
    run(() =>
      store.saveRoutine(
        routine ? applyDraft(routine, draft) : createRoutine(draft, all, crypto.randomUUID(), new Date()),
      ),
    )

  return (
    <Sheet
      open
      onClose={onClose}
      title={routine ? 'Rutini düzenle' : 'Yeni rutin'}
      action={
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="min-h-[var(--tap)] min-w-[var(--tap)] text-body font-semibold text-accent disabled:text-muted disabled:opacity-60"
        >
          Kaydet
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <section className="rounded-card bg-surface p-4">
          <label htmlFor={nameId} className="text-footnote font-semibold text-muted">
            Ad
          </label>
          <input
            id={nameId}
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            aria-invalid={errors.name !== undefined && draft.name !== ''}
            className={`${FIELD} mt-2`}
            autoComplete="off"
          />
          <p className="mt-4 text-footnote font-semibold text-muted" id={`${nameId}-color`}>
            Renk
          </p>
          <div role="group" aria-labelledby={`${nameId}-color`} className="mt-2 grid grid-cols-4">
            {ROUTINE_COLOR_KEYS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={COLOR_NAMES[c]}
                aria-pressed={draft.color === c}
                onClick={() => set('color', c)}
                className="flex min-h-[var(--tap)] items-center justify-center"
              >
                <span
                  className={`size-8 rounded-full ${draft.color === c ? 'outline-2 outline-offset-2 outline-text' : ''}`}
                  style={{ backgroundColor: ROUTINE_COLORS[c] }}
                />
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-card bg-surface p-4">
          <p className="mb-2 text-footnote font-semibold text-muted">Ne zaman</p>
          <SegmentedControl label="Ne zaman" options={ANCHORS} value={draft.anchor} onChange={(v) => set('anchor', v)} />
          {draft.anchor === 'fixed' ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <label htmlFor={timeId} className="text-body">
                Saat
              </label>
              <input
                id={timeId}
                type="time"
                value={draft.fixedTime}
                onChange={(e) => set('fixedTime', e.target.value)}
                aria-invalid={errors.time !== undefined}
                className="min-h-[var(--tap)] rounded-control border border-field-line bg-bg px-3 text-right text-headline font-semibold"
              />
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3">
              <label htmlFor={offsetId} className="text-body">
                {draft.anchor === 'wake' ? 'Uyandıktan kaç dk sonra' : 'Yatmadan kaç dk önce'}
              </label>
              <input
                id={offsetId}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={draft.offset}
                onChange={(e) => set('offset', e.target.value)}
                aria-invalid={errors.offset !== undefined}
                aria-describedby={errors.offset ? `${offsetId}-err` : undefined}
                className="min-h-[var(--tap)] w-24 rounded-control border border-field-line bg-bg px-3 text-right text-headline font-semibold"
              />
            </div>
          )}
          {errors.offset && (
            <p id={`${offsetId}-err`} className="mt-1 text-footnote text-muted">
              {errors.offset}
            </p>
          )}
          <p className="mt-4 text-footnote font-semibold text-muted" id={`${timeId}-days`}>
            Günler
          </p>
          <div role="group" aria-labelledby={`${timeId}-days`} className="mt-2 grid grid-cols-7">
            {DAY_SHORT.map((label, i) => {
              const on = draft.days.includes(i)
              return (
                <button
                  key={label}
                  type="button"
                  aria-label={DAY_LONG[i]}
                  aria-pressed={on}
                  onClick={() => set('days', toggleDay(draft.days, i))}
                  className="flex min-h-[var(--tap)] min-w-0 items-center justify-center px-0.5"
                >
                  <span
                    className={`flex h-10 w-full items-center justify-center rounded-control text-footnote font-semibold ${
                      on ? 'text-on-accent' : 'bg-bg text-muted'
                    }`}
                    style={on ? { backgroundColor: ROUTINE_COLORS[draft.color] } : undefined}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
          {errors.days && (
            <p role="status" className="mt-2 text-footnote text-muted">
              {errors.days}
            </p>
          )}
        </section>

        <section className="rounded-card bg-surface p-4">
          <label htmlFor={minId} className="text-footnote font-semibold text-muted">
            Minimum versiyon (kötü gün için)
          </label>
          <input
            id={minId}
            value={draft.minText}
            onChange={(e) => set('minText', e.target.value)}
            aria-describedby={`${minId}-hint`}
            className={`${FIELD} mt-2`}
            autoComplete="off"
          />
          <p id={`${minId}-hint`} className="mt-2 text-footnote text-muted">
            Bunu yapmak da tik sayılır ve seriyi korur.
          </p>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-card bg-surface p-4">
          <div>
            <p className="text-body font-semibold">Takvim alarmı</p>
            <p className="text-footnote text-muted">Saatinde iPhone Takvim çalar</p>
          </div>
          <Switch label="Takvim alarmı" checked={draft.calendarAlarm} onChange={(v) => set('calendarAlarm', v)} />
        </section>

        {error && (
          <p role="alert" className="text-footnote text-danger">
            {error}
          </p>
        )}

        {routine && (
          <Button variant="danger" disabled={busy} onClick={() => run(() => store.archiveRoutine(routine.id))}>
            Rutini arşivle
          </Button>
        )}
      </div>
    </Sheet>
  )
}
