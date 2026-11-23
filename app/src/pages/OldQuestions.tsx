// The previous pool as a separate practice set (lazy-loaded from App.tsx). Its answers are logged under "old-" ids, so
// they never count toward the current pool's status or the pass chance.
import { useMemo, useState } from 'react'
import { StatusBar } from '../components/StatusBar.tsx'
import { GROUP_NUMBERS, groupTitle } from '../lib/groups.ts'
import { OLD_BY_ID, OLD_IDS_BY_GROUP, OLD_QUESTIONS, REMOVED_IDS } from '../lib/oldPool.ts'
import { getProgress, useProgress } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { countStatuses, statusById, type Status } from '../lib/stats.ts'
import { PracticeRunner, type Session } from './Practice.tsx'

const ALL_OLD_IDS = OLD_QUESTIONS.map((q) => q.id)

function idsOf(set: string): { title: string; ids: string[] } | null {
  if (set === 'removed') return { title: 'Հանված հարցեր', ids: REMOVED_IDS }
  const group = Number(set)
  const ids = OLD_IDS_BY_GROUP.get(group)
  return ids ? { title: `Հին հարցեր · ${groupTitle(group)}`, ids } : null
}

function buildSession(set: string, mode: string): Session | string {
  const found = idsOf(set)
  if (!found) return `«${set}» հավաքածու չկա։`
  if (mode === 'all') return { title: found.title, ids: found.ids, empty: '', allHref: null, next: null }
  if (mode === 'open') {
    const statuses = statusById(getProgress().answers, found.ids)
    return {
      title: `${found.title} · դեռ չսովորած`,
      ids: found.ids.filter((id) => statuses.get(id) !== 'known'),
      empty: 'Այստեղի բոլոր հարցերն արդեն սովորել ես։',
      allHref: link('old', 'practice', set, 'all'),
      next: null,
    }
  }
  return `Անհայտ ռեժիմ «${mode}»։`
}

export default function OldQuestions({ route }: { route: string[] }) {
  if (route[1] === 'practice') return <OldPractice key={route.join('/')} set={route[2] ?? ''} mode={route[3] ?? 'all'} />
  return <OldList />
}

function OldPractice({ set, mode }: { set: string; mode: string }) {
  const [session] = useState(() => buildSession(set, mode))
  if (typeof session === 'string') {
    return (
      <div className="card error">
        <p>{session}</p>
        <a href={link('old')}>Վերադառնալ հին հարցերին</a>
      </div>
    )
  }
  return <PracticeRunner session={session} questionOf={(id) => OLD_BY_ID.get(id)} backHref={link('old')} backLabel="Հին հարցեր" />
}

function OldList() {
  const progress = useProgress()
  const statuses = useMemo(() => statusById(progress.answers, ALL_OLD_IDS), [progress.answers])
  return (
    <>
      <div className="card">
        <h1>Հին հարցեր</h1>
        <p>
          Նախորդ հարցաշարը՝ {OLD_QUESTIONS.length} հարց (2022 թ. ֆայլերը)։ Դրանցից {REMOVED_IDS.length}-ն այլևս չկան ներկայիս հարցաշարում։
        </p>
        <p className="muted small">
          Որոշ պատասխաններ այստեղ հնացած են։ Քննության համար սովորիր «Թեմաներ» էջից. այստեղի պատասխանները չեն ազդում հանձնելու հավանականության վրա։
        </p>
      </div>
      <div className="card">
        <OldRow set="removed" title="Ներկայիս հարցաշարից հանված հարցեր" ids={REMOVED_IDS} statuses={statuses} />
        {GROUP_NUMBERS.map((g) => {
          const ids = OLD_IDS_BY_GROUP.get(g)
          if (!ids) throw new Error(`old pool has no group ${g}`)
          return <OldRow key={g} set={String(g)} title={`${g}. ${groupTitle(g)}`} ids={ids} statuses={statuses} />
        })}
      </div>
    </>
  )
}

function OldRow({ set, title, ids, statuses }: { set: string; title: string; ids: string[]; statuses: ReadonlyMap<string, Status> }) {
  const counts = countStatuses(ids, statuses)
  const open = ids.length - counts.known
  return (
    <div className="topic">
      <div>
        <b>{title}</b> <span className="muted small">{ids.length} հարց</span>
      </div>
      <StatusBar counts={counts} />
      <div className="actions">
        {open > 0 && (
          <a className="button primary" href={link('old', 'practice', set, 'open')}>
            Դեռ չսովորած ({open})
          </a>
        )}
        <a className="button" href={link('old', 'practice', set, 'all')}>
          Բոլորը ({ids.length})
        </a>
      </div>
    </div>
  )
}
