import { useEffect, useState } from 'react'
import { QuestionCard } from '../components/QuestionCard.tsx'
import { streakWord, useToday } from '../components/Today.tsx'
import { groupIds, QUESTION_BY_ID, QUESTIONS, type Question } from '../lib/data.ts'
import { GROUP_NUMBERS, groupTitle } from '../lib/groups.ts'
import { displayOrder } from '../lib/options.ts'
import { todayMix } from '../lib/mix.ts'
import { getProgress, recordAnswer } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { getSettings } from '../lib/settings.ts'
import { lastWrong, statusById } from '../lib/stats.ts'

export type Session = {
  title: string
  ids: string[]
  /** Shown when there is nothing to practice. */
  empty: string
  /** Link to practice everything when "not known yet" is empty. */
  allHref: string | null
  /** The next set to practice, offered at the end. */
  next: { href: string; label: string } | null
}

const ALL_IDS = QUESTIONS.map((q) => q.id)

/**
 * source = a group number with arg "all" or "open" (not known yet), "list" with arg = comma-separated question ids
 * (e.g. the mistakes of a mock exam), or "mistakes" (every question whose last answer was wrong).
 */
function buildSession(source: string, arg: string): Session | string {
  if (source === 'list') {
    const ids = arg.split(',')
    if (ids.some((id) => !QUESTION_BY_ID.has(id))) return `«${arg}»-ը հարցերի ցանկ չէ։`
    return { title: 'Ընտրված հարցեր', ids, empty: '', allHref: null, next: null }
  }
  if (source === 'today') {
    return {
      title: 'Այսօրվա պարապմունք',
      ids: todayMix(getProgress().answers, getSettings().dailyGoal),
      empty: '',
      allHref: null,
      next: { href: link('practice', 'today', String(Date.now())), label: 'Պարապել ևս' },
    }
  }
  if (source === 'mistakes') {
    return {
      title: 'Իմ սխալները',
      ids: lastWrong(getProgress().answers, ALL_IDS),
      empty: 'Կրկնելու սխալ չկա. բոլոր սխալ պատասխանած հարցերին արդեն ճիշտ ես պատասխանել։',
      allHref: null,
      next: null,
    }
  }
  const group = Number(source)
  if (!GROUP_NUMBERS.some((g) => g === group)) return `«${source}» խումբ չկա։`
  const position = GROUP_NUMBERS.findIndex((g) => g === group)
  const nextGroup = GROUP_NUMBERS[position + 1]
  const next = nextGroup === undefined ? null : { href: link('practice', String(nextGroup), 'open'), label: `Հաջորդ թեման՝ ${groupTitle(nextGroup)}` }
  const ids = groupIds(group)
  if (arg === 'all') return { title: groupTitle(group), ids, empty: '', allHref: null, next }
  if (arg === 'open') {
    const statuses = statusById(getProgress().answers, ids)
    return {
      title: `${groupTitle(group)} · դեռ չսովորած`,
      ids: ids.filter((id) => statuses.get(id) !== 'known'),
      empty: 'Այս խմբի բոլոր հարցերն արդեն սովորել ես։',
      allHref: link('practice', String(group), 'all'),
      next,
    }
  }
  return `Անհայտ ռեժիմ «${arg}»։`
}

export function Practice({ source, arg }: { source: string; arg: string }) {
  const [session] = useState(() => buildSession(source, arg))
  if (typeof session === 'string') {
    return (
      <div className="card error">
        <p>{session}</p>
        <a href={link('topics')}>Վերադառնալ թեմաներին</a>
      </div>
    )
  }
  const inGroup = GROUP_NUMBERS.some((g) => String(g) === source)
  const fromHome = source === 'today' || source === 'mistakes'
  return (
    <PracticeRunner
      session={session}
      questionOf={(id) => QUESTION_BY_ID.get(id)}
      backHref={inGroup ? link('topics', source) : fromHome ? link() : link('topics')}
      backLabel={inGroup ? 'Թեմա' : fromHome ? 'Գլխավոր' : 'Թեմաներ'}
    />
  )
}

/** After a round: what it did for today's goal and the streak. */
function RoundStreak() {
  const { done, goal, streak } = useToday()
  return (
    <p className="muted">
      {streakWord(streak.current)}։ Այսօր՝ {done} / {goal} հարց։
    </p>
  )
}

