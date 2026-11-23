// What the app may upload. Mirrors AnswerSchema and ExamResultSchema in app/src/lib/progress.ts, with strict objects:
// a new field in the app is a loud 400 until it is added here too.
import { z } from 'zod'
import { SYNC_LIMITS } from './config.ts'

export const Edition = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const QuestionId = z.string().regex(/^(old-)?\d{1,2}-\d{1,3}$/)
const OptionIndex = z.number().int().min(0).max(4)

export const AnswerRow = z.strictObject({
  id: z.uuid(),
  qid: QuestionId,
  chosen: OptionIndex,
  correct: z.boolean(),
  at: z.iso.datetime(),
  mode: z.enum(['practice', 'exam']),
})

export const ExamRow = z
  .strictObject({
    id: z.uuid(),
    startedAt: z.number().int().min(0),
    finishedAt: z.number().int().min(0),
    questionIds: z.array(QuestionId).length(20),
    orders: z.array(z.array(OptionIndex).min(2).max(5)).length(20),
    answers: z.array(OptionIndex.nullable()).length(20),
    score: z.number().int().min(0).max(20),
    passed: z.boolean(),
    timedOut: z.boolean(),
  })
  .refine((e) => e.finishedAt >= e.startedAt, { message: 'finishedAt is before startedAt' })

export const SyncBody = z.strictObject({
  edition: Edition,
  answers: z.array(AnswerRow).max(SYNC_LIMITS.answers),
  exams: z.array(ExamRow).max(SYNC_LIMITS.exams),
})

export type AnswerRow = z.infer<typeof AnswerRow>
export type ExamRow = z.infer<typeof ExamRow>
export type SyncBody = z.infer<typeof SyncBody>
