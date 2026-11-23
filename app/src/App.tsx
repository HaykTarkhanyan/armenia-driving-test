import { lazy, Suspense, useEffect, useRef } from 'react'
import { downloadText, emptyProgress, replaceProgress, useLoadError, type ProgressError } from './lib/progress.ts'
import { link, useRoute } from './lib/router.ts'
import { boot } from './lib/sync.ts'
import { HeaderAccount } from './components/Account.tsx'
import { ExamPage, finishExpiredExam } from './pages/Exam.tsx'
import { Home } from './pages/Home.tsx'
import { Practice } from './pages/Practice.tsx'
import { ProgressPage } from './pages/Progress.tsx'
import { Topics } from './pages/Topics.tsx'

// The old pool (630 kB of questions) loads only when its page is opened.
const OldQuestions = lazy(() => import('./pages/OldQuestions.tsx'))

const NAV: [string, string][] = [
  ['', 'Գլխավոր'],
  ['topics', 'Թեմաներ'],
  ['exam', 'Քննություն'],
  ['old', 'Հին հարցեր'],
  ['progress', 'Առաջընթաց'],
]

export function App() {
  const route = useRoute()
  const loadError = useLoadError()
  const page = route[0] ?? ''
  const path = route.join('/')
  useEffect(() => {
    void boot()
  }, [])
  useEffect(() => {
    if (!loadError) finishExpiredExam()
  }, [path, loadError])
  // On a phone the menu is one row that scrolls sideways: keep the current page's item in view.
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('a.active')
    if (nav && active) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2
  }, [page])
  return (
    <>
      <header>
        <a className="brand" href={link()}>
          Վարորդական քննություն
        </a>
        <HeaderAccount />
        <nav ref={navRef}>
          {NAV.map(([key, label]) => (
            <a key={key} href={link(...(key ? [key] : []))} className={page === key || (key === 'topics' && page === 'practice') ? 'active' : ''}>
              {label}
            </a>
          ))}
        </nav>
      </header>
      <main>{loadError ? <Recovery error={loadError} /> : <Page route={route} />}</main>
    </>
  )
}

function Page({ route }: { route: string[] }) {
  switch (route[0] ?? '') {
    case '':
      return <Home />
    case 'topics':
      return <Topics />
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
      <p>Եթե ուզում ես պահել տվյալները, նախ ներբեռնիր դրանք, հետո սկսիր նորից։</p>
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
