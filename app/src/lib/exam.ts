// The exam (Decision 385-Ն, points 15-20, _knowledge/exam_rules.md): 20 knowledge questions, 30 minutes, at least 18
// right. Point 17 fixes how many come from each part of the pool. How the 15 traffic-rule questions spread over groups
// 1 and 4-9 is not published, so they are drawn evenly from all of them. The 3 psychological questions are not public.
import { shuffle } from './random.ts'

export const SECTIONS = [
  { key: 'rules', name: 'Երթևեկության կանոններ', title: 'երթևեկության կանոններից', groups: [1, 4, 5, 6, 7, 8, 9], draw: 15 },
  { key: 'law', name: 'Օրենք', title: 'օրենքից', groups: [2], draw: 2 },
  { key: 'faults', name: 'Անսարքություններ', title: 'անսարքություններից', groups: [3], draw: 2 },
  { key: 'firstAid', name: 'Առաջին օգնություն', title: 'առաջին օգնությունից', groups: [10], draw: 1 },
] as const

export const EXAM = { questions: 20, passMark: 18, minutes: 30 } as const

/** A random exam sheet: the official number of questions from each section, in random order. */
export function drawExam(idsBySection: readonly (readonly string[])[], rand: () => number = Math.random): string[] {
  if (idsBySection.length !== SECTIONS.length) throw new Error(`drawExam needs ${SECTIONS.length} sections`)
  const sheet = SECTIONS.flatMap((s, i) => {
    if (idsBySection[i].length < s.draw) throw new Error(`section ${s.key} has only ${idsBySection[i].length} questions`)
    return shuffle(idsBySection[i], rand).slice(0, s.draw)
  })
  return shuffle(sheet, rand)
}

export function scoreExam(answers: readonly (number | null)[], correct: readonly number[]): number {
  if (answers.length !== correct.length) throw new Error('scoreExam: answers and correct indices differ in length')
  return answers.reduce<number>((n, a, i) => n + (a === correct[i] ? 1 : 0), 0)
}

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return r
}

/** Distribution of the number of right answers when `draw` questions are drawn without replacement and question i is
 * answered right with probability ps[i]. Exact: the table sums, over all subsets of c questions, P(s of them right). */
export function sectionDistribution(ps: readonly number[], draw: number): number[] {
  const size = draw + 1
  const table = new Float64Array(size * size)
  table[0] = 1
  for (const p of ps) {
    for (let c = draw; c >= 1; c--) {
      for (let s = c; s >= 0; s--) {
        const wrong = table[(c - 1) * size + s] * (1 - p)
        const right = s > 0 ? table[(c - 1) * size + s - 1] * p : 0
        table[c * size + s] += wrong + right
      }
    }
  }
  const subsets = comb(ps.length, draw)
  return Array.from({ length: size }, (_, s) => table[draw * size + s] / subsets)
}

function convolve(a: readonly number[], b: readonly number[]): number[] {
  const out = new Array<number>(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j]
  return out
}

/** Exact chance of at least EXAM.passMark right, given each question's chance per section (same order as SECTIONS). */
export function passProbability(psBySection: readonly (readonly number[])[]): number {
  const total = SECTIONS.reduce<number[]>((dist, s, i) => convolve(dist, sectionDistribution(psBySection[i], s.draw)), [1])
  return Math.min(1, total.slice(EXAM.passMark).reduce((a, b) => a + b, 0))
}

export function expectedScore(psBySection: readonly (readonly number[])[]): number {
  return SECTIONS.reduce((sum, s, i) => {
    const ps = psBySection[i]
    return sum + (s.draw * ps.reduce((a, b) => a + b, 0)) / ps.length
  }, 0)
}
