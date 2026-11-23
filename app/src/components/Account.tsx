import { useState } from 'react'
import { downloadText, exportFileName, useProgress } from '../lib/progress.ts'
import { link } from '../lib/router.ts'
import { deleteAccountNow, flush, signOutNow, startGoogleSignIn, useSyncState } from '../lib/sync.ts'

export function GoogleButton({ primary = true }: { primary?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <button
        type="button"
        className={primary ? 'primary' : ''}
        disabled={busy}
        onClick={() => {
          setBusy(true)
          setError(null)
          // On success the browser leaves for Google, so `busy` is only cleared on failure.
          startGoogleSignIn().catch((err: unknown) => {
            setError(err instanceof Error ? err.message : String(err))
            setBusy(false)
          })
        }}
      >
        {busy ? 'Սպասիր...' : 'Մուտք Google-ով'}
      </button>
      {error && <p className="bad-text small">{error}</p>}
    </>
  )
}

/** Said where the data is about to be collected, not only on a page nobody opens. */
function SignInNote() {
  return (
    <p className="muted small" style={{ margin: '8px 0 0' }}>
      Մուտք գործելիս պահվում են քո անունը, էլ. հասցեն և առաջընթացը։ <a href={link('privacy')}>Մանրամասն</a>
    </p>
  )
}

/** Irreversible, so it takes a second, explicit step and offers a copy first. */
function DeleteAccount() {
  const progress = useProgress()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!open) {
    return (
      <button type="button" className="linklike delete-link" onClick={() => setOpen(true)}>
        Ջնջել հաշիվը
      </button>
    )
  }
  return (
    <div className="danger-box" role="group" aria-label="Հաշվի ջնջում">
      <b>Ջնջե՞լ հաշիվը</b>
      <p>
        Կջնջվեն քո մուտքը, անունը, էլ. հասցեն և ամբողջ առաջընթացը՝ {progress.answers.length} պատասխան և {progress.exams.length} քննություն։ Սա հնարավոր չէ հետ շրջել։
      </p>
      <div className="actions">
        <button type="button" onClick={() => downloadText(JSON.stringify(progress), exportFileName())}>
          Նախ արտահանել
        </button>
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            setError(null)
            deleteAccountNow().catch((err: unknown) => {
              setError(err instanceof Error ? err.message : String(err))
              setBusy(false)
            })
          }}
        >
          {busy ? 'Ջնջվում է...' : 'Այո, ջնջել հաշիվը'}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)}>
          Չեղարկել
        </button>
      </div>
      {error && <p className="bad-text small">{error}</p>}
    </div>
  )
}

/** Small link in the header: who is signed in, or "sign in". */
export function HeaderAccount() {
  const { account, phase } = useSyncState()
  if (phase === 'checking') return null
  const dot = phase === 'error' ? 'bad' : phase === 'offline' || phase === 'saving' ? 'wait' : 'ok'
  return (
    <a className="account-link" href={link('settings')} aria-label="Հաշիվ և կարգավորումներ">
      {account ? (
        <>
          <span className={`sync-dot ${dot}`} aria-hidden="true" />
          {account.name.split(' ')[0] || 'Հաշիվ'}
        </>
      ) : (
        'Մուտք'
      )}
    </a>
  )
}

/** Invitation on the home page, only for someone without an account. */
export function SignInCard() {
  const { phase } = useSyncState()
  if (phase !== 'guest') return null
  return (
    <div className="card">
      <h2>Պահիր առաջընթացդ</h2>
      <p>Մուտք գործիր Google հաշվով, և առաջընթացդ կպահվի բոլոր սարքերում։ Այս սարքում արդեն արածդ նույնպես կտեղափոխվի հաշվիդ մեջ։</p>
      <GoogleButton />
      <SignInNote />
    </div>
  )
}

/** The account card on the progress page. */
export function AccountCard() {
  const sync = useSyncState()
  const progress = useProgress()
  const [error, setError] = useState<string | null>(null)
  const left = progress.pending.answers.length + progress.pending.exams.length
  if (sync.phase === 'checking') return null
  if (sync.account === null) {
    return (
      <div className="card">
        <h2>Հաշիվ</h2>
        {sync.message && <p className={sync.phase === 'error' ? 'bad-text' : 'ok-text'}>{sync.message}</p>}
        <p className="muted">Առանց հաշվի առաջընթացը պահվում է միայն այս սարքում։ Մուտք գործիր, որ այն հասանելի լինի բոլոր սարքերում։</p>
        <GoogleButton />
        <SignInNote />
      </div>
    )
  }
  const status =
    sync.phase === 'saving'
      ? 'Պահվում է...'
      : sync.phase === 'offline'
        ? `Ինտերնետ չկա. ${left} գրառում կուղարկվի, երբ կապը վերականգնվի։`
        : left > 0
          ? `${left} գրառում սպասում է ուղարկման։`
          : 'Ամբողջ առաջընթացը պահված է։'
  return (
    <div className="card">
      <h2>Հաշիվ</h2>
      {sync.account.email && (
        <p>
          Մուտք է գործված՝ <b>{sync.account.email}</b>
        </p>
      )}
      <p className={sync.phase === 'error' ? 'bad-text' : 'muted'}>{sync.phase === 'error' ? sync.message : status}</p>
      {sync.otherEditionAnswers > 0 && (
        <p className="muted small">Հարցաշարի նախորդ տարբերակի {sync.otherEditionAnswers} պատասխանը պահված է, բայց այստեղ ցույց չի տրվում։</p>
      )}
      <div className="actions">
        {left > 0 && (
          <button type="button" onClick={() => void flush()}>
            Պահել հիմա
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setError(null)
            signOutNow().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
          }}
        >
          Դուրս գալ
        </button>
      </div>
      {error && <p className="bad-text small">{error}</p>}
      <div style={{ marginTop: 14 }}>
        <DeleteAccount />
      </div>
    </div>
  )
}
