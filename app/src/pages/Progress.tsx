import { useMemo, useState, type ChangeEvent } from 'react'
import { Readiness } from '../components/Readiness.tsx'
import { groupIds, QUESTIONS } from '../lib/data.ts'
import { GROUP_NUMBERS, groupTitle } from '../lib/groups.ts'
import { AccountCard } from '../components/Account.tsx'
import { downloadText, exportFileName, mergeLocal, parseProgress, ProgressError, updateProgress, useProgress } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { countStatuses, statusById } from '../lib/stats.ts'
import { resetProgress, useSyncState } from '../lib/sync.ts'
import { ExamHistory } from './Exam.tsx'

const ALL_IDS = QUESTIONS.map((q) => q.id)

export function ProgressPage() {
  const progress = useProgress()
  const sync = useSyncState()
  const statuses = useMemo(() => statusById(progress.answers, ALL_IDS), [progress.answers])
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    let incoming
    try {
      incoming = parseProgress(await file.text(), `«${file.name}»`)
    } catch (err) {
      if (!(err instanceof ProgressError)) throw err
      setImportMessage({ ok: false, text: err.message })
      return
    }
    const question = `Ավելացնե՞լ «${file.name}» ֆայլի ${incoming.answers.length} պատասխանը և ${incoming.exams.length} քննությունը քո առաջընթացին։`
    if (!window.confirm(question)) return
    updateProgress((p) => mergeLocal(p, incoming))
    setImportMessage({ ok: true, text: `«${file.name}» ֆայլը ներմուծվեց։` })
  }

  function onReset() {
    const where = sync.account ? 'քո հաշվի' : 'այս բրաուզերի'
    if (!window.confirm(`Ջնջե՞լ ${where} ամբողջ առաջընթացը (${progress.answers.length} պատասխան, ${progress.exams.length} քննություն)։`)) return
    setImportMessage(null)
    resetProgress().catch((err: unknown) => setImportMessage({ ok: false, text: err instanceof Error ? err.message : String(err) }))
  }

  return (
    <>
      <AccountCard />
      <Readiness />
      <div className="card">
        <h2>Ըստ թեմաների</h2>
        <table>
          <colgroup>
            <col style={{ width: '44%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '13%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Թեմա</th>
              <th className="num">Սովորած</th>
              <th className="num">Ընթացքում</th>
              <th className="num">Նոր</th>
              <th className="num">%</th>
            </tr>
          </thead>
          <tbody>
            {GROUP_NUMBERS.map((g) => {
              const ids = groupIds(g)
              const c = countStatuses(ids, statuses)
              return (
                <tr key={g}>
                  <td>
                    <a href={link('practice', String(g), 'open')}>
                      {g}. {groupTitle(g)}
                    </a>
                  </td>
                  <td className="num">{c.known}</td>
                  <td className="num">{c.learning}</td>
                  <td className="num">{c.new}</td>
                  <td className="num">{Math.round((100 * c.known) / ids.length)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h2>Փորձնական քննություններ</h2>
        {progress.exams.length > 0 ? <ExamHistory exams={progress.exams} /> : <p className="muted">Դեռ փորձնական քննություն չես հանձնել։</p>}
      </div>
      <div className="card">
        <h2>Քո տվյալները</h2>
        <p className="muted">
          {progress.answers.length} պատասխան, {progress.exams.length} քննություն։ Կարող ես արտահանել դրանք ֆայլով՝ որպես պատճեն, և ներմուծել այլ սարքում։
        </p>
        <div className="actions">
          <button type="button" onClick={() => downloadText(JSON.stringify(progress), exportFileName())}>
            Արտահանել
          </button>
          <label className="button">
            Ներմուծել
            <input type="file" accept=".json,application/json" onChange={onImport} hidden />
          </label>
          <button type="button" className="danger" onClick={onReset}>
            Զրոյացնել
          </button>
        </div>
        {importMessage && <p className={importMessage.ok ? 'ok-text' : 'bad-text'}>{importMessage.text}</p>}
      </div>
    </>
  )
}
