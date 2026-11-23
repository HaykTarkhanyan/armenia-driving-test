// Who is calling? Verify the Neon Auth JWT (EdDSA, 15-minute expiry) against the branch's JWKS. Anyone with a Google
// account may use the API, so every query is scoped by the verified user id and each account has row limits (config.ts).
import type { MiddlewareHandler } from 'hono'
import { createRemoteJWKSet, errors, jwtVerify } from 'jose'
import { requireEnv } from './config.ts'
import { HttpError } from './errors.ts'
import type { AppEnv } from './types.ts'

// Issuer and audience are both the origin of the Auth URL (Neon docs, "JWT" plugin page).
const AUTH_ORIGIN = new URL(requireEnv('NEON_AUTH_BASE_URL')).origin
// Built once per isolate: jose caches the keys and refetches only on an unknown key id.
const JWKS = createRemoteJWKSet(new URL(requireEnv('NEON_AUTH_JWKS_URL')))

export async function verifyToken(authorization: string | undefined): Promise<string> {
  if (authorization === undefined || !/^bearer\s+\S/i.test(authorization)) {
    throw new HttpError(401, 'unauthorized', 'Missing "Authorization: Bearer <token>" header.')
  }
  const token = authorization.replace(/^bearer\s+/i, '').trim()
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: AUTH_ORIGIN, audience: AUTH_ORIGIN, algorithms: ['EdDSA'] })
    if (typeof payload.sub !== 'string' || payload.sub === '') {
      throw new HttpError(401, 'unauthorized', 'The token has no "sub" (user id) claim.')
    }
    return payload.sub
  } catch (err) {
    if (err instanceof HttpError) throw err
    // JWTExpired extends JWTClaimValidationFailed, so it must be checked first.
    if (err instanceof errors.JWTExpired) {
      throw new HttpError(401, 'token_expired', 'The token has expired (they last 15 minutes). Get a fresh one and retry.')
    }
    if (err instanceof errors.JWTClaimValidationFailed) {
      throw new HttpError(401, 'unauthorized', `Token claim "${err.claim}" failed validation (${err.reason}).`)
    }
    // The signing keys could not be fetched or read: an outage, not a bad token.
    if (err instanceof errors.JWKSTimeout || err instanceof errors.JWKSInvalid || (err instanceof errors.JOSEError && err.code === 'ERR_JOSE_GENERIC')) {
      throw new HttpError(503, 'auth_unavailable', `Could not load the Neon Auth signing keys: ${err.message}`)
    }
    if (err instanceof errors.JOSEError) {
      throw new HttpError(401, 'unauthorized', `Invalid token (${err.code}): ${err.message}`)
    }
    throw err
  }
}

/** Route middleware: a verified token, else 401. Sets c.var.userId. */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('userId', await verifyToken(c.req.header('authorization')))
  await next()
}
