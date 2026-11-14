import { useObservable } from 'dexie-react-hooks'
import { BehaviorSubject } from 'rxjs'
import type { UserLogin } from 'dexie-cloud-addon'
import { db } from './db'

const signedOut = new BehaviorSubject<UserLogin | null>(null)

export interface Account {
  /** False in local-only mode (no cloud URL configured). */
  cloud: boolean
  email: string | null
  /** Days left when Dexie Cloud lists this account as an evaluation user. */
  evalDaysLeft: number | null
  logout(): Promise<void>
}

/** Signed-in account for the Settings screen. Features use this, never `db`. */
export function useAccount(): Account {
  const user = useObservable<UserLogin | null, null>(db.isCloud ? db.cloud.currentUser : signedOut, null)
  return {
    cloud: db.isCloud,
    email: user?.isLoggedIn ? (user.email ?? user.userId ?? null) : null,
    evalDaysLeft: user?.isLoggedIn && user.license?.type === 'eval' ? (user.license.evalDaysLeft ?? null) : null,
    logout: async () => {
      if (db.isCloud) await db.cloud.logout()
    },
  }
}
