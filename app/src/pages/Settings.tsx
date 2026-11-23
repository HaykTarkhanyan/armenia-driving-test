import { useState, type ChangeEvent, type ReactNode } from 'react'
import { AccountCard } from '../components/Account.tsx'
import { Chevron } from '../components/Icons.tsx'
import { installApp, useCanInstall } from '../lib/install.ts'
import { downloadText, exportFileName, mergeLocal, parseProgress, ProgressError, updateProgress, useProgress } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { DAILY_GOALS, settingsProblem, updateSettings, useSettings } from '../lib/settings.ts'
import { resetProgress, useSyncState } from '../lib/sync.ts'

function Choice<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, ReactNode][]; onChange: (v: T) => void }) {
  return (
    <div className="setting">
      <span id={`set-${label}`}>{label}</span>
      <div className="segmented" role="radiogroup" aria-labelledby={`set-${label}`}>
        {options.map(([v, text]) => (
          <button key={String(v)} type="button" role="radio" aria-checked={v === value} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SettingsPage() {
  const settings = useSettings()
  const progress = useProgress()
  const sync = useSyncState()
  const canInstall = useCanInstall()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const problem = settingsProblem()

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    let incoming
    try {
      incoming = parseProgress(await file.text(), `«${file.name}»`)
    } catch (err) {
      if (!(err instanceof ProgressError)) throw err
      setMessage({ ok: false, text: err.message })
      return
    }
    const question = `Ավելացնե՞լ «${file.name}» ֆայլի ${incoming.answers.length} պատասխանը և ${incoming.exams.length} քննությունը ձեր առաջընթացին։`
    if (!window.confirm(question)) return
    updateProgress((p) => mergeLocal(p, incoming))
    setMessage({ ok: true, text: `«${file.name}» ֆայլը ներմուծվեց։` })
  }

  function onReset() {
    const where = sync.account ? 'ձեր հաշվի' : 'այս բրաուզերի'
    if (!window.confirm(`Ջնջե՞լ ${where} ամբողջ առաջընթացը (${progress.answers.length} պատասխան, ${progress.exams.length} քննություն)։`)) return
    setMessage(null)
    resetProgress().catch((err: unknown) => setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) }))
  }

  return (
    <>
      <h1 style={{ margin: '4px 2px 10px' }}>Կարգավորումներ</h1>
      {problem && <div className="card notice">{problem}</div>}
      <AccountCard />
      <section className="card">
        <h2>Տեսք</h2>
        <Choice
          label="Թեմա"
          value={settings.theme}
          options={[
            ['light', 'Բաց'],
            ['dark', 'Մուգ'],
            ['auto', 'Ըստ սարքի'],
          ]}
          onChange={(theme) => updateSettings({ theme })}
        />
        <Choice
          label="Տառաչափ"
          value={settings.textSize}
          options={[
            ['normal', 'Սովորական'],
            ['large', 'Մեծ'],
          ]}
          onChange={(textSize) => updateSettings({ textSize })}
        />
      </section>
      <section className="card">
        <h2>Օրական նպատակ</h2>
        <Choice label="Հարց օրական" value={settings.dailyGoal} options={DAILY_GOALS.map((g) => [g, String(g)])} onChange={(dailyGoal) => updateSettings({ dailyGoal })} />
      </section>
      {canInstall && (
        <section className="card">
          <h2>Հավելված</h2>
          <p className="muted">Տեղադրեք հեռախոսում, որ բացվի առանձին պատուհանով՝ առանց բրաուզերի։</p>
          <button type="button" className="primary" onClick={() => installApp().catch((err: unknown) => setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) }))}>
            Տեղադրել
          </button>
        </section>
      )}
      <section className="card">
        <h2>Ձեր տվյալները</h2>
        <p className="muted">
          {progress.answers.length} պատասխան, {progress.exams.length} քննություն։ Կարող եք արտահանել դրանք ֆայլով՝ որպես պատճեն, և ներմուծել այլ սարքում։
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
        {message && <p className={message.ok ? 'ok-text' : 'bad-text'}>{message.text}</p>}
      </section>
      <a className="row-link" href={link('privacy')}>
        <div>
          <b>Գաղտնիություն</b>
          <small>Ինչ է պահվում, որտեղ և ինչպես ջնջել</small>
        </div>
        <Chevron />
      </a>
    </>
  )
}
