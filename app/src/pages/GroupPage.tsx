import { useMemo } from 'react'
import { GuideItems, Numbers, SignKey } from '../components/Guide.tsx'
import { StatusBar } from '../components/StatusBar.tsx'
import { guideOf } from '../content/guides.ts'
import { groupIds } from '../lib/data.ts'
import { GROUP_NUMBERS, groupTitle } from '../lib/groups.ts'
import { useProgress } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { countStatuses, perExam, statusById } from '../lib/stats.ts'

/** One topic: where you stand, a button to practice, and its shortcuts. */
export function GroupPage({ group }: { group: number }) {
  const progress = useProgress()
  const valid = GROUP_NUMBERS.some((g) => g === group)
  const ids = valid ? groupIds(group) : []
  const statuses = useMemo(() => statusById(progress.answers, ids), [progress.answers, ids])
  if (!valid) {
    return (
      <div className="card error">
        <p>Այդպիսի թեմա չկա։</p>
        <a href={link('topics')}>Բոլոր թեմաները</a>
      </div>
    )
  }
  const counts = countStatuses(ids, statuses)
  const open = ids.length - counts.known
  const share = perExam(group)
  const guide = guideOf(group)
  return (
    <>
      <div className="practice-head">
        <a href={link('topics')}>← Թեմաներ</a>
      </div>
      <div className="card">
        <h1>
          {group}. {groupTitle(group)}
        </h1>
        <p className="muted">
          {ids.length} հարց, քննությունում՝ {share.exact ? `${share.count} հարց` : `միջինում մոտ ${share.count} հարց`}
        </p>
        <StatusBar counts={counts} />
        <div className="actions fill">
          {open > 0 && (
            <a className="button primary" href={link('practice', String(group), 'open')}>
              Պարապել չսովորածները ({open})
            </a>
          )}
          <a className={`button ${open === 0 ? 'primary' : ''}`} href={link('practice', String(group), 'all')}>
            Բոլորը ({ids.length})
          </a>
        </div>
      </div>
      <h2 style={{ margin: '18px 2px 6px' }}>Հնարքներ</h2>
      <p style={{ margin: '0 2px 10px' }}>{guide.lead}</p>
      {guide.numbers && <Numbers numbers={guide.numbers} />}
      <div style={{ margin: '0 2px 10px' }}>
        <SignKey />
      </div>
      <GuideItems items={guide.items} />
      {guide.limits && (
        <div className="card limits">
          <b>Որտեղ հնարք չկա. </b>
          {guide.limits}
        </div>
      )}
    </>
  )
}
