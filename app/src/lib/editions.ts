// Editions of the question pool. The police site regenerates its PDFs often, usually with the same questions, so an
// edition changes only when the questions do (data/edition.json holds a fingerprint of them, and a test fails the deploy
// if it is out of date). Saved answers keep working across editions: `migrations` translates their question numbers.
import { z } from 'zod'
import editionJson from '../../../data/edition.json' with { type: 'json' }

const MigrationSchema = z.strictObject({
  from: z.string(),
  to: z.string(),
  /** Old question id -> new id, for questions whose number changed. */
  ids: z.record(z.string(), z.string()),
  /** Old ids of questions that left the pool. */
  removed: z.array(z.string()),
  /** New id -> for each old option index, its new index. */
  reorder: z.record(z.string(), z.array(z.number().int().min(0).max(4))),
  /** New ids whose options changed, so a stored exam can no longer be shown with them. */
  unsafe: z.array(z.string()),
})
export type Migration = z.infer<typeof MigrationSchema>

const file = z.strictObject({ edition: z.string(), fingerprint: z.string().length(64), migrations: z.array(MigrationSchema) }).parse(editionJson)

export const EDITION: string = file.edition
export const FINGERPRINT: string = file.fingerprint
export const MIGRATIONS: Migration[] = file.migrations

/** The steps from an older edition to the current one, or null if there is no way to get there. */
export function migrationPath(from: string, to: string = EDITION, migrations: readonly Migration[] = MIGRATIONS): Migration[] | null {
  const steps: Migration[] = []
  for (let at = from; at !== to; ) {
    const step = migrations.find((m) => m.from === at)
    if (!step || steps.includes(step)) return null
    steps.push(step)
    at = step.to
  }
  return steps
}

/** The answer in the current edition's numbering, or null if its question left the pool. */
export function migrateAnswer<T extends { qid: string; chosen: number }>(answer: T, steps: readonly Migration[]): T | null {
  let { qid, chosen } = answer
  for (const step of steps) {
    if (step.removed.includes(qid)) return null
    qid = step.ids[qid] ?? qid
    chosen = step.reorder[qid]?.[chosen] ?? chosen
  }
  return { ...answer, qid, chosen }
}

/** The exam in the current numbering, or null if it cannot be shown any more (a question left or its options changed). */
export function migrateExam<T extends { questionIds: string[]; orders: number[][]; answers: (number | null)[] }>(exam: T, steps: readonly Migration[]): T | null {
  let { questionIds, orders, answers } = exam
  for (const step of steps) {
    if (questionIds.some((id) => step.removed.includes(id))) return null
    const next = questionIds.map((id) => step.ids[id] ?? id)
    if (next.some((id) => step.unsafe.includes(id))) return null
    orders = orders.map((order, i) => order.map((o) => step.reorder[next[i]]?.[o] ?? o))
    answers = answers.map((a, i) => (a === null ? null : (step.reorder[next[i]]?.[a] ?? a)))
    questionIds = next
  }
  return { ...exam, questionIds, orders, answers }
}
