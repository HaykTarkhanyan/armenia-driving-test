// Keeps a signed-in account's progress on the server. The app always works from localStorage; this module loads the
// server's rows once on start and uploads new ones in batches. It never polls: an idle tab sends nothing, so the free
// database can go to sleep (backend/README.md).
import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { AuthFailure, currentUser, getToken, signInWithGoogle, signOut, type AuthUser } from './auth.ts'
import { API_URL } from './config.ts'
import {
  absorbGuestProgress,
  AnswerRowSchema,
  EDITION,
  emptyProgress,
  ExamResultSchema,
  getLoadError,
  getProgress,
  mergeFromServer,
  onSaved,
  rememberedUser,
  removeStoredAccount,
  replaceProgress,
  updateProgress,
  useStorageOf,
} from './progress.ts'

const UPLOAD_DELAY_MS = 20_000
const BATCH = { answers: 500, exams: 20 }
const KEEPALIVE_MAX_BYTES = 60_000 // browsers refuse keepalive bodies over 64 KB

const StateSchema = z.object({
  edition: z.string(),
  answers: z.array(AnswerRowSchema),
  exams: z.array(ExamResultSchema),
  otherEditionAnswers: z.number().int().min(0),
})

export type SyncState = {
  /** checking: asking who is signed in. offline: signed in earlier, the server cannot be reached right now. */
  phase: 'checking' | 'guest' | 'ready' | 'saving' | 'offline' | 'error'
  account: AuthUser | null
  message: string | null
  /** Answers saved under an earlier edition of the questions; kept on the server but not shown. */
  otherEditionAnswers: number
}

let state: SyncState = { phase: 'checking', account: null, message: null, otherEditionAnswers: 0 }
const listeners = new Set<() => void>()

function setState(change: Partial<SyncState>): void {
  state = { ...state, ...change }
  for (const l of listeners) l()
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function api(path: string, init: RequestInit = {}, fresh = false): Promise<unknown> {
  const token = await getToken({ fresh })
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
  } catch (err) {
    throw new AuthFailure(`Սերվերին չհաջողվեց միանալ. ${(err as Error).message}`, true)
  }
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null
  if (res.ok) return body
  const code = body?.error?.code ?? 'unknown'
  if (code === 'token_expired' && !fresh) return api(path, init, true)
  throw new ApiError(res.status, code, `Սերվերի սխալ (${res.status} ${code}). ${body?.error?.message ?? ''}`)
}

function report(err: unknown): void {
  if (err instanceof AuthFailure && err.network) {
    setState({ phase: 'offline', message: null })
    return
  }
  console.error(err)
  setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
}

// ---------------------------------------------------------------- upload

let uploading: Promise<void> | null = null
let timer: number | null = null

function pendingCount(): number {
  if (getLoadError() !== null) return 0
  const { pending } = getProgress()
  return pending.answers.length + pending.exams.length
}

async function uploadAll(keepalive: boolean): Promise<void> {
  for (;;) {
    const p = getProgress()
    const answerIds = new Set(p.pending.answers.slice(0, BATCH.answers))
    const examIds = new Set(p.pending.exams.slice(0, BATCH.exams))
    if (answerIds.size === 0 && examIds.size === 0) return
    const body = JSON.stringify({
      edition: EDITION,
      answers: p.answers.filter((a) => answerIds.has(a.id)),
      exams: p.exams.filter((e) => examIds.has(e.id)),
    })
    await api('/v1/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: keepalive && body.length < KEEPALIVE_MAX_BYTES,
    })
    // Only what was sent is removed: an answer given during the upload stays pending.
    updateProgress((now) => ({
      ...now,
      pending: {
        answers: now.pending.answers.filter((id) => !answerIds.has(id)),
        exams: now.pending.exams.filter((id) => !examIds.has(id)),
      },
    }))
  }
}

/** Sends everything not yet on the server. Safe to call at any time; a failure keeps the data on this device. */
export function flush(keepalive = false): Promise<void> {
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
  if (uploading) return uploading
  if (state.account === null || pendingCount() === 0) return Promise.resolve()
  setState({ phase: 'saving', message: null })
  uploading = uploadAll(keepalive)
    .then(() => setState({ phase: 'ready', message: null }))
    .catch(report)
    .finally(() => {
      uploading = null
    })
  return uploading
}

function schedule(): void {
  if (state.account === null || timer !== null || pendingCount() === 0) return
  timer = window.setTimeout(() => {
    timer = null
    void flush()
  }, UPLOAD_DELAY_MS)
}

// ---------------------------------------------------------------- session

async function loadAccount(user: AuthUser): Promise<void> {
  useStorageOf(user.id)
  setState({ account: user, phase: 'saving', message: null })
  absorbGuestProgress()
  const server = StateSchema.parse(await api(`/v1/state?edition=${encodeURIComponent(EDITION)}`))
  updateProgress((p) => mergeFromServer(p, server))
  setState({ phase: 'ready', otherEditionAnswers: server.otherEditionAnswers })
  await flush()
}

let booted = false

/** Once per page load: who is signed in, then load their progress. */
export async function boot(): Promise<void> {
  if (booted) return
  booted = true
  onSaved(schedule)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush(true)
  })
  window.addEventListener('online', () => void flush())
  try {
    const user = await currentUser()
    if (user === null) {
      useStorageOf(null)
      setState({ phase: 'guest', account: null, message: null })
      return
    }
    await loadAccount(user)
  } catch (err) {
    const last = rememberedUser()
    if (err instanceof AuthFailure && err.network && last !== null) {
      // Offline on a device that was signed in: keep working on that account's copy, upload when back online.
      setState({ phase: 'offline', account: state.account ?? { id: last, email: '', name: '' }, message: null })
      return
    }
    if (state.account === null) setState({ phase: 'guest' })
    report(err)
  }
}

export async function startGoogleSignIn(): Promise<void> {
  await signInWithGoogle()
}

/** Uploads first. What could not be uploaded stays on this device and goes up at the next sign-in to this account. */
export async function signOutNow(): Promise<void> {
  const account = state.account
  await flush()
  const left = pendingCount()
  if (left > 0 && !window.confirm(`${left} պատասխան դեռ չի պահվել սերվերում։ Դուրս գալ միևնույն է։ Դրանք կուղարկվեն, երբ նորից մուտք գործես այս սարքից։`)) return
  await signOut()
  if (account && left === 0) removeStoredAccount(account.id)
  useStorageOf(null)
  setState({ phase: 'guest', account: null, message: null, otherEditionAnswers: 0 })
}

/** "Reset": for an account the server's rows go first, or they would come back at the next load. */
export async function resetProgress(): Promise<void> {
  if (state.account !== null) await api('/v1/progress', { method: 'DELETE' })
  replaceProgress(emptyProgress())
}
