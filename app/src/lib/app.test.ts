import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { groupIds, QUESTION_BY_ID, QUESTIONS } from './data.ts'
import { drawExam, EXAM, expectedScore, passProbability, scoreExam, sectionDistribution, SECTIONS } from './exam.ts'
import { correctIndices, finishExam, newExam } from './examFlow.ts'
import { OLD_BY_ID, OLD_QUESTIONS, REMOVED_IDS } from './oldPool.ts'
import { EDITION as CURRENT_EDITION, FINGERPRINT, migrateAnswer, migrateExam, MIGRATIONS, migrationPath, type Migration } from './editions.ts'
import { parseExplanations } from './explanations.ts'
import { displayOrder, isLabelQuestion, latinPictureLabels } from './options.ts'
import { EDITION, emptyProgress, mergeFromServer, mergeLocal, parseProgress, ProgressError, type Answer, type Progress } from './progress.ts'
import { lastWrong, perExam, readiness, sectionIds, statusById, statusOf } from './stats.ts'
import { GENERAL_ITEMS, GUIDES } from '../content/guides.ts'
import { hintFor, hintText, statLabel } from './hints.ts'
import { addDays, calendarWeeks, dailyActivity, hardest, lastDays, scoreTrend, streaks } from './insights.ts'
import { todayMix } from './mix.ts'
import { searchQuestions } from './search.ts'

function seeded(seed = 509): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const answer = (qid: string, correct: boolean, at = '2026-11-23T00:00:00.000Z'): Answer => ({
  id: crypto.randomUUID(),
  qid,
  chosen: 0,
  correct,
  at,
  mode: 'practice',
})

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

