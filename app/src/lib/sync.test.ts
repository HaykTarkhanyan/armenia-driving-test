// Regression tests for the account and sync bugs found in the 2026-11-23 review, against a fake server. No network.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Answer, ExamResult } from './progress.ts'

vi.setConfig({ testTimeout: 60_000 }) // every test loads the whole question pool again

const A = 'aaaaaaaa-0000-4000-8000-00000000000a'
const B = 'bbbbbbbb-0000-4000-8000-00000000000b'
const LAST_USER = 'armenia-driving-test.last-user'
const docKey = (user: string) => `armenia-driving-test.progress.v2.user.${user}`

class MemoryStorage {
  private items = new Map<string, string>()
  getItem(k: string) {
    return this.items.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.items.set(k, String(v))
  }
  removeItem(k: string) {
    this.items.delete(k)
  }
}

const jwt = (sub: string) => `h.${btoa(JSON.stringify({ sub, exp: 4102444800 })).replace(/=+$/, '')}.s`
const subOf = (auth: string) => (JSON.parse(atob(auth.replace('Bearer ', '').split('.')[1])) as { sub: string }).sub
const row = (qid: string, at = '2026-11-20T10:00:00.000Z'): Answer => ({ id: crypto.randomUUID(), qid, chosen: 0, correct: true, at, mode: 'practice' })
const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), { status })

class FakeServer {
  answers: Answer[] = []
  exams: ExamResult[] = []
  generation = 0
  resetAt: string | null = null
  calls: { method: string; path: string; sub: string }[] = []
  /** Holds back the reply to /v1/state, after its rows were read. */
  gate: Promise<void> | null = null
  loseNextDeleteReply = false
  gone = false

  async handle(url: string, init: RequestInit): Promise<Response> {
    const path = new URL(url).pathname
    const method = init.method ?? 'GET'
    this.calls.push({ method, path, sub: subOf((init.headers as Record<string, string>).Authorization) })
    if (this.gone) return reply(410, { error: { code: 'account_deleted', message: 'deleted' } })
    if (path === '/v1/state') {
      const snapshot = { edition: '2026-11-06', generation: this.generation, resetAt: this.resetAt, answers: [...this.answers], exams: [...this.exams], older: { answers: [], exams: [] }, otherEditionAnswers: 0 }
      if (this.gate) await this.gate
      return reply(200, snapshot)
    }
    if (path === '/v1/sync') {
      const body = JSON.parse(String(init.body)) as { generation: number; answers: Answer[]; exams: ExamResult[] }
      if (body.generation !== this.generation) return reply(409, { error: { code: 'progress_reset', message: 'reset' } })
      if (body.exams.some((e) => e.finishedAt < e.startedAt)) return reply(400, { error: { code: 'invalid_body', message: 'bad exam' } })
      this.answers.push(...body.answers)
      this.exams.push(...body.exams)
      return reply(200, { ok: true })
    }
    if (path === '/v1/progress') {
      this.answers = []
      this.exams = []
      this.generation += 1
      this.resetAt = new Date().toISOString()
      return reply(200, { ok: true, generation: this.generation, resetAt: this.resetAt })
    }
    if (path === '/v1/account') {
      this.gone = true
      if (this.loseNextDeleteReply) throw new TypeError('Failed to fetch')
      return reply(200, { ok: true })
    }
    return reply(404, {})
  }
}

let reload = vi.fn()
let confirm = vi.fn(() => true)

function newDevice(): void {
  vi.stubGlobal('localStorage', new MemoryStorage())
}

async function start(server: FakeServer, signedIn: string | null, tokenUser: () => string = () => signedIn ?? A) {
  vi.resetModules()
  const currentUser = vi.fn(async () => (signedIn ? { id: signedIn, email: `${signedIn}@example.com`, name: 'Test' } : null))
  vi.doMock('./auth.ts', async () => {
    const actual = await vi.importActual<typeof import('./auth.ts')>('./auth.ts')
    return { ...actual, currentUser, getToken: async () => jwt(tokenUser()), signInWithGoogle: async () => {}, signOut: async () => {} }
  })
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => server.handle(url, init ?? {}))
  const progress = await import('./progress.ts')
  const sync = await import('./sync.ts')
  return { progress, sync, currentUser }
}

