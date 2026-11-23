import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { HeaderAccount } from './components/Account.tsx'
import { ExamIcon, HomeIcon, MoonIcon, ProgressIcon, ShortcutsIcon, SunIcon, TopicsIcon } from './components/Icons.tsx'
import { downloadText, emptyProgress, replaceProgress, useHasActiveExam, useLoadError, type ProgressError } from './lib/progress.ts'
import { link, useRoute } from './lib/router.ts'
import { effectiveTheme, updateSettings, useSettings } from './lib/settings.ts'
import { boot } from './lib/sync.ts'
import { ExamPage, finishExpiredExam } from './pages/Exam.tsx'
import { GroupPage } from './pages/GroupPage.tsx'
import { Home } from './pages/Home.tsx'
import { Practice } from './pages/Practice.tsx'
import { Privacy } from './pages/Privacy.tsx'
import { ProgressPage } from './pages/Progress.tsx'
import { SettingsPage } from './pages/Settings.tsx'
import { Shortcuts } from './pages/Shortcuts.tsx'
import { Topics } from './pages/Topics.tsx'

// The old pool (630 kB of questions) loads only when its page is opened.
const OldQuestions = lazy(() => import('./pages/OldQuestions.tsx'))

const NAV: [string, string, ReactNode][] = [
  ['', 'Գլխավոր', <HomeIcon key="home" />],
  ['topics', 'Թեմաներ', <TopicsIcon key="topics" />],
  ['shortcuts', 'Հնարքներ', <ShortcutsIcon key="shortcuts" />],
  ['exam', 'Քննություն', <ExamIcon key="exam" />],
  ['progress', 'Առաջընթաց', <ProgressIcon key="progress" />],
]

export function App() {
  const route = useRoute()
  const loadError = useLoadError()
  const examRunning = useHasActiveExam()
  const settings = useSettings()
  const theme = effectiveTheme(settings)
  const page = route[0] ?? ''
  const path = route.join('/')
  useEffect(() => {
    void boot()
  }, [])
  useEffect(() => {
    if (!loadError) finishExpiredExam()
  }, [path, loadError])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])
  // While answering, nothing competes with the question: no menu, and the thumb area belongs to "next".
  const focus = page === 'practice' || (page === 'old' && route[1] === 'practice') || (page === 'exam' && route[1] === undefined && examRunning)
  const activeTab = page === 'practice' || page === 'old' ? 'topics' : page
  return (
    <>
      <header>
        <a className="brand" href={link()}>
          Վարորդական<span className="brand-long"> քննություն</span>
        </a>
        {!focus && (
          <nav className="tabbar" aria-label="Գլխավոր ընտրացանկ">
            {NAV.map(([key, label, icon]) => (
              <a key={key} href={link(...(key ? [key] : []))} className={activeTab === key ? 'active' : ''} aria-current={activeTab === key ? 'page' : undefined}>
                {icon}
                {label}
              </a>
            ))}
          </nav>
        )}
        <div className="header-tools">
          <button
            type="button"
            className="icon-btn"
            aria-label={theme === 'dark' ? 'Միացնել բաց թեման' : 'Միացնել մուգ թեման'}
            title={theme === 'dark' ? 'Բաց թեմա' : 'Մուգ թեմա'}
            onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <HeaderAccount />
        </div>
      </header>
      <main className={focus ? 'focus' : ''}>{loadError ? <Recovery error={loadError} /> : <Page route={route} />}</main>
    </>
  )
}

function Page({ route }: { route: string[] }) {
  switch (route[0] ?? '') {
    case '':
      return <Home />
    case 'topics':
      return route[1] ? <GroupPage key={route[1]} group={Number(route[1])} /> : <Topics />
    case 'shortcuts':
      return <Shortcuts />
    case 'practice':
      return <Practice key={route.join('/')} source={route[1] ?? ''} arg={route[2] ?? 'all'} />
    case 'exam':
      return <ExamPage key={route.join('/')} resultId={route[1] === 'result' ? (route[2] ?? null) : null} />
    case 'old':
      return (
        <Suspense fallback={<div className="card muted">Բեռնվում է...</div>}>
          <OldQuestions route={route} />
        </Suspense>
      )
    case 'progress':
      return <ProgressPage />
    case 'settings':
      return <SettingsPage />
    case 'privacy':
      return <Privacy />
    default:
      return (
        <div className="card">
          <p>«{route.join('/')}» էջ չկա։</p>
          <a href={link()}>Գլխավոր էջ</a>
        </div>
      )
  }
}

/** Stored progress could not be read. Never replaced silently: download it first, then reset. */
function Recovery({ error }: { error: ProgressError }) {
  return (
    <div className="card error">
      <h2>Պահված առաջընթացը չհաջողվեց բեռնել</h2>
      <p>{error.message}</p>
      <p>Եթե ուզում եք պահել տվյալները, նախ ներբեռնեք դրանք, հետո սկսեք նորից։</p>
      <div className="actions">
        {error.raw !== null && (
          <button type="button" onClick={() => downloadText(error.raw ?? '', 'armenia-driving-test-progress-broken.json')}>
            Ներբեռնել պահված տվյալները
          </button>
        )}
        <button
          type="button"
          className="danger"
          onClick={() => {
            if (window.confirm('Ջնջե՞լ պահված առաջընթացը և սկսել զրոյից։')) replaceProgress(emptyProgress())
          }}
        >
          Սկսել զրոյից
        </button>
      </div>
    </div>
  )
}
