import { ROUTINE_COLORS, routineInk, tint } from '../../../design/palette'
import { RoutineIcon } from '../../../design/routineIcons'
import { clockToMinutes } from '../../../domain/date'
import type { CompletionStatus, Routine } from '../../../domain/types'
import { BLOCK_PX, HOUR_PX, hourLabel, layoutBlocks, nowOffset, offsetFor, rangeHeight, timelineRange } from '../timeline'
import { useNowMinutes } from '../useNowMinutes'
import { CheckCircle } from './CheckCircle'

export interface TimelineEntry {
  routine: Routine
  /** Null: no time, goes to the "Gün içinde" strip. */
  time: string | null
  status: CompletionStatus | undefined
}

interface Props {
  entries: TimelineEntry[]
  nextId: string | null
  onCheck: (entry: TimelineEntry) => void
  onOpen: (routine: Routine) => void
}

const isDone = (s: CompletionStatus | undefined) => s === 'full' || s === 'min'

function BlockContent({ entry, isNext, onCheck, onOpen }: { entry: TimelineEntry; isNext: boolean; onCheck: () => void; onOpen: () => void }) {
  const { routine, status } = entry
  const color = ROUTINE_COLORS[routine.color]
  /** Same hue, darker in the light theme: for text and icons. */
  const ink = routineInk(routine.color)
  const done = isDone(status)
  const state = status === 'full' ? 'full' : status === 'min' ? 'min' : 'pending'
  return (
    <div
      className="flex h-full items-center overflow-hidden rounded-row pl-0 pr-2"
      style={{ background: tint(routine.color), boxShadow: isNext ? `inset 0 0 0 1px ${color}` : undefined }}
    >
      <CheckCircle
        state={state}
        color={routine.color}
        label={done ? `${routine.name}: işareti kaldır` : `${routine.name}: tamamla`}
        onPress={onCheck}
      />
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${routine.name}: seçenekleri aç`}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-1 text-left"
      >
        <span className="shrink-0" style={{ color: ink }}>
          <RoutineIcon name={routine.icon} size={18} />
        </span>
        <span className={`min-w-0 truncate text-footnote font-semibold ${done || status === 'skipped' ? 'text-muted' : ''}`}>{routine.name}</span>
      </button>
    </div>
  )
}

/** Vertical day timeline with an untimed "Gün içinde" strip above it. */
export function Timeline({ entries, nextId, onCheck, onOpen }: Props) {
  const nowMin = useNowMinutes()
  const timed = entries.filter((e) => e.time !== null)
  const untimed = entries.filter((e) => e.time === null)
  const minutesById = new Map(timed.map((e) => [e.routine.id, clockToMinutes(e.time!)]))
  const range = timelineRange([...minutesById.values()])
  const blocks = layoutBlocks(
    timed.map((e) => ({ id: e.routine.id, minutes: minutesById.get(e.routine.id)! })),
    range,
  )
  const entryById = new Map(timed.map((e) => [e.routine.id, e]))
  const now = nowOffset(nowMin, range)
  const hours = Array.from({ length: range.endHour - range.startHour }, (_, i) => range.startHour + i)

  return (
    <div className="flex flex-col gap-3">
      {untimed.length > 0 && (
        <section aria-label="Gün içinde" className="flex flex-col gap-1">
          <h2 className="text-footnote font-semibold text-muted">Gün içinde</h2>
          <ul className="flex flex-col gap-1">
            {untimed.map((e) => (
              <li key={e.routine.id} className="h-12">
                <BlockContent entry={e} isNext={nextId === e.routine.id} onCheck={() => onCheck(e)} onOpen={() => onOpen(e.routine)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="relative" style={{ height: rangeHeight(range) + BLOCK_PX / 2 }}>
        {hours.map((h) => (
          <div key={h} className="absolute inset-x-0 flex items-start gap-2" style={{ top: offsetFor(h * 60, range), height: HOUR_PX }}>
            <span className="w-10 shrink-0 -translate-y-2 text-caption text-muted">{hourLabel(h)}</span>
            <span className="mt-0 h-px flex-1 bg-line" />
          </div>
        ))}

        <ul className="absolute inset-y-0 left-12 right-0" aria-label="Çizelge">
          {blocks.map((b) => {
            const e = entryById.get(b.id)!
            return (
              <li
                key={b.id}
                className="absolute px-px"
                style={{
                  top: b.top,
                  height: BLOCK_PX,
                  left: `${(b.lane / b.lanes) * 100}%`,
                  width: `${100 / b.lanes}%`,
                }}
              >
                <BlockContent entry={e} isNext={nextId === b.id} onCheck={() => onCheck(e)} onOpen={() => onOpen(e.routine)} />
              </li>
            )
          })}
        </ul>

        {now !== null && (
          <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: now }} role="presentation">
            <span className="ml-10 size-2 rounded-full bg-accent" />
            <span className="h-0.5 flex-1 bg-accent" />
          </div>
        )}
      </div>
    </div>
  )
}
