import type { DXCUserInteraction, UserLogin } from 'dexie-cloud-addon'
import { useObservable } from 'dexie-react-hooks'
import { BehaviorSubject } from 'rxjs'
import { db } from './db'

const none = new BehaviorSubject<undefined>(undefined)

export interface AuthState {
  /** False in local-only mode: no sign-in at all. */
  cloud: boolean
  user: UserLogin | undefined
  /** What the sign-in flow is asking for right now (email, code, message...). */
  interaction: DXCUserInteraction | undefined
}

/** Sign-in state for the auth gate. Features use this, never `db`. */
export function useAuthState(): AuthState {
  const user = useObservable<UserLogin | undefined, undefined>(db.isCloud ? db.cloud.currentUser : none, undefined)
  const interaction = useObservable<DXCUserInteraction | undefined, undefined>(
    db.isCloud ? db.cloud.userInteraction : none,
    undefined,
  )
  return { cloud: db.isCloud, user, interaction }
}

/** Starts a fresh code request for `email` (used by "Kodu tekrar gönder"). */
export function requestCode(email: string): Promise<void> {
  return db.cloud.login({ email, grant_type: 'otp' })
}

/**
 * Opens the database. In cloud mode this is what starts the sign-in flow
 * (requireAuth), so the app calls it on launch before anything else.
 */
export function openDatabase(): Promise<unknown> {
  return db.open().catch(() => undefined)
}
