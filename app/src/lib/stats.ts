// What the answers say about each question. A question is "known" when the last two answers to it were right: one
// right answer can be a lucky guess or a just-seen answer. The pass chance counts known questions as sure and every
// other question as a blind guess among its own options (1 in 2 to 1 in 5).
import { groupIds, questionById } from './data.ts'
import { expectedScore, passProbability, SECTIONS } from './exam.ts'
import type { Answer } from './progress.ts'

export type Status = 'new' | 'learning' | 'known'

export function statusOf(history: readonly Answer[]): Status {
  if (history.length === 0) return 'new'
  const lastTwo = history.slice(-2)
  return lastTwo.length === 2 && lastTwo.every((a) => a.correct) ? 'known' : 'learning'
}

/** Status of the given question ids, from the answer log (kept in the order the answers were given). */
export function statusById(answers: readonly Answer[], ids: readonly string[]): Map<string, Status> {
  const byQuestion = new Map<string, Answer[]>()
  for (const a of answers) {
    const list = byQuestion.get(a.qid)
    if (list) list.push(a)
    else byQuestion.set(a.qid, [a])
  }
  return new Map(ids.map((id) => [id, statusOf(byQuestion.get(id) ?? [])]))
}

/** Questions of the given set whose last answer was wrong, in the order of `ids`: the "my mistakes" round. */
export function lastWrong(answers: readonly Answer[], ids: readonly string[]): string[] {
  const last = new Map<string, boolean>()
  for (const a of answers) last.set(a.qid, a.correct)
  return ids.filter((id) => last.get(id) === false)
}

export type Counts = Record<Status, number>

export function countStatuses(ids: readonly string[], statuses: ReadonlyMap<string, Status>): Counts {
  const counts: Counts = { new: 0, learning: 0, known: 0 }
  for (const id of ids) {
    const s = statuses.get(id)
    if (s === undefined) throw new Error(`no status for question ${id}`)
    counts[s] += 1
  }
  return counts
}

export function sectionIds(): string[][] {
  return SECTIONS.map((s) => s.groups.flatMap((g) => groupIds(g)))
}

export function readiness(statuses: ReadonlyMap<string, Status>): { pass: number; expected: number; known: number } {
  const ps = sectionIds().map((ids) => ids.map((id) => (statuses.get(id) === 'known' ? 1 : 1 / questionById(id).options.length)))
  return {
    pass: passProbability(ps),
    expected: expectedScore(ps),
    known: [...statuses.values()].filter((s) => s === 'known').length,
  }
}
