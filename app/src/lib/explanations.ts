// The "why" after an answer (data/explanations.json), written from the official rules. A separate chunk, loaded after
// the first answer: with all 1,050 questions it would otherwise be the heaviest part of the first page load.
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { parse, QUESTION_BY_ID } from './data.ts'
import { EDITION } from './editions.ts'

const RULES_URL = 'https://www.arlis.am/hy/acts/212587/latest'

export const SOURCES = {
  rules: { label: 'Երթևեկության կանոններ (955-Ն)', url: RULES_URL },
  faults: { label: 'Շահագործումն արգելող անսարքություններ (955-Ն, հավելված 2)', url: RULES_URL },
  law: { label: 'ՀՀ օրենք ՀՕ-166-Ն', url: 'https://www.arlis.am/hy/acts/1857/latest' },
  cdc: { label: 'CDC', url: 'https://www.cdc.gov/epilepsy/first-aid-for-seizures/index.html' },
  mayo: { label: 'Mayo Clinic', url: 'https://www.mayoclinic.org/first-aid/first-aid-basics/art-20056604' },
} as const

const ExplanationSchema = z.strictObject({
  text: z.string().min(1),
  source: z.enum(['rules', 'faults', 'law', 'cdc', 'mayo']),
  /** Which point of the source, or null when the source is one page. */
  ref: z.string().min(1).nullable(),
})
const FileSchema = z.strictObject({ edition: z.string(), explanations: z.record(z.string(), ExplanationSchema) })
export type Explanation = z.infer<typeof ExplanationSchema>

/** Question numbers belong to an edition, so a file from another edition would explain the wrong questions. */
export function parseExplanations(raw: unknown): Map<string, Explanation> {
  const file = parse(FileSchema, raw, 'data/explanations.json')
  if (file.edition !== EDITION) throw new Error(`data/explanations.json is for edition ${file.edition}, the questions are ${EDITION}`)
  for (const id of Object.keys(file.explanations)) {
    if (!QUESTION_BY_ID.has(id)) throw new Error(`data/explanations.json explains unknown question ${id}`)
  }
  return new Map(Object.entries(file.explanations))
}

let loaded: Map<string, Explanation> | null = null
let loading: Promise<Map<string, Explanation>> | null = null

function load(): Promise<Map<string, Explanation>> {
  loading ??= import('../../../data/explanations.json')
    .then((module) => {
      loaded = parseExplanations(module.default)
      return loaded
    })
    .catch((err: unknown) => {
      loading = null // the next question tries again
      throw err
    })
  return loading
}

export type ExplanationState =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'ready'; explanation: Explanation }
  | { status: 'error'; message: string }

export function useExplanation(id: string): ExplanationState {
  const [all, setAll] = useState(loaded)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    if (all !== null) return
    let current = true
    load()
      .then((map) => {
        if (current) setAll(map)
      })
      .catch((err: unknown) => {
        console.error('Could not load the explanations', err)
        if (current) setMessage('Բացատրությունը չհաջողվեց բեռնել։ Ստուգիր կապը և բացիր հաջորդ հարցը։')
      })
    return () => {
      current = false
    }
  }, [all])
  if (message !== null) return { status: 'error', message }
  if (all === null) return { status: 'loading' }
  const explanation = all.get(id)
  return explanation ? { status: 'ready', explanation } : { status: 'none' }
}
