/**
 * Dexie Cloud database URL (not a secret). Empty = local-only mode, used by
 * tests and by local development without an account.
 */
export const CLOUD_URL: string = import.meta.env.VITE_DEXIE_CLOUD_URL ?? ''
