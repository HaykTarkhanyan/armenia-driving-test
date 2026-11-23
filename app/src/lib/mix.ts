// "Today's practice": one tap, no decisions. Mistakes first, then questions half learned, then new ones in the order
// that pays most on the exam, and old ones for review when nothing else is left.
import { groupIds, QUESTIONS } from './data.ts'
import { dayKey } from './insights.ts'
import type { Answer } from './progress.ts'
import { shuffle } from './random.ts'
import { lastWrong, statusById } from './stats.ts'

// Highest chance of being on the test first: a group 3 question 3.4%, group 2 2.4%, group 10 2.0%, the rest about 1.7%.
export const STUDY_ORDER = [3, 2, 10, 1, 4, 5, 6, 7, 8, 9]

const ALL_IDS = QUESTIONS.map((q) => q.id)

export function todayMix(answers: readonly Answer[], size: number, now: Date = new Date(), rand: () => number = Math.random): string[] {
  const today = dayKey(now)
  const statuses = statusById(answers, ALL_IDS)
  const lastAt = new Map<string, string>()
  for (const a of answers) lastAt.set(a.qid, a.at)
  const seenToday = (id: string) => {
    const at = lastAt.get(id)
    return at !== undefined && dayKey(new Date(at)) === today
  }
  const oldestFirst = (ids: string[]) => [...ids].sort((a, b) => (lastAt.get(a) ?? '').localeCompare(lastAt.get(b) ?? ''))

  const mistakes = oldestFirst(lastWrong(answers, ALL_IDS))
  const wrong = new Set(mistakes)
  const learning = oldestFirst(ALL_IDS.filter((id) => statuses.get(id) === 'learning' && !wrong.has(id) && !seenToday(id)))
  const fresh = STUDY_ORDER.flatMap((g) => groupIds(g)).filter((id) => statuses.get(id) === 'new')
  const review = oldestFirst(ALL_IDS.filter((id) => statuses.get(id) === 'known' && !seenToday(id)))

  const picked = new Set<string>()
  const take = (ids: readonly string[], limit: number) => {
    for (const id of ids) {
      if (picked.size >= limit) return
      picked.add(id)
    }
  }
  take(mistakes, Math.ceil(size * 0.4))
  take(learning, picked.size + Math.ceil(size * 0.3))
  take(fresh, size)
  take(mistakes, size)
  take(learning, size)
  take(review, size)
  take(ALL_IDS, size) // everything was seen today: keep going
  return shuffle([...picked], rand)
}
