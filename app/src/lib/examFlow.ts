// Starting and finishing a mock exam. finishExam is pure (tested); the page applies its result.
import { questionById } from './data.ts'
import { drawExam, EXAM, scoreExam } from './exam.ts'
import { displayOrder } from './options.ts'
import type { ActiveExam, Answer, ExamResult } from './progress.ts'
import { sectionIds } from './stats.ts'

/** The option order is drawn once and stored, so it stays the same after a reload and in the review. */
export function newExam(now: number = Date.now(), rand: () => number = Math.random): ActiveExam {
  const questionIds = drawExam(sectionIds(), rand)
  return {
    id: crypto.randomUUID(),
    startedAt: now,
    questionIds,
    orders: questionIds.map((id) => {
      const q = questionById(id)
      return displayOrder(q.options.length, q.fixedOrder, rand)
    }),
    answers: Array.from({ length: EXAM.questions }, () => null),
  }
}

export function correctIndices(questionIds: readonly string[]): number[] {
  return questionIds.map((id) => questionById(id).answerIndex)
}

/** The finished exam, plus one answer-log entry per answered question (unanswered ones are not logged). An exam whose
 * time ran out while the page was closed is finished when it is next seen, so the end is capped at the deadline. */
export function finishExam(exam: ActiveExam, now: number, timedOut: boolean): { result: ExamResult; logged: Answer[] } {
  const correct = correctIndices(exam.questionIds)
  const score = scoreExam(exam.answers, correct)
  // Never before the start: the phone's clock can be corrected backward during an exam.
  const end = Math.max(exam.startedAt, Math.min(now, exam.startedAt + EXAM.minutes * 60_000))
  const at = new Date(end).toISOString()
  const logged: Answer[] = []
  exam.questionIds.forEach((qid, i) => {
    const chosen = exam.answers[i]
    if (chosen !== null) logged.push({ id: crypto.randomUUID(), qid, chosen, correct: chosen === correct[i], at, mode: 'exam' })
  })
  return { result: { ...exam, finishedAt: end, score, passed: score >= EXAM.passMark, timedOut }, logged }
}

export function remainingMs(exam: ActiveExam, now: number): number {
  return exam.startedAt + EXAM.minutes * 60_000 - now
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
