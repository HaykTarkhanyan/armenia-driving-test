// Study progress, kept in this browser's localStorage. One JSON document: every answer ever given (practice and exam),
// finished exams, and the exam in progress. Export/import moves it between devices. Invalid stored data is reported,
// never silently replaced. `chosen` and exam answers are option indices in PDF order, whatever order was on screen.
//
// The document is tied to the edition of the pool, because the site renumbered 181 questions between two editions:
// an old "4-81" is a different question today. A document from another edition is refused, not reinterpreted.
import { useSyncExternalStore } from 'react'
import { z } from 'zod'

export const STORAGE_KEY = 'armenia-driving-test.progress.v1'
export const EDITION: string = __EDITION__

const QuestionId = z.string().regex(/^(old-)?\d+-\d+$/)
const OptionIndex = z.number().int().min(0).max(4)

const AnswerSchema = z.strictObject({
  qid: QuestionId,
  chosen: OptionIndex,
  correct: z.boolean(),
  at: z.string(),
  mode: z.enum(['practice', 'exam']),
})
const ActiveExamSchema = z.strictObject({
  id: z.string(),
  startedAt: z.number(),
  questionIds: z.array(QuestionId).length(20),
  orders: z.array(z.array(OptionIndex).min(2).max(5)).length(20),
  answers: z.array(OptionIndex.nullable()).length(20),
})
const ExamResultSchema = z.strictObject({
  ...ActiveExamSchema.shape,
  finishedAt: z.number(),
  score: z.number().int().min(0).max(20),
  passed: z.boolean(),
  timedOut: z.boolean(),
})
export const ProgressSchema = z.strictObject({
  version: z.literal(1),
  edition: z.string(),
  answers: z.array(AnswerSchema),
  exams: z.array(ExamResultSchema),
  activeExam: ActiveExamSchema.nullable(),
})
export type Answer = z.infer<typeof AnswerSchema>
export type ActiveExam = z.infer<typeof ActiveExamSchema>
export type ExamResult = z.infer<typeof ExamResultSchema>
export type Progress = z.infer<typeof ProgressSchema>

export function emptyProgress(): Progress {
  return { version: 1, edition: EDITION, answers: [], exams: [], activeExam: null }
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

function read(): Progress {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw === null ? emptyProgress() : parseProgress(raw, 'Այս բրաուզերի առաջընթացը')
}

// ---------------------------------------------------------------- store (one per page load)

let current: Progress | null = null
let loadError: ProgressError | null = null
const listeners = new Set<() => void>()

function ensureLoaded(): void {
  if (current !== null || loadError !== null) return
  try {
    current = read()
  } catch (err) {
    if (err instanceof ProgressError) loadError = err
    else throw err
  }
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

/** Applies a change and saves it. A failed save (storage full, blocked) throws. The change is applied to what is
 * stored now, not to this page's copy, so two open tabs do not overwrite each other's answers. */
export function updateProgress(change: (p: Progress) => Progress): void {
  getProgress() // a load error stops here, before anything is written
  const next = change(read())
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  current = next
  for (const l of listeners) l()
}

// Another tab saved: reload, so this tab shows its answers and builds on them.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return
    current = null
    loadError = null
    for (const l of listeners) l()
  })
}

/** Replaces everything, e.g. after an import or a reset (also clears a load error). */
export function replaceProgress(next: Progress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  current = next
  loadError = null
  for (const l of listeners) l()
}

export function recordAnswer(qid: string, chosen: number, correct: boolean, mode: Answer['mode']): void {
  updateProgress((p) => ({ ...p, answers: [...p.answers, { qid, chosen, correct, at: new Date().toISOString(), mode }] }))
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
