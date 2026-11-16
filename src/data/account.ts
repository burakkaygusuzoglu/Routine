import { useObservable } from 'dexie-react-hooks'
import { BehaviorSubject } from 'rxjs'
import type { UserLogin } from 'dexie-cloud-addon'
import { db, type RoutineDB } from './db'
import { createStore } from './store'

const signedOut = new BehaviorSubject<UserLogin | null>(null)
const idleSync = new BehaviorSubject<SyncSnapshot>({ phase: 'initial' })
const idleSocket = new BehaviorSubject<SocketStatus>('not-started')

/** The parts of Dexie Cloud's `syncState` we read. */
export interface SyncSnapshot {
  phase: 'initial' | 'not-in-sync' | 'pushing' | 'pulling' | 'in-sync' | 'error' | 'offline'
  error?: { message?: string }
}

/** Dexie Cloud's `webSocketStatus` values. */
export type SocketStatus = 'not-started' | 'connecting' | 'connected' | 'disconnected' | 'error'

export type SyncKind = 'synced' | 'syncing' | 'offline' | 'error'

export interface SyncStatus {
  kind: SyncKind
  /** Short label for the Settings screen (Turkish). */
  text: string
  /** Error message for a details line; only set when `kind` is "error". */
  detail: string | null
}

const SYNC_TEXT: Record<SyncKind, string> = {
  synced: 'Eşitlendi',
  syncing: 'Eşitleniyor…',
  offline: 'Çevrimdışı · değişiklikler bekliyor',
  error: 'Eşitleme hatası',
}

/** Maps Dexie Cloud's sync phase and websocket status to what the person sees. */
export function deriveSyncStatus(sync: SyncSnapshot, socket: SocketStatus): SyncStatus {
  const make = (kind: SyncKind, detail: string | null = null): SyncStatus => ({ kind, text: SYNC_TEXT[kind], detail })
  switch (sync.phase) {
    case 'error':
      return make('error', sync.error?.message || 'Bilinmeyen hata.')
    case 'offline':
      return make('offline')
    case 'in-sync':
      return make('synced')
    case 'pushing':
    case 'pulling':
      return make('syncing')
    case 'not-in-sync':
      // Changes are waiting. If the live connection is down they cannot leave yet.
      return make(socket === 'disconnected' || socket === 'error' ? 'offline' : 'syncing')
    default:
      return make(socket === 'disconnected' || socket === 'error' ? 'offline' : 'syncing')
  }
}

export interface Account {
  /** False in local-only mode (no cloud URL configured). */
  cloud: boolean
  email: string | null
  /** Days left when Dexie Cloud lists this account as an evaluation user. */
  evalDaysLeft: number | null
  /** Null in local-only mode. */
  sync: SyncStatus | null
  /** Runs a full sync now. No-op in local-only mode. */
  syncNow(): Promise<void>
  logout(): Promise<void>
}

/** Signed-in account for the Settings screen. Features use this, never `db`. */
export function useAccount(): Account {
  const user = useObservable<UserLogin | null, null>(db.isCloud ? db.cloud.currentUser : signedOut, null)
  const syncState = useObservable<SyncSnapshot, SyncSnapshot>(db.isCloud ? db.cloud.syncState : idleSync, idleSync.value)
  const socket = useObservable<SocketStatus, SocketStatus>(db.isCloud ? db.cloud.webSocketStatus : idleSocket, 'not-started')
  return {
    cloud: db.isCloud,
    sync: db.isCloud ? deriveSyncStatus(syncState, socket) : null,
    syncNow: async () => {
      if (!db.isCloud) return
      try {
        await db.cloud.sync({ wait: true, purpose: 'push' })
        await db.cloud.sync({ wait: true, purpose: 'pull' })
      } catch {
        // The error shows up in syncState.
      }
    },
    email: user?.isLoggedIn ? (user.email ?? user.userId ?? null) : null,
    evalDaysLeft: user?.isLoggedIn && user.license?.type === 'eval' ? (user.license.evalDaysLeft ?? null) : null,
    logout: async () => {
      if (!db.isCloud) return
      try {
        await db.cloud.logout()
      } catch {
        // The person chose to keep unsynced changes and stay signed in.
      }
    },
  }
}

/**
 * Deletes every routine, tick, day log, note and setting in one transaction,
 * then recreates the starter routines. In cloud mode the deletes are pushed to
 * the server (so every device loses the data) and the person is logged out.
 */
export async function deleteAllData(database: RoutineDB = db): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    await Promise.all(database.tables.map((t) => t.clear()))
  })
  if (database.isCloud) await database.cloud.sync({ purpose: 'push', wait: true })
  await createStore(database).init()
  if (database.isCloud) {
    await database.cloud.sync({ purpose: 'push', wait: true })
    await database.cloud.logout({ force: true })
  }
}
