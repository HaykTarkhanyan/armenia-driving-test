// Which shortcut applies to a question (data/hints.json, built by scripts/build_hints.py). Shown after answering, never
// during a mock exam: a hint before the answer would make the practice result meaningless.
import { z } from 'zod'
import hintsJson from '../../../data/hints.json' with { type: 'json' }
import { parse, QUESTION_BY_ID } from './data.ts'

const RULES = ['design', 'never', 'pedestrians_too', 'tram_yes', 'g8_middle', 'backing_no', 'g2_definition_longest', 'obligatory', 'g10_longest', 'all_both'] as const
export type HintRule = (typeof RULES)[number]

const HintSchema = z.strictObject({ rule: z.enum(RULES), works: z.boolean(), options: z.array(z.number().int().min(0).max(4)).optional() })
const FileSchema = z.strictObject({
  summary: z.record(z.enum(RULES), z.strictObject({ fires: z.number().int().min(0), right: z.number().int().min(0) })),
  hints: z.record(z.string(), HintSchema),
})
export type Hint = z.infer<typeof HintSchema>

const file = parse(FileSchema, hintsJson as unknown, 'data/hints.json')
for (const id of Object.keys(file.hints)) {
  if (!QUESTION_BY_ID.has(id)) throw new Error(`data/hints.json has a hint for unknown question ${id}`)
}

export const HINT_SUMMARY = file.summary

export function statLabel(rule: HintRule): string {
  const s = file.summary[rule]
  return `${s.right} / ${s.fires}`
}

export function hintFor(id: string): Hint | null {
  return file.hints[id] ?? null
}

const TEXT: Record<HintRule, string> = {
  design: '«Կառուցվածքով նախատեսված» պայմանը միշտ արգելում է շահագործումը։',
  never: 'Այստեղ կա տարբերակ, որը կարելի է անմիջապես բացառել։',
  pedestrians_too: 'Զիջման ցանկում ճիշտն այն է, որտեղ հետիոտները մեկ ուրիշի հետ են։',
  tram_yes: 'Եթե հարցնում են՝ պարտավո՞ր ես զիջել տրամվային, պատասխանը «այո» է։',
  g8_middle: 'Հինգ թվային տարբերակի դեպքում ճիշտը չափով միջինն է։',
  backing_no: 'Հետընթացի հարցերում սովորաբար ճիշտ է «ոչ» կամ «արգելվում է»։',
  g2_definition_longest: 'Օրենքի սահմանումներում ճիշտը սովորաբար ամենաերկար տարբերակն է։',
  obligatory: 'Միայնակ «պարտավոր է» տարբերակը սովորաբար ճիշտ է։',
  g10_longest: 'Առաջին օգնության հարցերում ճիշտը հաճախ ամենաերկար տարբերակն է։',
  all_both: 'Առանց նկարի հարցերում «երկու դեպքում էլ» տարբերակը հաճախ է ճիշտ։',
}

export function hintText(hint: Hint, options: readonly string[]): string {
  if (hint.rule === 'never' && hint.options) {
    const crossed = hint.options.map((i) => `«${options[i]}»`).join(', ')
    return `Կարելի էր անմիջապես բացառել՝ ${crossed}։ Նման տարբերակները երբեք ճիշտ չեն։`
  }
  return hint.works ? TEXT[hint.rule] : `${TEXT[hint.rule]} Այս հարցը բացառություն է։`
}
