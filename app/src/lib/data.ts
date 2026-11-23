// The current question pool, read from ../data (scripts/build_dataset.py) and validated at startup. Any inconsistency
// throws. The old pool is in oldPool.ts, loaded only when its pages are opened.
import { z } from 'zod'
import questionsJson from '../../../data/questions.json' with { type: 'json' }
import { GROUP_NUMBERS } from './groups.ts'
import { KEY_NOTES } from './notes.ts'
import { isLabelQuestion, latinPictureLabels } from './options.ts'

const RawQuestionSchema = z.strictObject({
  id: z.string().regex(/^\d+-\d+$/),
  group: z.number().int().min(1).max(10),
  number: z.number().int().min(1),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5),
  answer_index: z.number().int().min(0).max(4),
  image: z.string().nullable(),
  pdf_page: z.number().int().min(1),
})

/** One question as the pages use it, for both pools. `answerIndex` and all stored answers are in PDF order. */
export type Question = {
  id: string
  group: number
  number: number
  question: string
  options: string[]
  answerIndex: number
  imageUrl: string | null
  fixedOrder: boolean
  note: string | null
}

export function parse<T>(schema: z.ZodType<T>, data: unknown, file: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    throw new Error(`${file} is invalid: ${issues.slice(0, 5).join('; ')}`)
  }
  return result.data
}

// Pictures are bundled by Vite (hashed URLs in the build).
const IMAGE_URLS = import.meta.glob('../../../data/images/*.jpeg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export function currentImageUrl(path: string): string {
  const url = IMAGE_URLS[`../../../data/${path}`]
  if (url === undefined) throw new Error(`picture ${path} is not bundled`)
  return url
}

const raw = parse(z.array(RawQuestionSchema), questionsJson as unknown, 'data/questions.json')

// The official text of this question says Ա and Բ, but its picture is labelled A and B.
const LATIN_PICTURE = new Set(['9-93'])

export const QUESTIONS: Question[] = raw.map((q) => {
  if (q.answer_index >= q.options.length) throw new Error(`question ${q.id}: answer ${q.answer_index} is outside its options`)
  if (q.id !== `${q.group}-${q.number}`) throw new Error(`question ${q.id}: id does not match group ${q.group}, number ${q.number}`)
  return {
    id: q.id,
    group: q.group,
    number: q.number,
    question: q.question,
    options: LATIN_PICTURE.has(q.id) ? q.options.map(latinPictureLabels) : q.options,
    answerIndex: q.answer_index,
    imageUrl: q.image === null ? null : currentImageUrl(q.image),
    fixedOrder: isLabelQuestion(q.options),
    note: KEY_NOTES[q.id] ?? null,
  }
})

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]))
if (QUESTION_BY_ID.size !== QUESTIONS.length) throw new Error('data/questions.json has duplicate ids')
for (const id of Object.keys(KEY_NOTES)) {
  if (!QUESTION_BY_ID.has(id)) throw new Error(`notes.ts has a note for unknown question ${id}`)
}

export const IDS_BY_GROUP = new Map<number, string[]>(GROUP_NUMBERS.map((g) => [g, QUESTIONS.filter((q) => q.group === g).map((q) => q.id)]))
for (const [g, ids] of IDS_BY_GROUP) {
  if (ids.length === 0) throw new Error(`group ${g} has no questions`)
}

export function questionById(id: string): Question {
  const q = QUESTION_BY_ID.get(id)
  if (!q) throw new Error(`question ${id} does not exist`)
  return q
}

export function groupIds(group: number): string[] {
  const ids = IDS_BY_GROUP.get(group)
  if (!ids) throw new Error(`no group ${group}`)
  return ids
}
