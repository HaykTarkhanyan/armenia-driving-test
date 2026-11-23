import { useMemo } from 'react'
import { QUESTIONS } from '../lib/data.ts'
import { EXAM } from '../lib/exam.ts'
import { useProgress } from '../lib/progress.ts'
import { readiness, statusById } from '../lib/stats.ts'

const ALL_IDS = QUESTIONS.map((q) => q.id)

function chance(p: number): string {
  if (p < 0.01) return '1%-ից պակաս'
  if (p > 0.99) return '99%-ից ավելի'
  return `${Math.round(p * 100)}%`
}

/** A road from 0 to 20 with the finish line at 18; the car stands at the score you would get today. */
export function Readiness() {
  const progress = useProgress()
  const r = useMemo(() => readiness(statusById(progress.answers, ALL_IDS)), [progress.answers])
  const at = (100 * r.expected) / EXAM.questions
  const score = Math.round(r.expected)
  return (
    <section className="hero">
      <h1>Այսօր՝ մոտ {score} միավոր</h1>
      <p>
        {EXAM.questions}-ից, իսկ հանձնելու համար պետք է {EXAM.passMark}։ Հավանականությունը՝ {chance(r.pass)}։
      </p>
      <div className="road" role="img" aria-label={`Սպասվող արդյունք՝ ${r.expected.toFixed(1)}, անհրաժեշտ է ${EXAM.passMark}`}>
        <div className="road-dash" />
        <div className="road-done" style={{ width: `${at}%`, ['--dashes' as string]: Math.max(r.expected, 0.01) }} />
        <div className="road-finish" />
        <svg className="road-car" style={{ left: `${Math.max(at, 11)}%` }} viewBox="0 0 46 24" aria-hidden="true">
          <rect x="1" y="2" width="44" height="20" rx="7" fill="#d90012" />
          <rect x="12" y="5" width="7" height="14" rx="2" fill="#20242a" />
          <rect x="29" y="5" width="8" height="14" rx="2" fill="#20242a" />
          <rect x="42" y="4" width="3" height="4" rx="1" fill="#ffe08a" />
          <rect x="42" y="16" width="3" height="4" rx="1" fill="#ffe08a" />
        </svg>
      </div>
      <div className="road-marks" aria-hidden="true">
        <span>0</span>
        <span className="pass">{EXAM.passMark}</span>
        <span className="end">{EXAM.questions}</span>
      </div>
      <details className="how">
        <summary>
          {r.known} / {QUESTIONS.length} հարց սովորած
        </summary>
        <p>
          Հարցը սովորած է, երբ վերջին երկու անգամ ճիշտ ես պատասխանել։ Մնացածը հաշվվում են որպես պատահական ընտրություն։ Հոգեբանական 3 հարցերը հաշվարկում չկան։
        </p>
      </details>
    </section>
  )
}
