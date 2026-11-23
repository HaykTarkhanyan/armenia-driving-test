// Keeps a signed-in account's progress on the server. The app always works from localStorage; this module loads the
// server's rows once on start and uploads new ones in batches. It never polls: an idle tab sends nothing, so the free
// database can go to sleep (backend/README.md).
import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { AuthFailure, currentUser, getToken, jwtSubject, signInWithGoogle, signOut, type AuthUser } from './auth.ts'
import { API_URL } from './config.ts'
import { migrateAnswer, migrateExam, migrationPath } from './editions.ts'
import {
  absorbGuestProgress,
  AnswerRowSchema,
  applyServerGeneration,
  clearSigningIn,
  downloadText,
  EDITION,
  emptyProgress,
  ExamResultSchema,
  getLoadError,
  getProgress,
  markSigningIn,
  mergeFromServer,
  onSaved,
  rememberedUser,
  removeStoredAccount,
  replaceProgress,
  takeSigningIn,
  updateProgress,
  useStorageOf,
  type Answer,
  type ExamResult,
} from './progress.ts'

const UPLOAD_DELAY_MS = 20_000
const BATCH = { answers: 500, exams: 20 }
const KEEPALIVE_MAX_BYTES = 60_000 // browsers refuse keepalive bodies over 64 KB

const StateSchema = z.object({
  edition: z.string(),
  generation: z.number().int().min(0),
  resetAt: z.string().nullable(),
  answers: z.array(AnswerRowSchema),
  exams: z.array(ExamResultSchema),
  older: z.object({
    answers: z.array(AnswerRowSchema.extend({ edition: z.string() })),
    exams: z.array(ExamResultSchema.extend({ edition: z.string() })),
  }),
})
const ResetSchema = z.object({ generation: z.number().int().min(1) })

export type SyncState = {
  /** checking: asking who is signed in. offline: signed in earlier, the server cannot be reached right now.
   * expired: the sign-in ran out; that account's progress stays on screen and syncs after signing in again.
   * limited: the server's daily limit is reached; progress stays on this device and uploads later. */
  phase: 'checking' | 'guest' | 'ready' | 'saving' | 'offline' | 'expired' | 'limited' | 'error'
  account: AuthUser | null
  message: string | null
  /** Answers on the server from an edition this version of the app cannot translate. */
  otherEditionAnswers: number
}

let state: SyncState = { phase: 'checking', account: null, message: null, otherEditionAnswers: 0 }
const listeners = new Set<() => void>()

function setState(change: Partial<SyncState>): void {
  state = { ...state, ...change }
  for (const l of listeners) l()
}

