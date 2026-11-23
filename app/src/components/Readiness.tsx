import { useMemo } from 'react'
import { QUESTIONS } from '../lib/data.ts'
import { EXAM } from '../lib/exam.ts'
import { useProgress } from '../lib/progress.ts'
import { readiness, statusById } from '../lib/stats.ts'

const ALL_IDS = QUESTIONS.map((q) => q.id)

/** Pass chance today, from the questions known so far (last two answers right); the rest counts as guessed. */
export function Readiness() {
  const progress = useProgress()
  const r = useMemo(() => readiness(statusById(progress.answers, ALL_IDS)), [progress.answers])
  return (
    <div className="card readiness">
      <div className="big">{(r.pass * 100).toFixed(r.pass < 0.1 && r.pass > 0 ? 1 : 0)}%</div>
      <div>
        <b>Հանձնելու հավանականությունը, եթե քննությունն այսօր լիներ</b>
        <div className="muted">
          {r.known} / {QUESTIONS.length} հարց սովորած · սպասվող արդյունք՝ {r.expected.toFixed(1)} / {EXAM.questions}, անհրաժեշտ է{' '}
          {EXAM.passMark}
        </div>
        <div className="muted small">
          Սովորած է այն հարցը, որին վերջին երկու անգամ ճիշտ ես պատասխանել։ Մնացածը հաշվվում են որպես պատահական ընտրություն։ Հոգեբանական 3 հարցերը
          հաշվարկում չկան։
        </div>
      </div>
    </div>
  )
}
