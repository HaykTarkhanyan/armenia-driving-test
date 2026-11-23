// The previous question pool (2022 files, scripts/build_old_pool.py), a separate practice set. Imported only by the
// lazily loaded old-questions page, so it does not weigh on the first load. Its answers never count toward readiness.
import { z } from 'zod'
import oldJson from '../../../data/old_pool/questions.json' with { type: 'json' }
import { parse, QUESTION_BY_ID, type Question } from './data.ts'
import { GROUP_NUMBERS } from './groups.ts'
import { isLabelQuestion, latinPictureLabels } from './options.ts'

const RawOldSchema = z.strictObject({
  id: z.string().regex(/^old-\d+-\d+$/),
  group: z.number().int().min(1).max(10),
  number: z.number().int().min(1),
  question: z.string(), // empty on the two cards whose question is only inside the picture
  options: z.array(z.string().min(1)).min(2).max(5),
  answer_index: z.number().int().min(0).max(4),
  has_image: z.boolean(),
  image: z.string().nullable(),
  new_id: z.string().nullable(),
  changes: z.array(z.string()),
  pdf_page: z.number().int().min(1),
})

const OLD_IMAGES = import.meta.glob('../../../data/old_pool/images/*.jpeg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const raw = parse(z.array(RawOldSchema), oldJson as unknown, 'data/old_pool/questions.json')

/** An old question shows its own picture, or the current one when the picture did not change. */
function pictureOf(q: z.infer<typeof RawOldSchema>): string | null {
  if (q.image !== null) {
    const url = OLD_IMAGES[`../../../data/${q.image}`]
    if (url === undefined) throw new Error(`picture ${q.image} is not bundled`)
    return url
  }
  if (!q.has_image) return null
  const current = q.new_id === null ? undefined : QUESTION_BY_ID.get(q.new_id)
  if (!current?.imageUrl) throw new Error(`old question ${q.id} has a picture but neither its own nor a current one`)
  return current.imageUrl
}

/** The old texts label pictures Ա, Բ, Գ. A picture borrowed from the current pool shows A, B, C. */
function borrowsLatinPicture(q: z.infer<typeof RawOldSchema>): boolean {
  if (q.image !== null || !q.has_image || q.new_id === null) return false
  const current = QUESTION_BY_ID.get(q.new_id)
  return current !== undefined && /(?<![\p{L}\p{N}])[ABCD](?![\p{L}\p{N}])/u.test(`${current.question} ${current.options.join(' ')}`)
}

export const OLD_QUESTIONS: Question[] = raw.map((q) => {
  if (q.answer_index >= q.options.length) throw new Error(`old question ${q.id}: answer is outside its options`)
  if (q.question === '' && !q.has_image) throw new Error(`old question ${q.id} has neither text nor a picture`)
  const label = borrowsLatinPicture(q) ? latinPictureLabels : (text: string) => text
  return {
    id: q.id,
    group: q.group,
    number: q.number,
    question: q.question === '' ? 'Հարցը նկարում է։' : label(q.question),
    options: q.options.map(label),
    answerIndex: q.answer_index,
    imageUrl: pictureOf(q),
    fixedOrder: isLabelQuestion(q.options),
    note: null,
  }
})

export const OLD_BY_ID = new Map(OLD_QUESTIONS.map((q) => [q.id, q]))
if (OLD_BY_ID.size !== OLD_QUESTIONS.length) throw new Error('data/old_pool/questions.json has duplicate ids')

export const OLD_IDS_BY_GROUP = new Map<number, string[]>(GROUP_NUMBERS.map((g) => [g, OLD_QUESTIONS.filter((q) => q.group === g).map((q) => q.id)]))

/** Old questions with no counterpart in the current pool. */
export const REMOVED_IDS = raw.filter((q) => q.new_id === null).map((q) => q.id)

// A stale new_id would show the wrong picture.
for (const q of raw) {
  if (q.new_id !== null && !QUESTION_BY_ID.has(q.new_id)) throw new Error(`old question ${q.id} points at unknown question ${q.new_id}`)
}
