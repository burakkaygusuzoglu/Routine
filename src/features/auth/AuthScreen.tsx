import type { DXCAlert, DXCUserInteraction } from 'dexie-cloud-addon'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { requestCode } from '../../data/auth'
import { ROUTINE_COLOR_KEYS, ROUTINE_COLORS, type RoutineColor } from '../../design/palette'
import { RoutineIcon, type RoutineIconName } from '../../design/routineIcons'
import { CodeInput } from './CodeInput'
import { codeOf, emptyCells, isComplete, resendSecondsLeft, type CellsUpdate } from './codeCells'
import { alertText, isValidEmail } from './messages'

const FIELD =
  'w-full min-h-[var(--tap)] rounded-control border border-field-line bg-bg px-3 text-body text-text placeholder:text-muted focus:border-accent focus:outline-none'
const PRIMARY = 'w-full min-h-[50px] rounded-control bg-accent text-headline font-semibold text-on-accent disabled:opacity-40'
const LINK = 'min-h-[var(--tap)] px-2 text-body text-muted underline-offset-4 hover:text-text'

/** Remembers what the person typed between the email and code steps. */
const PENDING_NAME_KEY = 'routine.pendingName'

function Alerts({ alerts }: { alerts: DXCAlert[] }) {
  if (alerts.length === 0) return null
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {alerts.map((a, i) => (
        <p
          key={i}
          role={a.type === 'error' ? 'alert' : 'status'}
          className={`rounded-control px-3 py-2 text-footnote ${a.type === 'error' ? 'bg-danger/15 text-danger' : 'bg-raised text-muted'}`}
        >
          {alertText(a)}
        </p>
      ))}
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 pb-[calc(var(--safe-bottom)+24px)] pt-[calc(var(--safe-top)+24px)]">
      <main className="flex w-full max-w-[400px] flex-col gap-6">{children}</main>
    </div>
  )
}

/** Eight routine colours as hard-stop conic segments with a small gap. */
const RING_GRADIENT = `conic-gradient(${ROUTINE_COLOR_KEYS.map((k, i) => {
  const a = i * 45
  return `${ROUTINE_COLORS[k]} ${a + 2}deg ${a + 43}deg, transparent ${a + 43}deg ${a + 47}deg`
}).join(', ')})`
const RING_MASK = 'radial-gradient(farthest-side, transparent calc(100% - 10px), black calc(100% - 9px))'

const BENEFITS: { icon: RoutineIconName; color: RoutineColor; text: string }[] = [
  { icon: 'leaf', color: 'green', text: 'Kötü günde minimum yeter' },
  { icon: 'sun', color: 'amber', text: 'Uyanınca rutinlerin kayar' },
  { icon: 'shield', color: 'sky', text: 'Verilerin yalnızca sende' },
]

function Hero() {
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <div className="relative size-36" aria-hidden="true">
        <div
          className="absolute inset-0 animate-[spin_40s_linear_infinite] rounded-full motion-reduce:animate-none"
          style={{
            background: RING_GRADIENT,
            WebkitMask: RING_MASK,
            mask: RING_MASK,
          }}
        />
        <svg className="absolute inset-0" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r="46" className="fill-surface" />
          <path d="M52 74l15 15 27-31" fill="none" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" className="stroke-accent" />
        </svg>
      </div>
      <div className="text-large-title font-bold">Routine</div>
      <p className="text-body text-muted">Başlamak, bitirmekten önemli.</p>
      <ul className="flex flex-col gap-2 pt-1 text-left">
        {BENEFITS.map((b) => (
          <li key={b.text} className="flex items-center gap-3 text-body">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-surface" style={{ color: ROUTINE_COLORS[b.color] }}>
              <RoutineIcon name={b.icon} size={18} />
            </span>
            <span>{b.text}</span>
          </li>
        ))}
      </ul>
    </header>
  )
}

