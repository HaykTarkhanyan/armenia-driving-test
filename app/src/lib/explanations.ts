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
} as const

const ExplanationSchema = z.discriminatedUnion('source', [
  /** `ref` is the point of the act. */
  z.strictObject({ text: z.string().min(1), source: z.enum(['rules', 'faults', 'law']), ref: z.string().min(1) }),
  /** First aid is not in the traffic acts: `ref` is the organization and `url` its page. */
  z.strictObject({ text: z.string().min(1), source: z.literal('web'), ref: z.string().min(1), url: z.url({ protocol: /^https$/ }) }),
])
const FileSchema = z.strictObject({ edition: z.string(), explanations: z.record(z.string(), ExplanationSchema) })
export type Explanation = z.infer<typeof ExplanationSchema>

export function citation(e: Explanation): { label: string; url: string } {
  return e.source === 'web' ? { label: e.ref, url: e.url } : { label: `${SOURCES[e.source].label}, ${e.ref}`, url: SOURCES[e.source].url }
}

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
        if (current) setMessage('Բացատրությունը չհաջողվեց բեռնել։ Ստուգեք կապը և բացեք հաջորդ հարցը։')
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
