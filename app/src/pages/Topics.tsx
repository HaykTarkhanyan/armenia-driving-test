import { useMemo } from 'react'
import { StatusBar } from '../components/StatusBar.tsx'
import { groupIds, QUESTIONS } from '../lib/data.ts'
import { SECTIONS } from '../lib/exam.ts'
import { GROUP_NUMBERS, groupTitle } from '../lib/groups.ts'
import { useProgress } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { countStatuses, lastWrong, statusById, type Status } from '../lib/stats.ts'

const ALL_IDS = QUESTIONS.map((q) => q.id)

/** How many questions of this group a test contains; the traffic-rule groups share 15. */
function perTest(group: number): string {
  const section = SECTIONS.find((s) => (s.groups as readonly number[]).includes(group))
  if (!section) throw new Error(`group ${group} is in no exam section`)
  return section.groups.length === 1 ? `քննությունում՝ ${section.draw} հարց` : `քննությունում՝ ${section.draw} հարց ${section.groups.length} խմբից`
}

export function Topics() {
  const progress = useProgress()
  const statuses = useMemo(() => statusById(progress.answers, ALL_IDS), [progress.answers])
  const mistakes = useMemo(() => lastWrong(progress.answers, ALL_IDS), [progress.answers])
  return (
    <>
      <div className="card">
        <h1>Թեմաներ</h1>
        <p className="muted">{QUESTIONS.length} հարց՝ ճանապարհային ոստիկանության 10 պաշտոնական խմբերով։</p>
        {mistakes.length > 0 && (
          <div className="actions">
            <a className="button primary" href={link('practice', 'mistakes', 'all')}>
              Կրկնել սխալները ({mistakes.length})
            </a>
          </div>
        )}
      </div>
      <div className="card">
        {GROUP_NUMBERS.map((g) => (
          <GroupRow key={g} group={g} statuses={statuses} />
        ))}
      </div>
    </>
  )
}

function GroupRow({ group, statuses }: { group: number; statuses: ReadonlyMap<string, Status> }) {
  const ids = groupIds(group)
  const counts = countStatuses(ids, statuses)
  const open = ids.length - counts.known
  return (
    <div className="topic">
      <div>
        <b>
          {group}. {groupTitle(group)}
        </b>{' '}
        <span className="muted small">
          {ids.length} հարց · {perTest(group)}
        </span>
      </div>
      <StatusBar counts={counts} />
      <div className="actions">
        {open > 0 && (
          <a className="button primary" href={link('practice', String(group), 'open')}>
            Դեռ չսովորած ({open})
          </a>
        )}
        <a className="button" href={link('practice', String(group), 'all')}>
          Բոլորը ({ids.length})
        </a>
      </div>
    </div>
  )
}