export function getSyncState(): SyncState {
  return state
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
  // The sign-in cookie is shared by all tabs. If another tab signed in as someone else, this tab's token now belongs to
  // that person: nothing may be sent, or this tab's upload, reset or delete would hit the wrong account.
  if (state.account !== null && jwtSubject(token) !== state.account.id) {
    const message = 'Այս բրաուզերում մուտք է գործվել այլ հաշվով։ Էջը թարմացվում է։'
    setState({ phase: 'error', message })
    window.location.reload()
    throw new Error(message)
  }
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

/** The account no longer exists (deleted here or on another device): forget its local copy and continue as a guest. */
function leaveDeletedAccount(message: string): void {
  const account = state.account
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
  if (account) removeStoredAccount(account.id)
  useStorageOf(null)
  setState({ phase: 'guest', account: null, message, otherEditionAnswers: 0 })
}

function report(err: unknown): void {
  if (err instanceof ApiError && err.code === 'account_deleted') {
    leaveDeletedAccount('Այս հաշիվը ջնջված է։')
    return
  }
  if (err instanceof ApiError && err.code === 'rate_limited') {
    setState({ phase: 'limited', message: 'Այսօրվա սահմանաչափը լրացել է։ Առաջընթացը պահված է այս սարքում և կուղարկվի ավելի ուշ։' })
    return
  }
  if (err instanceof ApiError && err.code === 'storage_full') {
    setState({ phase: 'limited', message: 'Սերվերի տարածքը գրեթե լրացել է։ Առաջընթացը պահված է այս սարքում։' })
    return
  }
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
/** Rows the server refused this session. They stay on the device and are tried again at the next start. */
const refused = { answers: new Set<string>(), exams: new Set<string>() }
/** Goes up around a reset, so that a load that started before it is thrown away. */
let resetEpoch = 0

function pendingCount(): number {
  if (getLoadError() !== null) return 0
  const { pending } = getProgress()
  return pending.answers.length + pending.exams.length
}

function uploadableCount(): number {
  if (getLoadError() !== null) return 0
  const { pending } = getProgress()
  return pending.answers.filter((id) => !refused.answers.has(id)).length + pending.exams.filter((id) => !refused.exams.has(id)).length
}

type Item = { kind: 'answer'; row: Answer } | { kind: 'exam'; row: ExamResult }

/** Sends a batch. If the server refuses it as invalid, narrows down by halves to the rows at fault, so that one bad row
 * cannot block everything else on this device. */
async function sendItems(items: Item[], generation: number, keepalive: boolean): Promise<void> {
  if (items.length === 0) return
  const body = JSON.stringify({
    edition: EDITION,
    generation,
    answers: items.flatMap((i) => (i.kind === 'answer' ? [i.row] : [])),
    exams: items.flatMap((i) => (i.kind === 'exam' ? [i.row] : [])),
  })
  try {
    await api('/v1/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: keepalive && body.length < KEEPALIVE_MAX_BYTES,
    })
  } catch (err) {
    if (!(err instanceof ApiError) || (err.code !== 'invalid_body' && err.code !== 'invalid_data')) throw err
    if (items.length === 1) {
      console.error(`The server refused ${items[0].kind} ${items[0].row.id}`, err)
      if (items[0].kind === 'answer') refused.answers.add(items[0].row.id)
      else refused.exams.add(items[0].row.id)
      return
    }
    const middle = Math.ceil(items.length / 2)
    await sendItems(items.slice(0, middle), generation, keepalive)
    await sendItems(items.slice(middle), generation, keepalive)
  }
}

async function uploadAll(keepalive: boolean): Promise<void> {
  let reloads = 0
  for (;;) {
    const p = getProgress()
    const answerIds = new Set(p.pending.answers.filter((id) => !refused.answers.has(id)).slice(0, BATCH.answers))
    const examIds = new Set(p.pending.exams.filter((id) => !refused.exams.has(id)).slice(0, BATCH.exams))
    if (answerIds.size === 0 && examIds.size === 0) return
    const items: Item[] = [
      ...p.answers.filter((a) => answerIds.has(a.id)).map((row): Item => ({ kind: 'answer', row })),
      ...p.exams.filter((e) => examIds.has(e.id)).map((row): Item => ({ kind: 'exam', row })),
    ]
    try {
      await sendItems(items, p.generation, keepalive)
    } catch (err) {
      // Progress was reset on another device: take that over, then send only what is newer than the reset.
      if (err instanceof ApiError && err.code === 'progress_reset' && reloads < 2) {
        reloads += 1
        await refreshFromServer()
        continue
      }
      throw err
    }
    // Only what was accepted is removed: an answer given during the upload stays pending.
    updateProgress((now) => ({
      ...now,
      pending: {
        answers: now.pending.answers.filter((id) => !answerIds.has(id) || refused.answers.has(id)),
        exams: now.pending.exams.filter((id) => !examIds.has(id) || refused.exams.has(id)),
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
  if (state.account === null || uploadableCount() === 0) return Promise.resolve()
  setState({ phase: 'saving', message: null })
  uploading = uploadAll(keepalive)
    .then(() => {
      const stuck = refused.answers.size + refused.exams.size
      setState({ phase: 'ready', message: stuck > 0 ? `${stuck} գրառում սերվերը չընդունեց։ Դրանք մնում են այս սարքում։` : null })
    })
    .catch(report)
    .finally(() => {
      uploading = null
    })
  return uploading
}

function schedule(): void {
  if (state.account === null || timer !== null || uploadableCount() === 0) return
  timer = window.setTimeout(() => {
    timer = null
    void flush()
  }, UPLOAD_DELAY_MS)
}

// ---------------------------------------------------------------- session

/** Loads the server's rows into this device's copy. A load that a reset overtook is thrown away and repeated. */
async function refreshFromServer(): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const startedAt = resetEpoch
    const raw = await api(`/v1/state?edition=${encodeURIComponent(EDITION)}`)
    if (startedAt !== resetEpoch) continue
    const server = StateSchema.parse(raw)
    let unknown = 0
    const older = { answers: [] as Answer[], exams: [] as ExamResult[] }
    for (const { edition, ...row } of server.older.answers) {
      const steps = migrationPath(edition)
      if (steps === null) unknown += 1
      else {
        const moved = migrateAnswer(row, steps)
        if (moved) older.answers.push(moved)
      }
    }
    for (const { edition, ...row } of server.older.exams) {
      const steps = migrationPath(edition)
      const moved = steps === null ? null : migrateExam(row, steps)
      if (moved) older.exams.push(moved)
    }
    updateProgress((p) =>
      mergeFromServer(applyServerGeneration(p, server.generation, server.resetAt), {
        answers: [...server.answers, ...older.answers],
        exams: [...server.exams, ...older.exams],
      }),
    )
    setState({ otherEditionAnswers: unknown })
    return
  }
  throw new Error('Առաջընթացը չհաջողվեց բեռնել։ Թարմացրու էջը։')
}

async function loadAccount(user: AuthUser): Promise<void> {
  useStorageOf(user.id)
  setState({ account: user, phase: 'saving', message: null })
  await refreshFromServer()
  // After the server's state, so that a reset made elsewhere does not discard what was done here as a guest.
  absorbGuestProgress()
  setState({ phase: 'ready' })
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
  const last = rememberedUser()
  const returning = takeSigningIn() || new URLSearchParams(window.location.search).has('neon_auth_session_verifier')
  // Someone who never signed in stays on this device: no request to the sign-in service at all.
  if (last === null && !returning) {
    setState({ phase: 'guest', account: null, message: null })
    return
  }
  try {
    const user = await currentUser()
    if (user === null) {
      if (last !== null) {
        // The sign-in ran out, which is not the same as signing out: this account's progress stays on screen.
        setState({ phase: 'expired', account: null, message: null })
        return
      }
      useStorageOf(null)
      setState({ phase: 'guest', account: null, message: null })
      return
    }
    await loadAccount(user)
  } catch (err) {
    const remembered = rememberedUser()
    if (err instanceof AuthFailure && err.network && remembered !== null) {
      // Offline on a device that was signed in: keep working on that account's copy, upload when back online.
      setState({ phase: 'offline', account: state.account ?? { id: remembered, email: '', name: '' }, message: null })
      return
    }
    if (state.account === null) setState({ phase: remembered === null ? 'guest' : 'expired' })
    report(err)
  }
}

export async function startGoogleSignIn(): Promise<void> {
  markSigningIn()
  try {
    await signInWithGoogle()
  } catch (err) {
    clearSigningIn()
    throw err
  }
}

/** After an expired sign-in, for someone who does not want to sign in. That account's copy stays for its next sign-in. */
export function continueAsGuest(): void {
  useStorageOf(null)
  setState({ phase: 'guest', account: null, message: null })
}

/** Uploads first. What could not be uploaded, or an exam still running, stays on this device for the next sign-in. */
export async function signOutNow(): Promise<void> {
  const account = state.account
  await flush()
  const left = pendingCount()
  const examRunning = getLoadError() === null && getProgress().activeExam !== null
  if (examRunning && !window.confirm('Ունես չավարտված քննություն։ Այն կշարունակվի, երբ նորից մուտք գործես այս սարքից, եթե ժամանակը դեռ չի լրացել։ Դուրս գա՞լ։')) return
  if (left > 0 && !window.confirm(`${left} պատասխան դեռ չի պահվել սերվերում։ Դրանք կուղարկվեն, երբ նորից մուտք գործես այս սարքից։ Դուրս գա՞լ։`)) return
  await signOut()
  if (account && left === 0 && !examRunning) removeStoredAccount(account.id)
  useStorageOf(null)
  setState({ phase: 'guest', account: null, message: null, otherEditionAnswers: 0 })
}

/** Removes the login and all progress from the server, then this device's copy of them. Cannot be undone. */
export async function deleteAccountNow(): Promise<void> {
  if (state.account === null) throw new Error('Մուտք գործած չես։')
  if (uploading) await uploading
  try {
    await api('/v1/account', { method: 'DELETE' })
  } catch (err) {
    // Already gone: an earlier try went through but its reply was lost.
    if (!(err instanceof ApiError && err.code === 'account_deleted')) throw err
  }
  // The session no longer exists on the server; this only clears the browser's cookie and the SDK's cache.
  await signOut().catch((err: unknown) => console.error('Sign-out after deleting the account failed', err))
  leaveDeletedAccount('Հաշիվդ և ամբողջ առաջընթացդ ջնջվեցին։')
}

/** "Reset": for an account the server starts a new generation, so other devices drop their older rows too. */
export async function resetProgress(): Promise<void> {
  if (state.account === null) {
    replaceProgress(emptyProgress())
    return
  }
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
  resetEpoch += 1
  if (uploading) await uploading
  const { generation } = ResetSchema.parse(await api('/v1/progress', { method: 'DELETE' }))
  resetEpoch += 1
  refused.answers.clear()
  refused.exams.clear()
  replaceProgress({ ...emptyProgress(), generation })
}

/** A copy of everything stored about this account on the server, as a file. */
export async function downloadMyData(): Promise<void> {
  const data = await api('/v1/export')
  downloadText(JSON.stringify(data, null, 1), `armenia-driving-test-my-data-${new Date().toISOString().slice(0, 10)}.json`)
}
