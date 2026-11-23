import { useMemo } from 'react'
import { SignInCard } from '../components/Account.tsx'
import { Readiness } from '../components/Readiness.tsx'
import { groupIds, QUESTIONS } from '../lib/data.ts'
import { EXAM, SECTIONS } from '../lib/exam.ts'
import { groupTitle } from '../lib/groups.ts'
import { useProgress } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { countStatuses, lastWrong, statusById } from '../lib/stats.ts'

const ALL_IDS = QUESTIONS.map((q) => q.id)

// Highest chance of being on the test first: a group 3 question 3.4%, group 2 2.4%, group 10 2.0%, the rest about 1.7%.
const STUDY_ORDER = [3, 2, 10, 1, 4, 5, 6, 7, 8, 9]

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
      <SignInCard />
      {mistakes.length > 0 && (
        <div className="card">
          <h2>Իմ սխալները</h2>
          <p>{mistakes.length} հարց, որին վերջին անգամ սխալ ես պատասխանել՝ բոլոր թեմաներից և փորձնական քննություններից։</p>
          <a className="button primary" href={link('practice', 'mistakes', 'all')}>
            Կրկնել սխալները ({mistakes.length})
          </a>
        </div>
      )}
      <div className="card">
        <h2>Հաջորդը</h2>
        {next ? (
          <>
            <p>
              <b>
                {next.g}. {groupTitle(next.g)}
              </b>{' '}
              · դեռ չսովորած՝ {next.open} / {next.total}
            </p>
            <div className="actions">
              <a className="button primary" href={link('practice', String(next.g), 'open')}>
                Պարապել
              </a>
              <a className="button" href={link('topics')}>
                Բոլոր թեմաները
              </a>
            </div>
            <p className="muted small">Հերթականությունը՝ ըստ քննությունում հանդիպելու հավանականության. սկզբում՝ 3-րդ, 2-րդ և 10-րդ խմբերը։</p>
          </>
        ) : (
          <p>Սովորել ես բոլոր {QUESTIONS.length} հարցերը։ Ստուգիր քեզ փորձնական քննությամբ։</p>
        )}
      </div>
      <div className="card">
        <h2>Փորձնական քննություն</h2>
        <p className="muted">
          {EXAM.questions} հարց ({SECTIONS.map((s) => s.draw).join(' + ')}), {EXAM.minutes} րոպե, հանձնելու համար՝ {EXAM.passMark} ճիշտ։
        </p>
        {lastExam && (
          <p>
            Վերջինը՝{' '}
            <a href={link('exam', 'result', lastExam.id)}>
              {lastExam.score} / {EXAM.questions}, {lastExam.passed ? 'հանձնված' : 'չհանձնված'}
            </a>{' '}
            · {daysAgo(lastExam.finishedAt)} · ընդամենը՝ {progress.exams.length}
          </p>
        )}
        <a className="button" href={link('exam')}>
          {progress.activeExam ? 'Շարունակել քննությունը' : 'Սկսել փորձնական քննություն'}
        </a>
      </div>
    </>
  )
}