beforeEach(() => {
  newDevice()
  reload = vi.fn()
  confirm = vi.fn(() => true)
  vi.stubGlobal('window', { addEventListener: () => {}, setTimeout: () => 1, clearTimeout: () => {}, confirm: () => confirm(), location: { search: '', reload } })
  vi.stubGlobal('document', { addEventListener: () => {}, visibilityState: 'visible' })
})

describe('the token must belong to the account on screen', () => {
  it('sends nothing and reloads when another tab signed in as someone else', async () => {
    let tokenUser = A
    const server = new FakeServer()
    localStorage.setItem(LAST_USER, A)
    const { progress, sync } = await start(server, A, () => tokenUser)
    await sync.boot()
    progress.recordAnswer('1-1', 0, true, 'practice')
    tokenUser = B
    await sync.flush()
    await expect(sync.resetProgress()).rejects.toThrow()
    await expect(sync.deleteAccountNow()).rejects.toThrow()
    expect(server.calls.filter((c) => c.sub === B)).toEqual([])
    expect(server.answers).toEqual([])
    expect(progress.getProgress().pending.answers).toHaveLength(1)
    expect(reload).toHaveBeenCalled()
  })
})

describe('reset lasts', () => {
  it('another device does not upload its old rows back', async () => {
    const server = new FakeServer()
    const old = [row('1-1'), row('1-2'), row('1-3')]
    server.answers = [...old]

    const laptop = new MemoryStorage()
    vi.stubGlobal('localStorage', laptop)
    localStorage.setItem(LAST_USER, A)
    const first = await start(server, A)
    await first.sync.boot()
    expect(first.progress.getProgress().answers).toHaveLength(3)

    newDevice() // the phone
    localStorage.setItem(LAST_USER, A)
    const phone = await start(server, A)
    await phone.sync.boot()
    await phone.sync.resetProgress()
    expect(server.answers).toEqual([])

    vi.stubGlobal('localStorage', laptop)
    const again = await start(server, A)
    await again.sync.boot()
    expect(server.answers).toEqual([])
    expect(again.progress.getProgress().answers).toEqual([])
  })

  it('a device that was open during the reset keeps only what it did afterwards', async () => {
    const server = new FakeServer()
    server.answers = [row('1-1')]
    localStorage.setItem(LAST_USER, A)
    const { progress, sync } = await start(server, A)
    await sync.boot()
    server.answers = []
    server.generation = 1
    server.resetAt = '2026-11-21T00:00:00.000Z'
    progress.recordAnswer('2-1', 0, true, 'practice') // now, so after the reset
    await sync.flush()
    expect(server.answers.map((a) => a.qid)).toEqual(['2-1'])
    expect(progress.getProgress().answers.map((a) => a.qid)).toEqual(['2-1'])
    expect(progress.getProgress().generation).toBe(1)
  })

  it('a reset during a slow first load is not undone by that load', async () => {
    const server = new FakeServer()
    server.answers = [row('1-1'), row('1-2')]
    let release = () => {}
    server.gate = new Promise<void>((r) => {
      release = r
    })
    localStorage.setItem(LAST_USER, A)
    const { progress, sync } = await start(server, A)
    const booting = sync.boot()
    while (!server.calls.some((c) => c.path === '/v1/state')) await new Promise((r) => setTimeout(r, 1))
    await sync.resetProgress()
    server.gate = null
    release()
    await booting
    expect(progress.getProgress().answers).toEqual([])
    expect(server.answers).toEqual([])
  })

  it('what was done as a guest survives a reset made earlier on another device', async () => {
    const server = new FakeServer()
    server.generation = 2
    server.resetAt = '2026-11-22T00:00:00.000Z'
    const guest = row('3-1', '2026-11-21T00:00:00.000Z')
    const { emptyProgress, GUEST_KEY } = await import('./progress.ts')
    localStorage.setItem(GUEST_KEY, JSON.stringify({ ...emptyProgress(), answers: [guest], pending: { answers: [guest.id], exams: [] } }))
    localStorage.setItem('armenia-driving-test.signing-in', '1')
    const { sync } = await start(server, A)
    await sync.boot()
    expect(server.answers.map((a) => a.id)).toEqual([guest.id])
  })
})

