import { useMemo, useState } from 'react'
import { ExamMix } from '../components/ExamMix.tsx'
import { Chevron } from '../components/Icons.tsx'
import { groupIds, QUESTIONS } from '../lib/data.ts'
import { EXAM, SECTIONS } from '../lib/exam.ts'
import { groupTitle } from '../lib/groups.ts'
import { useProgress } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { searchQuestions } from '../lib/search.ts'
import { countStatuses, lastWrong, perExam, statusById, type Status } from '../lib/stats.ts'

const ALL_IDS = QUESTIONS.map((q) => q.id)

export function Topics() {
  const progress = useProgress()
  const statuses = useMemo(() => statusById(progress.answers, ALL_IDS), [progress.answers])
  const mistakes = useMemo(() => lastWrong(progress.answers, ALL_IDS), [progress.answers])
  return (
    <>
      <div className="card">
        <h1>Քննությունը {EXAM.questions} հարց է</h1>
        <p className="muted">Դրանք ընտրվում են {QUESTIONS.length} հարցից՝ միշտ այս բաժանմամբ։</p>
        <ExamMix />
        {mistakes.length > 0 && (
          <div className="actions">
            <a className="button primary" href={link('practice', 'mistakes', 'all')}>
              Կրկնել սխալները ({mistakes.length})
            </a>
          </div>
        )}
      </div>
      <QuestionSearch />
      {SECTIONS.map((s) => (
        <section key={s.key} className={`part-${s.key}`}>
          <div className="part">
            <h2>
              {s.name}՝ {s.draw} հարց
            </h2>
            {s.groups.length > 1 && <p>Այս {s.draw} հարցն ընտրվում է ներքևի {s.groups.length} թեմաներից միասին։ Թեմայի տակ գրված է, թե միջինում քանիսն է դրանցից ընկնում։</p>}
          </div>
          {s.groups.map((g) => (
            <GroupRow key={g} group={g} statuses={statuses} />
          ))}
        </section>
      ))}
      <a className="row-link" href={link('old')} style={{ marginTop: 20 }}>
        <div>
          <b>Հին հարցեր</b>
          <small>Նախորդ հարցաշարը՝ առանձին</small>
        </div>
        <Chevron />
      </a>
    </>
  )
}

/** Find any question by number ("4-85") or words, with its official answer. */
function QuestionSearch() {
  const [query, setQuery] = useState('')
  const { hits, total } = useMemo(() => searchQuestions(query), [query])
  const typed = query.trim().length > 0
  return (
    <div className="card">
      <input className="search" type="search" placeholder="Փնտրել հարց՝ բառով կամ համարով (4-85)" aria-label="Փնտրել հարց" value={query} onChange={(e) => setQuery(e.target.value)} />
      {typed && hits.length === 0 && <p className="muted small" style={{ margin: '8px 0 0' }}>Չգտնվեց։ Գրեք առնվազն 3 տառ կամ հարցի համարը։</p>}
      {hits.length > 0 && (
        <>
          <p className="muted small" style={{ margin: '8px 0 0' }}>
            Գտնվեց {total} հարց{total > hits.length ? `, ցույց է տրված ${hits.length}-ը` : ''}
          </p>
          <ul className="search-hits">
            {hits.map((q) => (
              <li key={q.id}>
                <a href={link('practice', 'list', q.id)}>
                  <small>{q.id}</small>
                  {q.question}
                  <b>{q.options[q.answerIndex]}</b>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function GroupRow({ group, statuses }: { group: number; statuses: ReadonlyMap<string, Status> }) {
  const ids = groupIds(group)
  const counts = countStatuses(ids, statuses)
  const share = perExam(group)
  return (
    <a className="group-row" href={link('topics', String(group))}>
      <span className="group-num">{group}</span>
      <div>
        <b>{groupTitle(group)}</b>
        <small>
          {ids.length} հարց, քննությունում՝ {share.exact ? share.count : `մոտ ${share.count}`}
        </small>
        <div className="bar" aria-label={`${counts.known} սովորած ${ids.length}-ից`}>
          <span className="seg known" style={{ width: `${(100 * counts.known) / ids.length}%` }} />
          <span className="seg learning" style={{ width: `${(100 * counts.learning) / ids.length}%` }} />
        </div>
      </div>
      <Chevron />
    </a>
  )
}
