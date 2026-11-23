import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { groupIds, QUESTION_BY_ID, QUESTIONS } from './data.ts'
import { drawExam, EXAM, expectedScore, passProbability, scoreExam, sectionDistribution, SECTIONS } from './exam.ts'
import { correctIndices, finishExam, newExam } from './examFlow.ts'
import { OLD_BY_ID, OLD_QUESTIONS, REMOVED_IDS } from './oldPool.ts'
import { displayOrder, isLabelQuestion } from './options.ts'
import { EDITION, emptyProgress, parseProgress, ProgressError, type Answer } from './progress.ts'
import { lastWrong, readiness, sectionIds, statusById, statusOf } from './stats.ts'

function seeded(seed = 509): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const answer = (qid: string, correct: boolean): Answer => ({ qid, chosen: 0, correct, at: '2026-11-23T00:00:00.000Z', mode: 'practice' })

describe('data', () => {
  it('has the current pool with valid answers', () => {
    expect(QUESTIONS).toHaveLength(1050)
    expect(QUESTIONS.every((q) => q.answerIndex < q.options.length)).toBe(true)
    expect(groupIds(4)).toHaveLength(181)
    expect(groupIds(8)).toHaveLength(53)
  })

  it('carries the November key for 6-84 and a note on the known key errors', () => {
    const q = QUESTION_BY_ID.get('6-84')
    expect(q?.options[q.answerIndex]).toContain('թույլատրվում է, եթե')
    for (const id of ['7-6', '7-43', '3-42', '6-84']) expect(QUESTION_BY_ID.get(id)?.note).toBeTruthy()
  })

  it('every picture question has a picture URL', () => {
    expect(QUESTIONS.filter((q) => q.imageUrl !== null)).toHaveLength(715)
  })

  it('loads the old pool with pictures resolved', () => {
    expect(OLD_QUESTIONS).toHaveLength(1094)
    expect(REMOVED_IDS).toHaveLength(118)
    expect(OLD_QUESTIONS.filter((q) => q.imageUrl !== null)).toHaveLength(725)
    expect(OLD_BY_ID.get('old-1-1')?.imageUrl).toBe(QUESTION_BY_ID.get('1-1')?.imageUrl)
  })
})

describe('option order', () => {
  it('keeps only pure picture labels in order', () => {
    expect(isLabelQuestion(['1', '2', '3'])).toBe(true)
    expect(isLabelQuestion(['1.', '2.'])).toBe(true)
    expect(isLabelQuestion(['A', 'B'])).toBe(true)
    expect(isLabelQuestion(['Միայն A', 'Միայն B'])).toBe(false)
    expect(isLabelQuestion(['Այո', 'Ոչ'])).toBe(false)
    expect(QUESTIONS.filter((q) => q.fixedOrder)).toHaveLength(33)
  })

  it('gives a permutation, and the identity for fixed questions', () => {
    const order = displayOrder(5, false, seeded())
    expect([...order].sort()).toEqual([0, 1, 2, 3, 4])
    expect(displayOrder(4, true, seeded())).toEqual([0, 1, 2, 3])
  })
})

