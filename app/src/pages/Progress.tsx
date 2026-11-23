import { useMemo } from 'react'
import { ActivityCalendar, DailyBars, ExamBars, ScoreTrend } from '../components/Charts.tsx'
import { Flame } from '../components/Icons.tsx'
import { chance } from '../components/Readiness.tsx'
import { streakWord, useToday } from '../components/Today.tsx'
import { groupIds, questionById, QUESTIONS } from '../lib/data.ts'
import { EXAM, SECTIONS } from '../lib/exam.ts'
import { groupTitle } from '../lib/groups.ts'
import { accuracy, addDays, calendarWeeks, dayKey, hardest, lastDays, scoreTrend, weekdayName } from '../lib/insights.ts'
import { useProgress } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { countStatuses, readiness, statusById } from '../lib/stats.ts'
import { ExamHistory } from './Exam.tsx'

const ALL_IDS = QUESTIONS.map((q) => q.id)
const percent = (x: number | null) => (x === null ? 'չկա' : `${Math.round(x * 100)}%`)

export function ProgressPage() {
  const progress = useProgress()
  const { today, activity, goal, done, streak } = useToday()
  const statuses = useMemo(() => statusById(progress.answers, ALL_IDS), [progress.answers])
  const pass = useMemo(() => readiness(statuses).pass, [statuses])
  const trend = useMemo(() => scoreTrend(progress.answers, lastDays(today, 30)), [progress.answers, today])
  const hard = useMemo(() => hardest(progress.answers, 6), [progress.answers])
  const weekAgo = addDays(today, -6)
  const lastWeek = useMemo(() => progress.answers.filter((a) => dayKey(new Date(a.at)) >= weekAgo), [progress.answers, weekAgo])
  const known = countStatuses(ALL_IDS, statuses).known
  const started = progress.answers.length > 0
  const week = lastDays(today, 7)
  const passedExams = progress.exams.filter((e) => e.passed).length
  const bestExam = progress.exams.reduce((n, e) => Math.max(n, e.score), 0)

  return (
    <>
      <h1 style={{ margin: '4px 2px 10px' }}>Առաջընթաց</h1>
      <section className="card streak-card">
        <div className="streak-main">
          <span className={`streak-flame ${streak.doneToday ? 'lit' : ''}`}>
            <Flame />
          </span>
          <div>
            <b>{streakWord(streak.current)}</b>
            <small>Լավագույնը՝ {streak.best} օր</small>
          </div>
        </div>
        <ol className="week" aria-label="Վերջին 7 օրը">
          {week.map((d) => (
            <li key={d} className={`${activity.has(d) ? 'done' : ''} ${d === today ? 'today-mark' : ''}`}>
              <i />
              {weekdayName(d)}
            </li>
          ))}
        </ol>
        <p className="muted small" style={{ margin: '10px 0 0' }}>
          Այսօր՝ {done} / {goal} հարց։ Օրը հաշվվում է, երբ պատասխանում եք գոնե մեկ հարցի։
        </p>
      </section>

      <div className="tiles">
        <div>
          <b>{known}</b>
          <span>սովորած՝ {QUESTIONS.length} հարցից</span>
        </div>
        <div>
          <b>{percent(accuracy(lastWeek))}</b>
          <span>ճիշտ՝ վերջին 7 օրում</span>
        </div>
        <div>
          <b>{progress.answers.length}</b>
          <span>պատասխան ընդամենը</span>
        </div>
        <div>
          <b>{activity.size}</b>
          <span>պարապմունքի օր</span>
        </div>
      </div>

      {!started && (
        <div className="card">
          <p>Պատասխանեք առաջին հարցերին, և այստեղ կերևան ձեր գրաֆիկները։</p>
          <a className="button primary" href={link('practice', 'today', '0')}>
            Սկսել պարապմունքը
          </a>
        </div>
      )}

      {started && (
        <>
          <section className="card">
            <h2>Սպասվող միավորը՝ 30 օրում</h2>
            <p className="muted small">Հանձնելու հավանականությունն այսօր՝ {chance(pass)}</p>
            <ScoreTrend points={trend} />
          </section>
          <section className="card">
            <h2>Պատասխաններ՝ վերջին 14 օրում</h2>
            <DailyBars days={lastDays(today, 14).map((day) => ({ day, stat: activity.get(day) ?? { total: 0, right: 0 } }))} />
          </section>
          <section className="card">
            <h2>Ակտիվության օրացույց</h2>
            <ActivityCalendar weeks={calendarWeeks(today, 16)} activity={activity} goal={goal} />
          </section>
        </>
      )}

      <section className="card">
        <h2>Ըստ թեմաների</h2>
        {SECTIONS.flatMap((s) =>
          s.groups.map((g) => {
            const ids = groupIds(g)
            const c = countStatuses(ids, statuses)
            return (
              <a key={g} className="topic-bar" href={link('topics', String(g))}>
                <span className="topic-name">
                  {g}. {groupTitle(g)}
                </span>
                <span className="topic-value">
                  {c.known} / {ids.length}
                </span>
                <span className="bar">
                  <span className="seg known" style={{ width: `${(100 * c.known) / ids.length}%` }} />
                  <span className="seg learning" style={{ width: `${(100 * c.learning) / ids.length}%` }} />
                </span>
              </a>
            )
          }),
        )}
        <ul className="chart-key">
          <li>
            <i className="seg known" />
            Սովորած
          </li>
          <li>
            <i className="seg learning" />
            Ընթացքում
          </li>
        </ul>
      </section>

      {hard.length > 0 && (
        <section className="card">
          <h2>Ամենադժվար հարցերը</h2>
          <ul className="hard">
            {hard.map((h) => (
              <li key={h.id}>
                <a href={link('practice', 'list', h.id)}>{questionById(h.id).question}</a>
                <small>
                  {h.id}, սխալ՝ {h.wrong} անգամ {h.total}-ից
                </small>
              </li>
            ))}
          </ul>
          <a className="button" href={link('practice', 'list', hard.map((h) => h.id).join(','))}>
            Պարապել այս {hard.length} հարցը
          </a>
        </section>
      )}

      <section className="card">
        <h2>Փորձնական քննություններ</h2>
        {progress.exams.length > 0 ? (
          <>
            <p className="muted">
              Հանձնված՝ {passedExams} / {progress.exams.length}, լավագույնը՝ {bestExam} / {EXAM.questions}
            </p>
            <ExamBars exams={progress.exams} />
            <details className="how">
              <summary>Բոլոր քննությունները</summary>
              <ExamHistory exams={progress.exams} />
            </details>
          </>
        ) : (
          <>
            <p className="muted">Դեռ փորձնական քննություն չեք հանձնել։</p>
            <a className="button" href={link('exam')}>
              Սկսել քննություն
            </a>
          </>
        )}
      </section>
    </>
  )
}