describe('shortcut guides', () => {
  it('has a guide for every group, and every cited question exists', () => {
    expect(GUIDES.map((g) => g.group).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    for (const item of [...GENERAL_ITEMS, ...GUIDES.flatMap((g) => g.items)]) {
      for (const id of item.refs ?? []) expect(QUESTION_BY_ID.has(id), `${item.title}: ${id}`).toBe(true)
      for (const [, id] of item.body.matchAll(/\((\d{1,2}-\d{1,3})\)/g)) expect(QUESTION_BY_ID.has(id), `${item.title}: ${id}`).toBe(true)
    }
  })

  it('counts rules from the data, as in the analysis', () => {
    expect(statLabel('design')).toBe('23 / 23')
    expect(statLabel('tram_yes')).toBe('7 / 7')
    expect(statLabel('pedestrians_too')).toBe('10 / 10')
    expect(statLabel('g8_middle')).toBe('7 / 8')
    expect(statLabel('g10_longest')).toBe('31 / 50')
    expect(statLabel('all_both')).toBe('54 / 97')
  })

  it('never crosses out the official answer', () => {
    for (const q of QUESTIONS) {
      const hint = hintFor(q.id)
      if (hint?.rule === 'never') expect(hint.options, q.id).not.toContain(q.answerIndex)
    }
  })

  it('flags an exception instead of claiming the rule works', () => {
    const wrong = QUESTIONS.map((q) => ({ q, hint: hintFor(q.id) })).find((x) => x.hint && !x.hint.works)
    expect(wrong).toBeDefined()
    if (wrong?.hint) expect(hintText(wrong.hint, wrong.q.options)).toContain('բացառություն')
  })

  it('the shares of the 7 traffic-rule groups add up to the 15 questions they share', () => {
    expect([1, 4, 5, 6, 7, 8, 9].reduce((n, g) => n + perExam(g).count, 0)).toBe(15)
    expect(perExam(2)).toEqual({ count: 2, exact: true })
    expect(perExam(10)).toEqual({ count: 1, exact: true })
    expect(perExam(4).exact).toBe(false)
  })
})

describe('editions of the question pool', () => {
  it('data/edition.json describes the questions being deployed', () => {
    const raw = JSON.parse(fs.readFileSync(new URL('../../../data/questions.json', import.meta.url), 'utf8')) as { id: string; question: string; options: string[] }[]
    const canonical = JSON.stringify(raw.map((q) => [q.id, q.question, q.options]))
    const now = createHash('sha256').update(canonical, 'utf8').digest('hex')
    expect(now, 'The questions changed: run scripts/non_essential/diff_editions.py and new_edition.py, or saved progress would point at the wrong questions').toBe(FINGERPRINT)
  })

  it('every earlier edition has a way to the current one', () => {
    for (const m of MIGRATIONS) expect(migrationPath(m.from), m.from).not.toBeNull()
    expect(migrationPath(CURRENT_EDITION)).toEqual([])
    expect(migrationPath('1999-01-01')).toBeNull()
  })

  const steps: Migration[] = [
    { from: 'e1', to: 'e2', ids: { '4-81': '4-83', '7-99': '1-146' }, removed: ['8-3'], reorder: { '2-5': [1, 0, 2] }, unsafe: ['2-9'] },
    { from: 'e2', to: 'e3', ids: { '4-83': '4-85' }, removed: [], reorder: {}, unsafe: [] },
  ]

  it('follows a chain of editions', () => {
    expect(migrationPath('e1', 'e3', steps)).toEqual(steps)
    expect(migrationPath('e3', 'e1', steps)).toBeNull()
  })

  it('translates an answer: new number, new option position, or gone', () => {
    expect(migrateAnswer({ qid: '4-81', chosen: 2 }, steps)).toEqual({ qid: '4-85', chosen: 2 })
    expect(migrateAnswer({ qid: '2-5', chosen: 0 }, steps)).toEqual({ qid: '2-5', chosen: 1 })
    expect(migrateAnswer({ qid: '8-3', chosen: 0 }, steps)).toBeNull()
    expect(migrateAnswer({ qid: '1-1', chosen: 1 }, steps)).toEqual({ qid: '1-1', chosen: 1 })
  })

  it('translates an exam, or drops it when it can no longer be shown', () => {
    const exam = { questionIds: ['4-81', '2-5'], orders: [[0, 1], [0, 1, 2]], answers: [1, 0] as (number | null)[] }
    expect(migrateExam(exam, steps)).toEqual({ questionIds: ['4-85', '2-5'], orders: [[0, 1], [1, 0, 2]], answers: [1, 1] })
    expect(migrateExam({ ...exam, questionIds: ['8-3', '2-5'] }, steps)).toBeNull()
    expect(migrateExam({ ...exam, questionIds: ['2-9', '2-5'] }, steps)).toBeNull()
  })
})

describe('explanations', () => {
  const raw = JSON.parse(fs.readFileSync(new URL('../../../data/explanations.json', import.meta.url), 'utf8')) as { edition: string; explanations: Record<string, unknown> }

  it('belong to this edition and to real questions', () => {
    expect(parseExplanations(raw).size).toBe(Object.keys(raw.explanations).length)
    expect(() => parseExplanations({ ...raw, edition: '1999-01-01' })).toThrow(/edition/)
    expect(() => parseExplanations({ ...raw, explanations: { '99-1': { text: 'x', source: 'rules', ref: 'կետ 1' } } })).toThrow(/unknown question/)
    expect(() => parseExplanations({ ...raw, explanations: { '1-1': { text: 'x', source: 'web', ref: 'CDC' } } })).toThrow()
  })

  it('use Armenian punctuation and never name an option by its position, because options are shuffled', () => {
    for (const [id, e] of parseExplanations(raw)) {
      expect(e.text, id).toMatch(/։$/)
      expect(e.text, id).not.toMatch(/[Ա-և][:;?]|[․–—“”]/)
      expect(e.text, id).not.toMatch(/(առաջին|երկրորդ|երրորդ|չորրորդ|վերջին) տարբերակ/)
    }
  })
})

describe('picture labels', () => {
  it('writes standalone Armenian labels the way the picture shows them', () => {
    expect(latinPictureLabels('Միայն Ա')).toBe('Միայն A')
    expect(latinPictureLabels('Բ և Գ')).toBe('B և C')
    expect(latinPictureLabels('Արգելվում է')).toBe('Արգելվում է')
    expect(QUESTION_BY_ID.get('9-93')?.options).toEqual(['Ցանկացած', 'Միայն A', 'Միայն B'])
  })

  it('old questions that borrow a current picture use its labels', () => {
    const borrowed = OLD_QUESTIONS.filter((q) => q.imageUrl !== null && [...QUESTION_BY_ID.values()].some((c) => c.imageUrl === q.imageUrl && c.options.some((o) => /(^|\s)[ABC]($|\s)/.test(o))))
    expect(borrowed.length).toBeGreaterThan(0)
    for (const q of borrowed) for (const o of q.options) expect(o, q.id).not.toMatch(/(^|\s)[ԱԲԳ]($|\s)/)
  })
})

describe('stats', () => {
  const on = (qid: string, day: string, correct: boolean, hour = 12) => answer(qid, correct, new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).toISOString())

  it('counts a streak that is still alive before today is studied, and the best run', () => {
    expect(streaks(['2026-11-21', '2026-11-22', '2026-11-23'], '2026-11-23')).toEqual({ current: 3, best: 3, doneToday: true })
    expect(streaks(['2026-11-21', '2026-11-22'], '2026-11-23')).toEqual({ current: 2, best: 2, doneToday: false })
    expect(streaks(['2026-11-20', '2026-11-21'], '2026-11-23').current).toBe(0)
    expect(streaks(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-23'], '2026-11-23')).toEqual({ current: 1, best: 4, doneToday: true })
    expect(streaks([], '2026-11-23')).toEqual({ current: 0, best: 0, doneToday: false })
  })

  it('crosses month ends and daylight saving when counting days', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(lastDays('2026-11-02', 3)).toEqual(['2026-10-31', '2026-11-01', '2026-11-02'])
  })

  it('groups answers by local day', () => {
    const days = dailyActivity([on('1-1', '2026-11-22', true), on('1-2', '2026-11-22', false), on('1-3', '2026-11-23', true)])
    expect(days.get('2026-11-22')).toEqual({ total: 2, right: 1 })
    expect(days.get('2026-11-23')).toEqual({ total: 1, right: 1 })
  })

  it('score trend starts at the guess score, and rises only when a question becomes known', () => {
    const guess = readiness(statusById([], QUESTIONS.map((q) => q.id))).expected
    const log = [on('3-1', '2026-11-21', true), on('3-1', '2026-11-22', true), on('3-1', '2026-11-23', false)]
    const [d0, d1, d2, d3] = scoreTrend(log, ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'])
    expect(d0.score).toBeCloseTo(guess, 9)
    expect(d1.score).toBeCloseTo(guess, 9) // one right answer is not yet "known"
    expect(d2.score).toBeGreaterThan(guess)
    expect(d3.score).toBeCloseTo(guess, 9) // a wrong answer takes it back
    const statuses = statusById(log.slice(0, 2), QUESTIONS.map((q) => q.id))
    expect(d2.score).toBeCloseTo(readiness(statuses).expected, 9)
  })

  it('lists only questions missed at least twice, most missed first', () => {
    const log = [on('1-1', '2026-11-20', false), on('1-1', '2026-11-21', false), on('1-2', '2026-11-20', false), on('2-1', '2026-11-20', false), on('2-1', '2026-11-21', false), on('2-1', '2026-11-22', false)]
    expect(hardest(log, 5).map((h) => h.id)).toEqual(['2-1', '1-1'])
  })

  it('builds whole Monday-first weeks with no future days', () => {
    const weeks = calendarWeeks('2026-11-25', 2) // a Wednesday
    expect(weeks[0][0]).toBe('2026-11-16')
    expect(weeks[1][2]).toBe('2026-11-25')
    expect(weeks[1][3]).toBeNull()
  })
})

describe("today's practice", () => {
  it('gives the requested number of different questions', () => {
    const mix = todayMix([], 20, new Date('2026-11-23T12:00:00'), seeded())
    expect(mix).toHaveLength(20)
    expect(new Set(mix).size).toBe(20)
    expect(mix.every((id) => id.startsWith('3-'))).toBe(true) // new learners start with the highest-value group
  })

  it('puts mistakes in, and does not fill a round with what was just answered right', () => {
    const now = new Date('2026-11-23T12:00:00')
    const log = [answer('5-1', false, '2026-11-22T10:00:00.000Z'), answer('3-1', true, new Date('2026-11-23T11:00:00').toISOString())]
    const mix = todayMix(log, 10, now, seeded())
    expect(mix).toContain('5-1')
    expect(mix).not.toContain('3-1')
  })
})

describe('question search', () => {
  it('finds by number and by words, treating և and եւ as one', () => {
    expect(searchQuestions('4-85').hits.map((q) => q.id)).toEqual(['4-85'])
    expect(searchQuestions('Կառուցվածքով').total).toBeGreaterThan(5)
    expect(searchQuestions('երթևեկության').total).toBe(searchQuestions('երթեւեկության').total)
    expect(searchQuestions('ա').hits).toEqual([])
  })
})

describe('merging devices', () => {
  const doc = (answers: Answer[], pending: string[] = []): Progress => ({ ...emptyProgress(), answers, pending: { answers: pending, exams: [] } })

  it('joins the server and the device in time order and sends only what the server lacks', () => {
    const onBoth = answer('1-1', true, '2026-11-23T10:00:00.000Z')
    const serverOnly = answer('1-1', true, '2026-11-23T12:00:00.000Z')
    const localOnly = answer('1-1', false, '2026-11-23T11:00:00.000Z')
    const merged = mergeFromServer(doc([onBoth, localOnly], [localOnly.id]), { answers: [onBoth, serverOnly], exams: [] })
    expect(merged.answers.map((a) => a.id)).toEqual([onBoth.id, localOnly.id, serverOnly.id])
    expect(merged.pending.answers).toEqual([localOnly.id])
    expect(statusOf(merged.answers)).toBe('learning') // wrong at 11:00, right at 12:00: the last two are not both right
  })

  it('is idempotent: merging the same server rows twice changes nothing', () => {
    const a = answer('2-1', true)
    const once = mergeFromServer(doc([a]), { answers: [a], exams: [] })
    expect(mergeFromServer(once, { answers: [a], exams: [] })).toEqual(once)
    expect(once.pending.answers).toEqual([])
  })

  it("moves a guest's answers into an account and marks them for upload", () => {
    const mine = answer('3-1', true, '2026-11-23T09:00:00.000Z')
    const guest = answer('3-2', false, '2026-11-23T08:00:00.000Z')
    const merged = mergeLocal(doc([mine]), doc([guest], [guest.id]))
    expect(merged.answers.map((a) => a.id)).toEqual([guest.id, mine.id])
    expect(merged.pending.answers).toEqual([guest.id])
  })

  it('gives every logged exam answer its own id', () => {
    const exam = newExam(0, seeded())
    const { logged } = finishExam({ ...exam, answers: correctIndices(exam.questionIds) }, 60_000, false)
    expect(new Set(logged.map((a) => a.id)).size).toBe(20)
  })
})
