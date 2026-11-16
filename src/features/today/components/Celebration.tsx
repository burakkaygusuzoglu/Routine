import { useEffect, useState } from 'react'
import { CELEBRATION_MS } from '../celebration'

interface Props {
  /** Routine colours (CSS values) for the rings. */
  colors: string[]
  done: number
  total: number
  onClose: () => void
}

function prefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

const CSS = `
@keyframes celebrate-ring { from { transform: scale(0.2); opacity: 0.9; } to { transform: scale(1); opacity: 0; } }
@keyframes celebrate-pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.celebrate-ring { animation: celebrate-ring 1.6s ease-out both; }
.celebrate-pop { animation: celebrate-pop 0.4s ease-out both; }
`

/** Full-screen "Bugün tamam". Closes itself after ~2.5 s or on tap. Static card with reduced motion. */
export function Celebration({ colors, done, total, onClose }: Props) {
  const [still] = useState(prefersReducedMotion)
  useEffect(() => {
    const id = setTimeout(onClose, CELEBRATION_MS)
    return () => clearTimeout(id)
  }, [onClose])

  const rings = colors.length > 0 ? colors : ['var(--color-accent)']
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-40 flex items-center justify-center bg-bg/90">
      {!still && (
        <>
          <style>{CSS}</style>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            {rings.map((c, i) => (
              <span
                key={i}
                className="celebrate-ring absolute aspect-square w-[min(90vw,90vh)] rounded-full border-4"
                style={{ borderColor: c, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </>
      )}
      <div className={`${still ? '' : 'celebrate-pop'} relative flex flex-col items-center gap-1 rounded-hero bg-surface px-8 py-6 text-center`}>
        <p className="text-large-title font-bold">Bugün tamam</p>
        <p className="text-body text-muted">
          {done}/{total} rutin işaretli
        </p>
      </div>
      <button type="button" onClick={onClose} aria-label="Kapat" className="absolute inset-0 size-full" />
    </div>
  )
}
