import type { DXCAlert, DXCUserInteraction } from 'dexie-cloud-addon'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { requestCode } from '../../data/auth'
import { alertText, isValidEmail } from './messages'

const FIELD =
  'w-full min-h-[var(--tap)] rounded-control border border-field-line bg-bg px-3 text-body text-text placeholder:text-muted focus:border-accent focus:outline-none'
const PRIMARY =
  'w-full min-h-[50px] rounded-control bg-accent text-headline font-semibold text-on-accent disabled:opacity-40'
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

function Brand() {
  return (
    <div className="flex flex-col items-center gap-3 pb-2 text-center">
      <svg aria-hidden="true" width="64" height="64" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="16" className="fill-surface" />
        <circle cx="32" cy="32" r="18" fill="none" strokeWidth="5" className="stroke-accent" />
        <path d="M24 32.5l5.5 5.5 11-12" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="stroke-accent" />
      </svg>
      <div className="text-large-title font-bold">Routine</div>
      <p className="text-body text-muted">Başlamak, bitirmekten önemli.</p>
    </div>
  )
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
      <Brand />
      <div role="tablist" aria-label="Giriş türü" className="grid grid-cols-2 gap-1 rounded-control bg-surface p-1">
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
            <span>Verilerimin hesabıma bağlı olarak Dexie Cloud sunucularında saklanmasını kabul ediyorum. Verilerimi yalnızca ben görebilirim.</span>
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
    </Shell>
  )
}

function OtpStep({ ui }: { ui: Extract<DXCUserInteraction, { type: 'otp' }> }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const email = ui.alerts.find((a) => a.messageParams?.email)?.messageParams.email
  useEffect(() => {
    setBusy(false)
    input.current?.focus()
  }, [ui])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (code.trim().length < 4) return
    setBusy(true)
    ui.onSubmit({ otp: code.trim() })
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
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor={id} className="text-footnote font-semibold text-muted">
            Doğrulama kodu
          </label>
          <input
            id={id}
            ref={input}
            className={`${FIELD} text-center text-title font-semibold tracking-[0.3em]`}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
          />
        </div>
        <Alerts alerts={ui.alerts.filter((a) => a.messageCode !== 'OTP_SENT' || !email)} />
        <button type="submit" className={PRIMARY} disabled={code.trim().length < 4 || busy}>
          Doğrula
        </button>
        <div className="flex flex-wrap justify-center gap-2">
          {email && (
            <button
              type="button"
              className={LINK}
              onClick={() => {
                ui.onCancel()
                void requestCode(email)
              }}
            >
              Kodu tekrar gönder
            </button>
          )}
          <button type="button" className={LINK} onClick={() => ui.onCancel()}>
            Farklı e-posta kullan
          </button>
        </div>
      </form>
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