describe('one bad row does not block the rest', () => {
  it('uploads everything else and keeps the refused exam on the device', async () => {
    const server = new FakeServer()
    localStorage.setItem(LAST_USER, A)
    const { progress, sync } = await start(server, A)
    await sync.boot()
    const { newExam } = await import('./examFlow.ts')
    const bad: ExamResult = { ...newExam(2_000_000), finishedAt: 1_999_000, score: 0, passed: false, timedOut: false }
    progress.addFinishedExam(bad, [])
    for (let i = 1; i <= 5; i++) progress.recordAnswer(`1-${i}`, 0, true, 'practice')
    await sync.flush()
    expect(server.answers).toHaveLength(5)
    expect(progress.getProgress().pending.answers).toEqual([])
    expect(progress.getProgress().pending.exams).toEqual([bad.id])
    progress.recordAnswer('1-6', 0, true, 'practice')
    await sync.flush()
    expect(server.answers).toHaveLength(6)
  })

  it('an exam can no longer end before it started', async () => {
    const { finishExam, newExam } = await import('./examFlow.ts')
    const { result } = finishExam(newExam(2_000_000), 1_999_000, false)
    expect(result.finishedAt).toBe(result.startedAt)
  })
})

describe('sign-in states', () => {
  it('an expired sign-in keeps the progress on screen', async () => {
    const { emptyProgress } = await import('./progress.ts')
    const answers = [row('4-1'), row('4-2')]
    localStorage.setItem(LAST_USER, A)
    localStorage.setItem(docKey(A), JSON.stringify({ ...emptyProgress(), answers }))
    const { progress, sync } = await start(new FakeServer(), null)
    await sync.boot()
    expect(sync.getSyncState().phase).toBe('expired')
    expect(progress.getProgress().answers).toHaveLength(2)
    expect(localStorage.getItem(LAST_USER)).toBe(A)
  })

  it('a person who never signed in does not contact the sign-in service', async () => {
    const server = new FakeServer()
    const { sync, currentUser } = await start(server, null)
    await sync.boot()
    expect(currentUser).not.toHaveBeenCalled()
    expect(server.calls).toEqual([])
    expect(sync.getSyncState().phase).toBe('guest')
  })

  it('coming back from Google does ask who signed in', async () => {
    localStorage.setItem('armenia-driving-test.signing-in', '1')
    const { sync, currentUser } = await start(new FakeServer(), A)
    await sync.boot()
    expect(currentUser).toHaveBeenCalledOnce()
    expect(localStorage.getItem('armenia-driving-test.signing-in')).toBeNull()
  })
})

describe('leaving an account', () => {
  it('a delete whose reply was lost still clears this device on the retry', async () => {
    const server = new FakeServer()
    server.answers = [row('1-1')]
    server.loseNextDeleteReply = true
    localStorage.setItem(LAST_USER, A)
    const { sync } = await start(server, A)
    await sync.boot()
    await expect(sync.deleteAccountNow()).rejects.toThrow()
    await sync.deleteAccountNow()
    expect(localStorage.getItem(docKey(A))).toBeNull()
    expect(sync.getSyncState().phase).toBe('guest')
  })

  it('signing out during an exam asks first, and keeps the exam', async () => {
    localStorage.setItem(LAST_USER, A)
    const { progress, sync } = await start(new FakeServer(), A)
    await sync.boot()
    const { newExam } = await import('./examFlow.ts')
    progress.updateProgress((p) => ({ ...p, activeExam: newExam() }))
    confirm.mockReturnValueOnce(false)
    await sync.signOutNow()
    expect(sync.getSyncState().phase).not.toBe('guest')
    await sync.signOutNow()
    expect(confirm).toHaveBeenCalledTimes(2)
    expect((JSON.parse(localStorage.getItem(docKey(A)) as string) as { activeExam: unknown }).activeExam).not.toBeNull()
  })
})
