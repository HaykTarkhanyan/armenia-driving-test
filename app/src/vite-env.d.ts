/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Only for a local build against a temporary test branch. */
  readonly VITE_AUTH_URL?: string
  readonly VITE_API_URL?: string
}
