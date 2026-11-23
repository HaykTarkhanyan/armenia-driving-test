// Study progress, kept in this browser's localStorage: one document for a guest and one per signed-in account. It holds
// every answer ever given (practice and exam), finished exams, the exam in progress, and the ids not yet sent to the
// server (sync.ts). Invalid stored data is reported, never silently replaced. `chosen` and exam answers are option
// indices in PDF order, whatever order was on screen.
//
// The document is tied to the edition of the pool, because the site renumbered 181 questions between two editions:
// an old "4-81" is a different question today. A document from another edition is refused, not reinterpreted.
import { useSyncExternalStore } from 'react'
import { z } from 'zod'

const KEY_PREFIX = 'armenia-driving-test.progress.v2'
export const GUEST_KEY = `${KEY_PREFIX}.guest`
export const userKey = (userId: string): string => `${KEY_PREFIX}.user.${userId}`
const LAST_USER_KEY = 'armenia-driving-test.last-user'
export const EDITION: string = __EDITION__

const QuestionId = z.string().regex(/^(old-)?\d+-\d+$/)
const OptionIndex = z.number().int().min(0).max(4)

const AnswerSchema = z.strictObject({
  id: z.uuid(),
  qid: QuestionId,
  chosen: OptionIndex,
  correct: z.boolean(),
  at: z.string(),
  mode: z.enum(['practice', 'exam']),
})
const ActiveExamSchema = z.strictObject({
  id: z.uuid(),
  startedAt: z.number(),
  questionIds: z.array(QuestionId).length(20),
  orders: z.array(z.array(OptionIndex).min(2).max(5)).length(20),
  answers: z.array(OptionIndex.nullable()).length(20),
})
export const ExamResultSchema = z.strictObject({
  ...ActiveExamSchema.shape,
  finishedAt: z.number(),
  score: z.number().int().min(0).max(20),
  passed: z.boolean(),
  timedOut: z.boolean(),
})
export const ProgressSchema = z.strictObject({
  version: z.literal(2),
  edition: z.string(),
  answers: z.array(AnswerSchema),
  exams: z.array(ExamResultSchema),
  activeExam: ActiveExamSchema.nullable(),
  pending: z.strictObject({ answers: z.array(z.uuid()), exams: z.array(z.uuid()) }),
})
export const AnswerRowSchema = AnswerSchema
export type Answer = z.infer<typeof AnswerSchema>
export type ActiveExam = z.infer<typeof ActiveExamSchema>
export type ExamResult = z.infer<typeof ExamResultSchema>
export type Progress = z.infer<typeof ProgressSchema>

export function emptyProgress(): Progress {
  return { version: 2, edition: EDITION, answers: [], exams: [], activeExam: null, pending: { answers: [], exams: [] } }
}

export class ProgressError extends Error {
  readonly raw: string | null
  constructor(message: string, raw: string | null) {
    super(message)
    this.name = 'ProgressError'
    this.raw = raw
  }
}

/** Parses a stored or imported progress document; throws ProgressError with the reasons. */
export function parseProgress(text: string, source: string): Progress {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (err) {
    throw new ProgressError(`${source} վավեր JSON չէ. ${(err as Error).message}`, text)
  }
  const result = ProgressSchema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.slice(0, 5).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    throw new ProgressError(`${source} առաջընթացի ֆայլ չի թվում. ${issues.join('; ')}`, text)
  }
  if (result.data.edition !== EDITION) {
    throw new ProgressError(
      `${source} պահվել է հարցաշարի ${result.data.edition} տարբերակով, իսկ այժմ գործում է ${EDITION} տարբերակը։ Հարցերի համարները կարող էին փոխվել, ուստի այն չի բեռնվել։`,
      text,
    )
  }
  return result.data
}

// ---------------------------------------------------------------- merging (pure, tested)

function unionAnswers(a: readonly Answer[], b: readonly Answer[]): Answer[] {
  const byId = new Map(a.map((x) => [x.id, x]))
  for (const x of b) if (!byId.has(x.id)) byId.set(x.id, x)
  // "Known" depends on the last two answers, so the log must be in time order across devices.
  return [...byId.values()].sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : x.id < y.id ? -1 : 1))
}

function unionExams(a: readonly ExamResult[], b: readonly ExamResult[]): ExamResult[] {
  const byId = new Map(a.map((x) => [x.id, x]))
  for (const x of b) if (!byId.has(x.id)) byId.set(x.id, x)
  return [...byId.values()].sort((x, y) => x.finishedAt - y.finishedAt || (x.id < y.id ? -1 : 1))
}

/** The server's rows joined with this device's. Whatever the server does not have yet is what is left to send. */
export function mergeFromServer(local: Progress, server: Pick<Progress, 'answers' | 'exams'>): Progress {
  const onServer = { answers: new Set(server.answers.map((a) => a.id)), exams: new Set(server.exams.map((e) => e.id)) }
  return {
    ...local,
    answers: unionAnswers(server.answers, local.answers),
    exams: unionExams(server.exams, local.exams),
    pending: {
      answers: local.answers.filter((a) => !onServer.answers.has(a.id)).map((a) => a.id),
      exams: local.exams.filter((e) => !onServer.exams.has(e.id)).map((e) => e.id),
    },
  }
}

