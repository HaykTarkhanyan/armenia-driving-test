// Everything the stats page shows, computed from the answer log. Days are calendar days in the device's time zone.
import { QUESTION_BY_ID, questionById } from './data.ts'
import { SECTIONS } from './exam.ts'
import type { Answer } from './progress.ts'
import { sectionIds } from './stats.ts'

const pad = (n: number) => String(n).padStart(2, '0')

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Noon, so that adding days never lands on the wrong date across a daylight-saving change. */
function dateOf(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function addDays(key: string, n: number): string {
  const d = dateOf(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

/** The last n days ending today, oldest first. */
export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1))
}

const MONTHS = ['հնվ', 'փտվ', 'մրտ', 'ապր', 'մյս', 'հնս', 'հլս', 'օգս', 'սեպ', 'հոկ', 'նոյ', 'դեկ']
const WEEKDAYS = ['Կիր', 'Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ']

export const monthName = (key: string): string => MONTHS[dateOf(key).getMonth()]
export const weekdayName = (key: string): string => WEEKDAYS[dateOf(key).getDay()]
export const dayNumber = (key: string): number => dateOf(key).getDate()
export const formatDay = (key: string): string => `${dayNumber(key)} ${monthName(key)}`

/** "23 նոյ, 16:33" in the device's time zone: browsers without Armenian locale data would show an American date. */
export function formatDateTime(ms: number): string {
  const d = new Date(ms)
  return `${formatDay(dayKey(d))}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export type DayStat = { total: number; right: number }

export function dailyActivity(answers: readonly Answer[]): Map<string, DayStat> {
  const days = new Map<string, DayStat>()
  for (const a of answers) {
    const key = dayKey(new Date(a.at))
    const day = days.get(key) ?? { total: 0, right: 0 }
    day.total += 1
    if (a.correct) day.right += 1
    days.set(key, day)
  }
  return days
}

/** A streak survives until the end of the next day: not having studied yet today does not break it. */
export function streaks(activeDays: Iterable<string>, today: string): { current: number; best: number; doneToday: boolean } {
  const days = new Set(activeDays)
  const doneToday = days.has(today)
  let current = 0
  for (let d = doneToday ? today : addDays(today, -1); days.has(d); d = addDays(d, -1)) current += 1
  let best = 0
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue // not the first day of a run
    let run = 1
    for (let next = addDays(d, 1); days.has(next); next = addDays(next, 1)) run += 1
    best = Math.max(best, run)
  }
  return { current, best, doneToday }
}

/** The score you would have expected at the end of each day: known questions count as right, the rest as a guess. */
export function scoreTrend(answers: readonly Answer[], days: readonly string[]): { day: string; score: number }[] {
  const sections = sectionIds()
  const sectionOf = new Map(sections.flatMap((ids, s) => ids.map((id) => [id, s] as const)))
  const guess = (id: string) => 1 / questionById(id).options.length
  const sums = sections.map((ids) => ids.reduce((n, id) => n + guess(id), 0))
  const lastRight = new Map<string, boolean>()
  const known = new Set<string>()
  const log = answers.filter((a) => QUESTION_BY_ID.has(a.qid)).map((a) => ({ a, day: dayKey(new Date(a.at)) }))
  let next = 0
  return days.map((day) => {
    for (; next < log.length && log[next].day <= day; next++) {
      const { qid, correct } = log[next].a
      const nowKnown = correct && lastRight.get(qid) === true
      lastRight.set(qid, correct)
      if (nowKnown !== known.has(qid)) {
        const s = sectionOf.get(qid)
        if (s === undefined) throw new Error(`question ${qid} is in no exam section`)
        sums[s] += (nowKnown ? 1 : -1) * (1 - guess(qid))
        if (nowKnown) known.add(qid)
        else known.delete(qid)
      }
    }
    const score = SECTIONS.reduce((n, s, i) => n + (s.draw * sums[i]) / sections[i].length, 0)
    return { day, score }
  })
}

/** Share of right answers on the current pool, or null with no answers. */
export function accuracy(answers: readonly Answer[]): number | null {
  const current = answers.filter((a) => QUESTION_BY_ID.has(a.qid))
  return current.length === 0 ? null : current.filter((a) => a.correct).length / current.length
}

/** Questions missed at least twice, most missed first. */
export function hardest(answers: readonly Answer[], limit: number): { id: string; wrong: number; total: number }[] {
  const counts = new Map<string, { wrong: number; total: number }>()
  for (const a of answers) {
    if (!QUESTION_BY_ID.has(a.qid)) continue
    const c = counts.get(a.qid) ?? { wrong: 0, total: 0 }
    c.total += 1
    if (!a.correct) c.wrong += 1
    counts.set(a.qid, c)
  }
  return [...counts]
    .filter(([, c]) => c.wrong >= 2)
    .map(([id, c]) => ({ id, ...c }))
    .sort((x, y) => y.wrong - x.wrong || y.wrong / y.total - x.wrong / x.total || x.id.localeCompare(y.id))
    .slice(0, limit)
}

/** Whole weeks, Monday first, ending with the current week. Days after today are null. */
export function calendarWeeks(today: string, weeks: number): (string | null)[][] {
  const mondayOffset = (dateOf(today).getDay() + 6) % 7
  const start = addDays(today, -mondayOffset - (weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = addDays(start, w * 7 + d)
      return key <= today ? key : null
    }),
  )
}

/** Colour step of a calendar day, relative to the daily goal: step 3 and up means the goal was reached. */
export function activityLevel(total: number, goal: number): 0 | 1 | 2 | 3 | 4 {
  if (total === 0) return 0
  if (total < goal / 2) return 1
  if (total < goal) return 2
  return total < goal * 2 ? 3 : 4
}
