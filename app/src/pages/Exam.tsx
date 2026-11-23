import { Fragment, useEffect, useState } from 'react'
import { ExamMix } from '../components/ExamMix.tsx'
import { QuestionCard } from '../components/QuestionCard.tsx'
import { questionById } from '../lib/data.ts'
import { EXAM, SECTIONS } from '../lib/exam.ts'
import { correctIndices, finishExam, formatClock, newExam, remainingMs } from '../lib/examFlow.ts'
import { formatDateTime } from '../lib/insights.ts'
import { addFinishedExam, getProgress, updateProgress, useProgress, type ActiveExam, type ExamResult } from '../lib/progress.ts'
import { go, link } from '../lib/router.ts'
import { flush } from '../lib/sync.ts'

export function ExamPage({ resultId }: { resultId: string | null }) {
  const progress = useProgress()
  if (resultId !== null) {
    const result = progress.exams.find((e) => e.id === resultId)
    if (!result) {
      return (
        <div className="card error">
          <p>Այս բրաուզերում {resultId} համարով ավարտված քննություն չկա։</p>
          <a href={link('exam')}>Վերադառնալ քննության էջ</a>
        </div>
      )
    }
    return <ExamResultView result={result} />
  }
  if (progress.activeExam) return <RunningExam exam={progress.activeExam} />
  return <ExamStart exams={progress.exams} />
}

function ExamStart({ exams }: { exams: ExamResult[] }) {
  const start = () => updateProgress((p) => ({ ...p, activeExam: newExam() }))
  return (
    <>
      <div className="card">
        <h1>Փորձնական քննություն</h1>
        <ExamMix />
        <ul style={{ paddingLeft: 20, marginTop: 14 }}>
          <li>{EXAM.minutes} րոպե. ժամանակը լրանալուն պես քննությունն ավարտվում է</li>
          <li>Հանձնված է առնվազն {EXAM.passMark} ճիշտ պատասխանի դեպքում. պատասխանները կտեսնես միայն վերջում</li>
          <li>Պատասխանների հերթականությունը խառն է, ինչպես իսկական քննության ժամանակ</li>
          <li>Հոգեբանական 3 հարցերը հրապարակված չեն, ուստի այստեղ չկան</li>
          <li>Կարող ես դուրս գալ և վերադառնալ. քննությունը շարունակվում է այս բրաուզերում</li>
        </ul>
        <button type="button" className="primary" onClick={start}>
          Սկսել քննությունը
        </button>
      </div>
      {exams.length > 0 && (
        <div className="card">
          <h2>Քո քննությունները</h2>
          <ExamHistory exams={exams} />
        </div>
      )}
    </>
  )
}