/** Adds another local document (a guest's progress, an imported file). Everything new has to be sent. */
export function mergeLocal(target: Progress, other: Progress): Progress {
  const known = { answers: new Set(target.answers.map((a) => a.id)), exams: new Set(target.exams.map((e) => e.id)) }
  return {
    ...target,
    answers: unionAnswers(target.answers, other.answers),
    exams: unionExams(target.exams, other.exams),
    activeExam: target.activeExam ?? other.activeExam,
    pending: {
      answers: [...target.pending.answers, ...other.answers.filter((a) => !known.answers.has(a.id)).map((a) => a.id)],
      exams: [...target.pending.exams, ...other.exams.filter((e) => !known.exams.has(e.id)).map((e) => e.id)],
    },
  }
}

// ---------------------------------------------------------------- store (one per page load)

let storageKey: string | null = null // null until first use: the last signed-in account, or the guest
let current: Progress | null = null
let loadError: ProgressError | null = null
const listeners = new Set<() => void>()
const saveListeners = new Set<() => void>()

function key(): string {
  if (storageKey === null) {
    const last = localStorage.getItem(LAST_USER_KEY)
    storageKey = last === null ? GUEST_KEY : userKey(last)
  }
  return storageKey
}

function readKey(k: string): Progress {
  const raw = localStorage.getItem(k)
  return raw === null ? emptyProgress() : parseProgress(raw, 'Այս բրաուզերի առաջընթացը')
}

function read(): Progress {
  return readKey(key())
}

function ensureLoaded(): void {
  if (current !== null || loadError !== null) return
  try {
    current = read()
  } catch (err) {
    if (err instanceof ProgressError) loadError = err
    else throw err
  }
}

function notify(): void {
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The current progress; throws the load error so the app can show it (see App.tsx). */
export function getProgress(): Progress {
  ensureLoaded()
  if (loadError !== null) throw loadError
  return current as Progress
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress)
}

export function getLoadError(): ProgressError | null {
  ensureLoaded()
  return loadError
}

export function useLoadError(): ProgressError | null {
  return useSyncExternalStore(subscribe, getLoadError)
}

/** Safe with unreadable stored data, unlike useProgress: the app frame uses it before the error page is shown. */
export function useHasActiveExam(): boolean {
  return useSyncExternalStore(subscribe, () => {
    ensureLoaded()
    return current?.activeExam != null
  })
}

/** Called after every local change; sync.ts uses it to schedule an upload. */
export function onSaved(listener: () => void): () => void {
  saveListeners.add(listener)
  return () => saveListeners.delete(listener)
}

/** Applies a change and saves it. A failed save (storage full, blocked) throws. The change is applied to what is
 * stored now, not to this page's copy, so two open tabs do not overwrite each other's answers. */
export function updateProgress(change: (p: Progress) => Progress): void {
  getProgress() // a load error stops here, before anything is written
  const next = change(read())
  localStorage.setItem(key(), JSON.stringify(next))
  current = next
  notify()
  for (const l of saveListeners) l()
}

// Another tab saved: reload, so this tab shows its answers and builds on them.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== null && e.key !== storageKey) return
    current = null
    loadError = null
    notify()
  })
}

/** Replaces everything, e.g. after a reset (also clears a load error). */
export function replaceProgress(next: Progress): void {
  localStorage.setItem(key(), JSON.stringify(next))
  current = next
  loadError = null
  notify()
}

export function recordAnswer(qid: string, chosen: number, correct: boolean, mode: Answer['mode']): void {
  const answer: Answer = { id: crypto.randomUUID(), qid, chosen, correct, at: new Date().toISOString(), mode }
  updateProgress((p) => ({ ...p, answers: [...p.answers, answer], pending: { ...p.pending, answers: [...p.pending.answers, answer.id] } }))
}

export function addFinishedExam(result: ExamResult, logged: readonly Answer[]): void {
  updateProgress((p) => ({
    ...p,
    activeExam: null,
    exams: [...p.exams, result],
    answers: [...p.answers, ...logged],
    pending: { answers: [...p.pending.answers, ...logged.map((a) => a.id)], exams: [...p.pending.exams, result.id] },
  }))
}

// ---------------------------------------------------------------- accounts (used by sync.ts)

export function rememberedUser(): string | null {
  return localStorage.getItem(LAST_USER_KEY)
}

/** Switches the store to this account's document, or to the guest's. */
export function useStorageOf(userId: string | null): void {
  if (userId === null) localStorage.removeItem(LAST_USER_KEY)
  else localStorage.setItem(LAST_USER_KEY, userId)
  storageKey = userId === null ? GUEST_KEY : userKey(userId)
  current = null
  loadError = null
  notify()
}

/** Moves what was done on this device without an account into the signed-in account's document. */
export function absorbGuestProgress(): void {
  if (localStorage.getItem(GUEST_KEY) === null) return
  const guest = readKey(GUEST_KEY) // an unreadable guest document throws and stays where it is
  updateProgress((p) => mergeLocal(p, guest))
  localStorage.removeItem(GUEST_KEY)
}

export function removeStoredAccount(userId: string): void {
  localStorage.removeItem(userKey(userId))
}

export function exportFileName(date: Date = new Date()): string {
  return `armenia-driving-test-progress-${date.toISOString().slice(0, 10)}.json`
}

export function downloadText(text: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