function Card({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 rounded-hero border border-line bg-surface p-4 shadow-xl">{children}</div>
}

function EmailStep({ ui }: { ui: Extract<DXCUserInteraction, { type: 'email' }> }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const ids = { email: useId(), name: useId(), terms: useId() }
  const valid = isValidEmail(email) && (mode === 'signin' || accepted)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    try {
      if (mode === 'signup' && name.trim()) localStorage.setItem(PENDING_NAME_KEY, name.trim())
      else localStorage.removeItem(PENDING_NAME_KEY)
    } catch {
      // Private mode: the name is optional, carry on.
    }
    ui.onSubmit({ email: email.trim().toLowerCase() })
  }

  return (
    <Shell>
      <Hero />
      <Card>
        <div role="tablist" aria-label="Giriş türü" className="grid grid-cols-2 gap-1 rounded-control bg-bg p-1">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-[var(--tap)] rounded-[9px] text-footnote font-semibold ${mode === m ? 'bg-raised text-text' : 'text-muted'}`}
            >
              {m === 'signin' ? 'Giriş yap' : 'Kayıt ol'}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {mode === 'signup' && (
            <div className="flex flex-col gap-2">
              <label htmlFor={ids.name} className="text-footnote font-semibold text-muted">
                Adın (isteğe bağlı)
              </label>
              <input id={ids.name} className={FIELD} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.email} className="text-footnote font-semibold text-muted">
              E-posta
            </label>
            <input
              id={ids.email}
              className={FIELD}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="ornek@eposta.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {mode === 'signup' && (
            <label htmlFor={ids.terms} className="flex min-h-[var(--tap)] items-start gap-3 text-footnote text-muted">
              <input
                id={ids.terms}
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]"
              />
              <span>
                Verilerimin hesabıma bağlı olarak Dexie Cloud sunucularında saklanmasını kabul ediyorum. Verilerimi yalnızca ben görebilirim.
              </span>
            </label>
          )}
          <Alerts alerts={ui.alerts} />
          <button type="submit" className={PRIMARY} disabled={!valid || busy}>
            {mode === 'signin' ? 'Kod gönder' : 'Hesap oluştur'}
          </button>
          <p className="text-center text-footnote text-muted">
            Şifre yok. E-postana gelen tek kullanımlık kodla girersin.
            {mode === 'signin' && ' Hesabın yoksa ilk girişte oluşturulur.'}
          </p>
        </form>
      </Card>
    </Shell>
  )
}

function OtpStep({ ui }: { ui: Extract<DXCUserInteraction, { type: 'otp' }> }) {
  const [cells, setCells] = useState<string[]>(emptyCells)
  const [busy, setBusy] = useState(false)
  const [sentAt, setSentAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const labelId = useId()
  const email = ui.alerts.find((a) => a.messageParams?.email)?.messageParams.email
  const firstBox = useRef<HTMLDivElement>(null)
  const left = resendSecondsLeft(sentAt, now)

  // A new prompt (for example "wrong code") clears the boxes and starts over.
  useEffect(() => {
    setBusy(false)
    setCells(emptyCells())
    firstBox.current?.querySelector('input')?.focus()
  }, [ui])

  useEffect(() => {
    if (left === 0) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [left])

  function submit(next: readonly string[]) {
    if (busy || !isComplete(next)) return
    setBusy(true)
    ui.onSubmit({ otp: codeOf(next) })
  }

  function change(u: CellsUpdate) {
    setCells(u.cells)
    submit(u.cells)
  }

  return (
    <Shell>
      <div className="flex flex-col gap-2">
        <h1 className="text-large-title font-bold">Kodu gir</h1>
        <p className="text-body text-muted">
          {email ? (
            <>
              <span className="text-text">{email}</span> adresine bir kod gönderdik.
            </>
          ) : (
            'E-postana bir kod gönderdik.'
          )}
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(cells)
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2" ref={firstBox}>
          <span id={labelId} className="text-footnote font-semibold text-muted">
            Doğrulama kodu
          </span>
          <CodeInput cells={cells} onChange={change} labelledBy={labelId} readOnly={busy} />
        </div>
        <Alerts alerts={ui.alerts.filter((a) => a.messageCode !== 'OTP_SENT' || !email)} />
        <button type="submit" className={PRIMARY} disabled={!isComplete(cells) || busy}>
          Doğrula
        </button>
      </form>
      <div className="flex flex-wrap justify-center gap-2">
        {email && (
          <button
            type="button"
            className={`${LINK} disabled:opacity-60`}
            disabled={left > 0}
            onClick={() => {
              setSentAt(Date.now())
              setNow(Date.now())
              ui.onCancel()
              void requestCode(email)
            }}
          >
            {left > 0 ? `Kodu tekrar gönder (${left} sn)` : 'Kodu tekrar gönder'}
          </button>
        )}
        <button type="button" className={LINK} onClick={() => ui.onCancel()}>
          Farklı e-posta kullan
        </button>
      </div>
    </Shell>
  )
}

function MessageStep({ ui }: { ui: DXCUserInteraction }) {
  return (
    <Shell>
      <h1 className="text-title font-bold">{ui.type === 'logout-confirmation' ? 'Çıkış yapılsın mı?' : 'Bilgi'}</h1>
      <Alerts alerts={ui.alerts} />
      <div className="flex flex-col gap-2">
        <button type="button" className={PRIMARY} onClick={() => ui.onSubmit({})}>
          {ui.type === 'logout-confirmation' ? 'Yine de çıkış yap' : 'Tamam'}
        </button>
        {ui.cancelLabel && (
          <button type="button" className={LINK} onClick={() => ui.onCancel()}>
            Vazgeç
          </button>
        )}
      </div>
    </Shell>
  )
}

/** Full-screen sign-in and sign-up, driven by the sync service's prompts. */
export function AuthScreen({ ui }: { ui: DXCUserInteraction }) {
  if (ui.type === 'email') return <EmailStep ui={ui} />
  if (ui.type === 'otp') return <OtpStep ui={ui} />
  return <MessageStep ui={ui} />
}

export { PENDING_NAME_KEY }
