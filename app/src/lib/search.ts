// Find a question by its number ("4-85") or by words. The official text mixes "և" and "եւ", so both are treated as one.
import { QUESTION_BY_ID, QUESTIONS, type Question } from './data.ts'

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replaceAll('և', 'եւ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const INDEX = QUESTIONS.map((q) => ({ q, text: normalize(`${q.question} ${q.options.join(' ')}`) }))

export function searchQuestions(query: string, limit = 12): { hits: Question[]; total: number } {
  const trimmed = query.trim()
  const byNumber = QUESTION_BY_ID.get(trimmed)
  if (byNumber) return { hits: [byNumber], total: 1 }
  const words = normalize(trimmed).split(' ').filter(Boolean)
  if (words.length === 0 || (words.length === 1 && words[0].length < 3)) return { hits: [], total: 0 }
  const found = INDEX.filter((x) => words.every((w) => x.text.includes(w))).map((x) => x.q)
  return { hits: found.slice(0, limit), total: found.length }
}