describe('exam', () => {
  it('draws the official number of questions from each section', () => {
    const sections = sectionIds()
    const sheet = drawExam(sections, seeded())
    expect(sheet).toHaveLength(EXAM.questions)
    expect(new Set(sheet).size).toBe(EXAM.questions)
    SECTIONS.forEach((s, i) => expect(sheet.filter((id) => sections[i].includes(id))).toHaveLength(s.draw))
  })

  it('stores a valid option order for every question', () => {
    const exam = newExam(0, seeded())
    exam.questionIds.forEach((id, i) => {
      const n = QUESTION_BY_ID.get(id)?.options.length
      expect([...exam.orders[i]].sort()).toEqual(Array.from({ length: n ?? 0 }, (_, k) => k))
    })
  })

  it('scores in PDF order, whatever the order on screen', () => {
    const exam = newExam(0, seeded())
    const correct = correctIndices(exam.questionIds)
    const allRight = { ...exam, answers: correct }
    expect(finishExam(allRight, 60_000, false).result.score).toBe(20)
    const twoWrong = { ...exam, answers: correct.map((c, i) => (i < 2 ? (c + 1) % exam.orders[i].length : c)) }
    const { result, logged } = finishExam(twoWrong, 60_000, false)
    expect(result.score).toBe(18)
    expect(result.passed).toBe(true)
    expect(logged.filter((a) => !a.correct)).toHaveLength(2)
    const threeWrong = { ...exam, answers: correct.map((c, i) => (i < 3 ? (c + 1) % exam.orders[i].length : c)) }
    expect(finishExam(threeWrong, 60_000, false).result.passed).toBe(false)
  })

  it('caps a timed-out exam at the deadline', () => {
    const exam = newExam(0, seeded())
    expect(finishExam(exam, 10 * 3_600_000, true).result.finishedAt).toBe(30 * 60_000)
  })

  it('scoreExam counts unanswered as wrong', () => {
    expect(scoreExam([1, null, 2], [1, 0, 0])).toBe(1)
  })

  it('sectionDistribution matches brute force', () => {
    const ps = [1, 0.5, 0.25, 1 / 3, 0.2]
    const draw = 2
    const brute = [0, 0, 0]
    let pairs = 0
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        pairs++
        brute[0] += (1 - ps[i]) * (1 - ps[j])
        brute[1] += ps[i] * (1 - ps[j]) + (1 - ps[i]) * ps[j]
        brute[2] += ps[i] * ps[j]
      }
    }
    sectionDistribution(ps, draw).forEach((p, s) => expect(p).toBeCloseTo(brute[s] / pairs, 12))
  })

  it('reproduces the Python model for someone who knows nothing', () => {
    const results = JSON.parse(fs.readFileSync(new URL('../../../results/patterns.json', import.meta.url), 'utf8')) as {
      strategies: { guess: { p_pass_nothing_memorized: number; expected_score_nothing_memorized: number } }
    }
    const r = readiness(statusById([], QUESTIONS.map((q) => q.id)))
    const want = results.strategies.guess
    expect(r.pass / want.p_pass_nothing_memorized).toBeCloseTo(1, 6)
    expect(r.expected).toBeCloseTo(want.expected_score_nothing_memorized, 1)
  })

  it('passes for sure when everything is known', () => {
    const ps = sectionIds().map((ids) => ids.map(() => 1))
    expect(passProbability(ps)).toBeCloseTo(1, 9)
    expect(expectedScore(ps)).toBeCloseTo(20, 9)
  })
})

describe('progress and status', () => {
  it('needs two right answers in a row to count as known', () => {
    expect(statusOf([])).toBe('new')
    expect(statusOf([answer('1-1', true)])).toBe('learning')
    expect(statusOf([answer('1-1', true), answer('1-1', true)])).toBe('known')
    expect(statusOf([answer('1-1', true), answer('1-1', true), answer('1-1', false)])).toBe('learning')
  })

  it('lists a mistake until it is answered right, and ignores old-pool answers', () => {
    const ids = ['1-1', '1-2']
    expect(lastWrong([answer('1-1', false), answer('old-1-2', false)], ids)).toEqual(['1-1'])
    expect(lastWrong([answer('1-1', false), answer('1-1', true)], ids)).toEqual([])
  })

  it('round-trips a document of this edition', () => {
    expect(parseProgress(JSON.stringify(emptyProgress()), 'test').edition).toBe(EDITION)
  })

  it('refuses a document from another edition', () => {
    const other = JSON.stringify({ ...emptyProgress(), edition: '2026-10-02' })
    expect(() => parseProgress(other, 'test')).toThrow(ProgressError)
  })
})
