// The stats charts, in plain HTML and SVG. Each shows one measure; tapping a mark puts its exact value in the line above
// the chart, because a phone has no hover.
import { useState, type PointerEvent } from 'react'
import { activityLevel, dayNumber, formatDay, monthName, type DayStat } from '../lib/insights.ts'
import { EXAM } from '../lib/exam.ts'
import type { ExamResult } from '../lib/progress.ts'
import { link } from '../lib/router.ts'

export function ScoreTrend({ points }: { points: { day: string; score: number }[] }) {
  const [selected, setSelected] = useState<number | null>(null)
  const n = points.length
  const shown = points[selected ?? n - 1]
  const at = selected ?? n - 1
  const x = (i: number) => (n === 1 ? 100 : (100 * i) / (n - 1))
  const y = (score: number) => 100 - (100 * score) / EXAM.questions
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)} ${y(p.score).toFixed(2)}`).join(' ')
  function pick(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    setSelected(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - box.left) / box.width) * (n - 1)))))
  }
  return (
    <figure className="chart">
      <p className="readout">
        <b>{shown.score.toFixed(1)}</b> միավոր, {formatDay(shown.day)}
      </p>
      <div
        className="trend"
        role="img"
        aria-label={`Սպասվող միավորը ${formatDay(points[0].day)}-ին՝ ${points[0].score.toFixed(1)}, այսօր՝ ${points[n - 1].score.toFixed(1)}, անհրաժեշտ է ${EXAM.passMark}`}
        onPointerDown={pick}
        onPointerMove={pick}
        onPointerLeave={() => setSelected(null)}
      >
        <div className="trend-goal" style={{ top: `${y(EXAM.passMark)}%` }}>
          <span>{EXAM.passMark}՝ հանձնում</span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={path} fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
        <i className="trend-dot" style={{ left: `${x(at)}%`, top: `${y(shown.score)}%` }} />
      </div>
      <div className="axis">
        <span>{formatDay(points[0].day)}</span>
        <span>այսօր</span>
      </div>
    </figure>
  )
}

export function DailyBars({ days }: { days: { day: string; stat: DayStat }[] }) {
  const [selected, setSelected] = useState<number | null>(null)
  const max = Math.max(1, ...days.map((d) => d.stat.total))
  const shown = days[selected ?? days.length - 1]
  return (
    <figure className="chart">
      <p className="readout">
        <b>{shown.stat.total}</b> պատասխան, {shown.stat.right} ճիշտ, {formatDay(shown.day)}
      </p>
      <div className="cols" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((d, i) => {
          const wrong = d.stat.total - d.stat.right
          return (
            <button
              key={d.day}
              type="button"
              className={`col ${i === (selected ?? days.length - 1) ? 'on' : ''}`}
              aria-label={`${formatDay(d.day)}՝ ${d.stat.total} պատասխան, ${d.stat.right} ճիշտ`}
              onClick={() => setSelected(i)}
            >
              <span className="col-plot">
                {d.stat.total > 0 && <span className="col-val">{d.stat.total}</span>}
                {wrong > 0 && <i className="s2" style={{ height: Math.max(2, (wrong / max) * 82) }} />}
                {d.stat.right > 0 && <i className="s1" style={{ height: Math.max(2, (d.stat.right / max) * 82) }} />}
              </span>
              <span className="col-day">{dayNumber(d.day)}</span>
            </button>
          )
        })}
      </div>
      <ul className="chart-key">
        <li>
          <i className="s1" />
          Ճիշտ
        </li>
        <li>
          <i className="s2" />
          Սխալ
        </li>
      </ul>
    </figure>
  )
}

export function ActivityCalendar({ weeks, activity, goal }: { weeks: (string | null)[][]; activity: ReadonlyMap<string, DayStat>; goal: number }) {
  const [selected, setSelected] = useState<string | null>(null)
  const today = weeks.flat().filter((d): d is string => d !== null).at(-1) as string
  const day = selected ?? today
  const total = activity.get(day)?.total ?? 0
  return (
    <figure className="chart">
      <p className="readout">
        <b>{total}</b> պատասխան, {formatDay(day)}
      </p>
      <div className="cal-months" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {weeks.map((w, i) => {
          const first = w[0]
          const startsMonth = first !== null && (i === 0 ? dayNumber(first) <= 21 : dayNumber(first) <= 7)
          return <span key={i}>{startsMonth ? monthName(first) : ''}</span>
        })}
      </div>
      <div className="cal" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.flat().map((d, i) =>
          d === null ? (
            <span key={i} />
          ) : (
            <button
              key={d}
              type="button"
              className={`lv${activityLevel(activity.get(d)?.total ?? 0, goal)} ${d === day ? 'on' : ''}`}
              aria-label={`${formatDay(d)}՝ ${activity.get(d)?.total ?? 0} պատասխան`}
              onClick={() => setSelected(d)}
            />
          ),
        )}
      </div>
      <div className="cal-key" aria-hidden="true">
        <span>0</span>
        <i className="lv1" />
        <i className="lv2" />
        <i className="lv3" />
        <i className="lv4" />
        <span>օրական նպատակի 2 անգամ</span>
      </div>
    </figure>
  )
}

export function ExamBars({ exams }: { exams: ExamResult[] }) {
  const recent = exams.slice(-12)
  return (
    <figure className="chart">
      <div className="cols exam-cols" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}>
        <div className="col-goal" style={{ bottom: 21 + (EXAM.passMark / EXAM.questions) * 82 }} />
        {recent.map((e) => (
          <a key={e.id} className="col" href={link('exam', 'result', e.id)} aria-label={`${e.score} / ${EXAM.questions}, ${e.passed ? 'հանձնված' : 'չհանձնված'}`}>
            <span className="col-plot">
              <span className="col-val">{e.score}</span>
              <i className={e.passed ? 's1' : 's2'} style={{ height: Math.max(2, (e.score / EXAM.questions) * 82) }} />
            </span>
            <span className="col-day">{dayNumber(dayOfExam(e))}</span>
          </a>
        ))}
      </div>
      <ul className="chart-key">
        <li>
          <i className="s1" />
          Հանձնված
        </li>
        <li>
          <i className="s2" />
          Չհանձնված
        </li>
        <li>
          <i className="dash" />
          {EXAM.passMark}՝ հանձնման շեմ
        </li>
      </ul>
    </figure>
  )
}

function dayOfExam(e: ExamResult): string {
  const d = new Date(e.finishedAt)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
