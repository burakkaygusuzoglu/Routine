/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEXIE_CLOUD_URL?: string
  readonly VITE_APP_VERSION?: string
  /** Base URL of the push server (Cloudflare Worker). Empty = push reminders are off. */
  readonly VITE_PUSH_URL?: string
  /** VAPID public key (base64url) that push subscriptions are made with. */
  readonly VITE_VAPID_PUBLIC_KEY?: string
}
