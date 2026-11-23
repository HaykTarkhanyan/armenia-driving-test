import { useMemo } from 'react'
import { SignInCard } from '../components/Account.tsx'
import { Chevron, ExamIcon, Sign } from '../components/Icons.tsx'
import { Readiness } from '../components/Readiness.tsx'
import { TodayCard } from '../components/Today.tsx'
import { groupIds, QUESTIONS } from '../lib/data.ts'
import { EXAM, SECTIONS } from '../lib/exam.ts'
import { groupTitle } from '../lib/groups.ts'
import { installApp, useCanInstall } from '../lib/install.ts'
import { STUDY_ORDER } from '../lib/mix.ts'
import { useProgress } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { updateSettings, useSettings } from '../lib/settings.ts'
import { countStatuses, lastWrong, statusById } from '../lib/stats.ts'

const ALL_IDS = QUESTIONS.map((q) => q.id)

/** Calendar days in local time: an exam at 23:00 is "yesterday" the next morning, not "today". */
function daysAgo(t: number): string {
  const day = (ms: number) => {
    const d = new Date(ms)
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000
  }
  const d = day(Date.now()) - day(t)
  return d <= 0 ? 'այսօր' : d === 1 ? 'երեկ' : `${d} օր առաջ`
}

export function Home() {
  const progress = useProgress()
  const statuses = useMemo(() => statusById(progress.answers, ALL_IDS), [progress.answers])
  const mistakes = useMemo(() => lastWrong(progress.answers, ALL_IDS), [progress.answers])
  const lastExam = progress.exams.at(-1)
  const canInstall = useCanInstall()
  const { installDismissed } = useSettings()
  const next = STUDY_ORDER.map((g) => {
    const ids = groupIds(g)
    return { g, total: ids.length, open: ids.length - countStatuses(ids, statuses).known }
  }).find((x) => x.open > 0)
  return (
    <>
      {progress.activeExam && (
        <div className="card notice">
          Ունես չավարտված փորձնական քննություն։ <a href={link('exam')}>Շարունակել</a>
        </div>
      )}
      <Readiness />
      <TodayCard />
      {canInstall && !installDismissed && (
        <div className="card">
          <b>Տեղադրիր հեռախոսում</b>
          <p className="muted small">Հավելվածը կբացվի առանձին պատուհանով՝ առանց բրաուզերի։</p>
          <div className="actions">
            <button type="button" className="primary" onClick={() => void installApp()}>
              Տեղադրել
            </button>
            <button type="button" onClick={() => updateSettings({ installDismissed: true })}>
              Հետո
            </button>
          </div>
        </div>
      )}
      {next ? (
        <a className={`row-link part-${SECTIONS.find((s) => (s.groups as readonly number[]).includes(next.g))?.key}`} href={link('topics', String(next.g))}>
          <span className="group-num">{next.g}</span>
          <div>
            <b>{groupTitle(next.g)}</b>
            <small>
              Հաջորդ թեման, մնաց {next.open} / {next.total} հարց
            </small>
          </div>
          <Chevron />
        </a>
      ) : (
        <div className="card">Սովորել ես բոլոր {QUESTIONS.length} հարցերը։ Ստուգիր քեզ փորձնական քննությամբ։</div>
      )}
      {mistakes.length > 0 && (
        <a className="row-link" href={link('practice', 'mistakes', 'all')}>
          <span className="row-icon">
            <Sign kind="lean" />
          </span>
          <div>
            <b>Կրկնել սխալները</b>
            <small>{mistakes.length} հարց, որին վերջին անգամ սխալ ես պատասխանել</small>
          </div>
          <Chevron />
        </a>
      )}
      <a className="row-link" href={link('exam')}>
        <span className="row-icon">
          <ExamIcon />
        </span>
        <div>
          <b>{progress.activeExam ? 'Շարունակել քննությունը' : 'Փորձնական քննություն'}</b>
          <small>
            {lastExam
              ? `Վերջինը՝ ${lastExam.score} / ${EXAM.questions}, ${lastExam.passed ? 'հանձնված' : 'չհանձնված'}, ${daysAgo(lastExam.finishedAt)}`
              : `${EXAM.questions} հարց, ${EXAM.minutes} րոպե, պետք է ${EXAM.passMark} ճիշտ`}
          </small>
        </div>
        <Chevron />
      </a>
      <SignInCard />
    </>
  )
}