export function ExamHistory({ exams }: { exams: ExamResult[] }) {
  return (
    <table>
      <colgroup>
        <col style={{ width: '42%' }} />
        <col style={{ width: '18%' }} />
        <col style={{ width: '22%' }} />
        <col style={{ width: '18%' }} />
      </colgroup>
      <thead>
        <tr>
          <th>Ամսաթիվ</th>
          <th className="num">Արդյունք</th>
          <th>Կարգավիճակ</th>
          <th className="num">Ժամանակ</th>
        </tr>
      </thead>
      <tbody>
        {[...exams].reverse().map((e) => (
          <tr key={e.id}>
            <td>
              <a href={link('exam', 'result', e.id)}>{formatDateTime(e.finishedAt)}</a>
            </td>
            <td className="num">
              {e.score} / {EXAM.questions}
            </td>
            <td className={e.passed ? 'ok-text' : 'bad-text'}>{e.passed ? 'հանձնված' : 'չհանձնված'}</td>
            <td className="num">{formatClock(e.finishedAt - e.startedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Finishes the running exam; false if it was already finished (e.g. the timer and the button at once). */
function finish(id: string, timedOut: boolean): boolean {
  const active = getProgress().activeExam
  if (!active || active.id !== id) return false
  const { result, logged } = finishExam(active, Date.now(), timedOut)
  addFinishedExam(result, logged)
  void flush() // a finished exam is worth saving right away
  return true
}

function submit(id: string, timedOut: boolean): void {
  if (finish(id, timedOut)) go('exam', 'result', id)
}

/** An exam whose time ran out while its page was not open is finished on the next page view (App.tsx). */
export function finishExpiredExam(): void {
  const active = getProgress().activeExam
  if (active && remainingMs(active, Date.now()) <= 0) finish(active.id, true)
}

function RunningExam({ exam }: { exam: ActiveExam }) {
  const [index, setIndex] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const left = remainingMs(exam, now)
  const answered = exam.answers.filter((a) => a !== null).length
  const question = questionById(exam.questionIds[index])
  const order = exam.orders[index]

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (left <= 0) submit(exam.id, true)
  }, [left, exam.id])

  function answer(i: number) {
    updateProgress((p) =>
      p.activeExam && p.activeExam.id === exam.id
        ? { ...p, activeExam: { ...p.activeExam, answers: p.activeExam.answers.map((a, k) => (k === index ? i : a)) } }
        : p,
    )
  }

  function move(delta: number) {
    setIndex((i) => Math.min(EXAM.questions - 1, Math.max(0, i + delta)))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const shown = ['1', '2', '3', '4', '5'].indexOf(e.key)
      const handled = shown >= 0 || e.key === 'ArrowRight' || e.key === 'Enter' || e.key === 'ArrowLeft'
      // Without this, Enter also "clicks" the focused button (an option clicked earlier) and changes that answer.
      if (handled) e.preventDefault()
      if (shown >= 0 && shown < order.length) answer(order[shown])
      else if (e.key === 'ArrowRight' || e.key === 'Enter') move(1)
      else if (e.key === 'ArrowLeft') move(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function onSubmit() {
    const open = EXAM.questions - answered
    if (open > 0 && !window.confirm(`${open} հարց դեռ պատասխանված չէ։ Ավարտե՞լ քննությունը։`)) return
    submit(exam.id, false)
  }

  function onCancel() {
    if (window.confirm('Չեղարկե՞լ քննությունը։ Պատասխանները կջնջվեն, և այն չի հաշվվի։')) {
      updateProgress((p) => ({ ...p, activeExam: null }))
    }
  }

  return (
    <>
      <div className="exam-bar">
        <span className={`clock ${left < 5 * 60_000 ? 'low' : ''}`}>{formatClock(left)}</span>
        <span>
          {answered} / {EXAM.questions} պատասխանված
        </span>
        <button type="button" className="primary" onClick={onSubmit}>
          Ավարտել
        </button>
      </div>
      <div className="navigator">
        {exam.questionIds.map((_, i) => (
          <button
            key={i}
            type="button"
            className={[exam.answers[i] !== null ? 'answered' : '', i === index ? 'current' : ''].join(' ')}
            onClick={() => setIndex(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <QuestionCard
        question={question}
        order={order}
        chosen={exam.answers[index]}
        reveal={false}
        onChoose={answer}
        label={`Հարց ${index + 1} / ${EXAM.questions}`}
      />
      <div className="actions spread">
        <button type="button" onClick={() => move(-1)} disabled={index === 0}>
          ← Նախորդը
        </button>
        <button type="button" onClick={() => move(1)} disabled={index === EXAM.questions - 1}>
          Հաջորդը →
        </button>
      </div>
      <p className="muted small" style={{ textAlign: 'center', marginTop: 14 }}>
        <span className="keys">Ստեղներ. 1-5՝ պատասխանելու, ←/→՝ տեղաշարժվելու համար։ </span>
        <button type="button" className="linklike" onClick={onCancel}>
          Չեղարկել քննությունը
        </button>
      </p>
    </>
  )
}

function ExamResultView({ result }: { result: ExamResult }) {
  const correct = correctIndices(result.questionIds)
  const rows = result.questionIds.map((id, i) => ({ id, i, chosen: result.answers[i], right: result.answers[i] === correct[i] }))
  const wrong = rows.filter((r) => !r.right)
  const right = rows.filter((r) => r.right)
  const card = (r: (typeof rows)[number]) => (
    <Fragment key={r.id}>
      <QuestionCard
        question={questionById(r.id)}
        order={result.orders[r.i]}
        chosen={r.chosen}
        reveal
        label={`Հարց ${r.i + 1}${r.chosen === null ? ' · պատասխան չկա' : ''}`}
      />
    </Fragment>
  )
  return (
    <>
      <div className={`card result ${result.passed ? 'ok' : 'bad'}`}>
        <div className="big">
          {result.score} / {EXAM.questions}
        </div>
        <div>
          <b>{result.passed ? 'Հանձնված է' : 'Հանձնված չէ'}</b> (անհրաժեշտ է {EXAM.passMark})
          <div className="muted">
            {formatDateTime(result.finishedAt)} · տևեց {formatClock(result.finishedAt - result.startedAt)}
            {result.timedOut ? ' · ժամանակը լրացավ' : ''}
          </div>
        </div>
      </div>
      <div className="card">
        <h2>Ըստ բաժինների</h2>
        {SECTIONS.map((s) => {
          const inPart = rows.filter((r) => (s.groups as readonly number[]).includes(questionById(r.id).group))
          const got = inPart.filter((r) => r.right).length
          return (
            <div key={s.key} className={`part-score part-${s.key}`}>
              <span>{s.name}</span>
              <b>
                {got} / {inPart.length}
              </b>
              <span className="bar">
                <span className="seg" style={{ width: `${(100 * got) / inPart.length}%` }} />
              </span>
            </div>
          )
        })}
      </div>
      <div className="actions">
        {wrong.length > 0 && (
          <a className="button primary" href={link('practice', 'list', wrong.map((r) => r.id).join(','))}>
            Կրկնել սխալները ({wrong.length})
          </a>
        )}
        <a className="button" href={link('exam')}>
          Քննության էջ
        </a>
      </div>
      {wrong.length > 0 && (
        <details open className="card plain">
          <summary>
            <b>Սխալ կամ առանց պատասխանի ({wrong.length})</b>
          </summary>
          {wrong.map(card)}
        </details>
      )}
      <details className="card plain">
        <summary>
          <b>Ճիշտ ({right.length})</b>
        </summary>
        {right.map(card)}
      </details>
    </>
  )
}
