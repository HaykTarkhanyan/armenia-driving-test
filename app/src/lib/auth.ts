// Sign-in with Google through Neon Auth (Managed Better Auth) and the official @neondatabase/auth client, as in the
// nemeceren app. The session is a 7-day cookie on the auth host; the API needs a short-lived JWT (15 minutes), which the
// SDK takes from the `set-auth-jwt` header of /get-session and puts into `session.token`. After Google's redirect the
// first getSession() finishes the sign-in (it exchanges the `neon_auth_session_verifier` URL parameter and removes it).
// The SDK is about 80 KB gzipped, so it is loaded as its own chunk on first use.
import type { VanillaBetterAuthClient } from '@neondatabase/auth'
import { AUTH_URL } from './config.ts'

let client: Promise<VanillaBetterAuthClient> | null = null

function auth(): Promise<VanillaBetterAuthClient> {
  if (client === null) {
    client = Promise.all([import('@neondatabase/auth'), import('@neondatabase/auth/vanilla/adapters')]).then(([sdk, adapters]) =>
      sdk.createAuthClient(AUTH_URL, { adapter: adapters.BetterAuthVanillaAdapter() }),
    )
    // A failed download (offline) must not stick: the next call tries again.
    client.catch(() => {
      client = null
    })
  }
  return client
}

export type AuthUser = { id: string; email: string; name: string }

/** A failed auth call. `network`: the request never reached the server (offline, DNS, CORS). */
export class AuthFailure extends Error {
  readonly network: boolean
  constructor(message: string, network: boolean) {
    super(message)
    this.name = 'AuthFailure'
    this.network = network
  }
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && /failed to fetch|networkerror|load failed|fetch failed|dynamically imported/i.test(err.message))
}

function toFailure(what: string, err: unknown): AuthFailure {
  if (err instanceof AuthFailure) return err
  if (isNetworkError(err)) return new AuthFailure(`${what}. մուտքի սերվերին չհաջողվեց միանալ (ինտերնե՞տը)`, true)
  const e = (err ?? {}) as { message?: string; statusText?: string }
  return new AuthFailure(`${what}. ${e.message || e.statusText || String(err)}`, false)
}

async function call(what: string, run: () => Promise<unknown>): Promise<unknown> {
  let res: { data?: unknown; error?: unknown }
  try {
    res = (await run()) as { data?: unknown; error?: unknown }
  } catch (err) {
    throw toFailure(what, err)
  }
  if (res.error) throw toFailure(what, res.error)
  return res.data ?? null
}

/** The signed-in user, or null when signed out. */
export async function currentUser(): Promise<AuthUser | null> {
  const what = 'Մուտքի ստուգում'
  const data = (await call(what, async () => (await auth()).getSession())) as { user?: { id?: unknown; email?: unknown; name?: unknown } } | null
  const user = data?.user
  if (!user) return null
  if (typeof user.id !== 'string' || typeof user.email !== 'string') throw new AuthFailure(`${what}. սերվերը պատասխանեց առանց օգտատիրոջ`, false)
  return { id: user.id, email: user.email, name: typeof user.name === 'string' ? user.name : user.email }
}

/** Leaves the page for Google; the browser comes back to the app's start page. */
export async function signInWithGoogle(): Promise<void> {
  const callbackURL = new URL(import.meta.env.BASE_URL, window.location.origin).href
  await call('Google-ով մուտք', async () => (await auth()).signIn.social({ provider: 'google', callbackURL }))
}

export async function signOut(): Promise<void> {
  lastToken = null
  await call('Դուրս գալ', async () => (await auth()).signOut())
}

/** Seconds since epoch of the JWT's "exp" claim, or null if it cannot be read. */
export function jwtExpiry(token: string): number | null {
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')))
    return typeof json.exp === 'number' ? json.exp : null
  } catch {
    return null
  }
}

/** The user id a JWT belongs to, or null if it cannot be read. */
export function jwtSubject(token: string): string | null {
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')))
    return typeof json.sub === 'string' ? json.sub : null
  } catch {
    return null
  }
}

let lastToken: string | null = null

/** A JWT for the API, from getSession(), whose reply the SDK caches until 10 s before the JWT expires. Not `token()`:
 * in 0.5.0-beta it answers from the same cache with { session, user } instead of { token } (nemeceren DECISIONS.md #40).
 * `fresh` is for a retry after the API said "token_expired". */
export async function getToken(opts: { fresh?: boolean } = {}): Promise<string> {
  const what = 'Սերվերի բանալու ստացում'
  const data = await call(what, async () => (await auth()).getSession())
  const token = (data as { session?: { token?: unknown } } | null)?.session?.token
  if (typeof token !== 'string' || token === '') throw new AuthFailure(`${what}. մուտք գործած չես, կամ բրաուզերն արգելափակել է մուտքի cookie-ն`, false)
  if (jwtExpiry(token) === null) throw new AuthFailure(`${what}. սերվերը բանալի չուղարկեց`, false)
  if (opts.fresh && token === lastToken) {
    throw new AuthFailure(`${what}. սերվերն ասում է, որ բանալին ժամկետանց է։ Ստուգիր, որ սարքի ժամն ու ամսաթիվը ճիշտ են, հետո թարմացրու էջը։`, false)
  }
  lastToken = token
  return token
}