type RunnerProps = {
  session: Session
  questionOf: (id: string) => Question | undefined
  backHref: string
  backLabel: string
}

/** One practice round over a list of questions, for the current and the old pool. */
export function PracticeRunner({ session, questionOf, backHref, backLabel }: RunnerProps) {
  const question = (id: string): Question => {
    const q = questionOf(id)
    if (!q) throw new Error(`question ${id} does not exist`)
    return q
  }
  const [queue, setQueue] = useState<string[]>(session.ids)
  const [pos, setPos] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [results, setResults] = useState<{ id: string; correct: boolean }[]>([])

  const current = pos < queue.length ? question(queue[pos]) : null

  // A new random option order each time a question comes up, as on the exam; stable while it is on screen.
  const [order, setOrder] = useState<number[]>(() => (current ? displayOrder(current.options.length, current.fixedOrder) : []))

  function show(ids: string[], index: number) {
    const q = index < ids.length ? question(ids[index]) : null
    setOrder(q ? displayOrder(q.options.length, q.fixedOrder) : [])
    setChosen(null)
    setPos(index)
    window.scrollTo(0, 0)
  }

  function choose(i: number) {
    if (current === null || chosen !== null) return
    const correct = i === current.answerIndex
    setChosen(i)
    setResults((r) => [...r, { id: current.id, correct }])
    recordAnswer(current.id, i, correct, 'practice')
  }

  function next() {
    if (chosen !== null) show(queue, pos + 1)
  }

  function restart(ids: string[]) {
    setQueue(ids)
    setResults([])
    show(ids, 0)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const shown = ['1', '2', '3', '4', '5'].indexOf(e.key)
      if (shown >= 0 && chosen === null && shown < order.length) {
        e.preventDefault()
        choose(order[shown])
      } else if ((e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') && chosen !== null) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (queue.length === 0) {
    return (
      <div className="card">
        <h2>{session.title}</h2>
        <p>{session.empty}</p>
        <div className="actions">
          {session.allHref && (
            <a className="button" href={session.allHref}>
              Կրկնել բոլորը
            </a>
          )}
          <a className="button" href={backHref}>
            {backLabel}
          </a>
        </div>
      </div>
    )
  }

  if (current === null) {
    const missed = results.filter((r) => !r.correct).map((r) => r.id)
    return (
      <div className="card">
        <h2>{session.title}. ավարտ</h2>
        <p className="big-line">
          {results.length - missed.length} / {results.length} ճիշտ
        </p>
        <RoundStreak />
        {missed.length > 0 && (
          <ul className="missed">
            {missed.map((id) => {
              const q = question(id)
              return (
                <li key={id}>
                  <span className="muted">
                    {q.group}-{q.number}.
                  </span>{' '}
                  {q.question} <b>→ {q.options[q.answerIndex]}</b>
                </li>
              )
            })}
          </ul>
        )}
        <div className="actions">
          {missed.length > 0 && (
            <button type="button" className="primary" onClick={() => restart(missed)}>
              Կրկնել սխալները ({missed.length})
            </button>
          )}
          <button type="button" onClick={() => restart(queue)}>
            Նորից ({queue.length})
          </button>
          {session.next && (
            <a className="button" href={session.next.href}>
              {session.next.label}
            </a>
          )}
          <a className="button" href={backHref}>
            {backLabel}
          </a>
        </div>
      </div>
    )
  }

  const right = chosen !== null && chosen === current.answerIndex
  return (
    <>
      <div className="practice-head">
        <a href={backHref}>← {backLabel}</a>
        <span>
          <b>{session.title}</b> · {pos + 1} / {queue.length}
        </span>
      </div>
      <div className="bar thin" aria-hidden="true">
        <span className="seg known" style={{ width: `${(100 * pos) / queue.length}%` }} />
      </div>
      <QuestionCard question={current} order={order} chosen={chosen} reveal={chosen !== null} onChoose={choose} />
      {chosen !== null && (
        <div className={`action-bar ${right ? 'ok' : 'bad'}`} role="status">
          <b>{right ? 'Ճիշտ է' : 'Սխալ է'}</b>
          <button type="button" className="primary" onClick={next}>
            {pos + 1 < queue.length ? 'Հաջորդը' : 'Ավարտել'}
          </button>
        </div>
      )}
      <p className="muted small keys">Ստեղներ. 1-5՝ պատասխանելու, Enter՝ հաջորդ հարցին անցնելու համար։</p>
    </>
  )
}
