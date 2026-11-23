// Progress API of the Armenian driving test app: a Hono app deployed as the Neon Function "api" (see ../neon.ts).
//   GET    /v1/health            no auth, no database (does not wake the compute)
//   GET    /v1/state?edition=    auth: this user's answers and exams for one edition of the question pool
//   POST   /v1/sync              auth: one batched, idempotent upload of answers and exams
//   DELETE /v1/progress          auth: removes all of this user's progress ("Reset" in the app)
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { DatabaseError } from 'pg'
import { requireUser } from './auth.ts'
import { ALLOWED_ORIGINS, API_VERSION, isAllowedOrigin, MAX_BODY_BYTES } from './config.ts'
import { errorResponse, HttpError, zodDetails } from './errors.ts'
import { applySync, deleteProgress, loadState } from './progress.ts'
import { Edition, SyncBody } from './schema.ts'
import type { AppEnv } from './types.ts'

const app = new Hono<AppEnv>()

// Request id, no caching of private data, and one log line per request. Tokens and bodies are never logged.
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID()
  c.set('requestId', requestId)
  const started = Date.now()
  await next()
  c.header('x-request-id', requestId)
  c.header('Cache-Control', 'no-store')
  console.log(
    JSON.stringify({
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms: Date.now() - started,
      user: c.get('userId') ?? null,
      error: c.get('errorCode') ?? null,
    }),
  )
})

// Browsers may call only from the app's origins. Requests without an Origin header continue to the token check.
app.use('*', async (c, next) => {
  const origin = c.req.header('origin')
  if (origin !== undefined && !isAllowedOrigin(origin)) {
    throw new HttpError(403, 'forbidden_origin', `Origin ${origin} is not allowed. Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`)
  }
  await next()
})

app.use(
  '*',
  cors({
    origin: [...ALLOWED_ORIGINS],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['authorization', 'content-type'],
    exposeHeaders: ['x-request-id'],
    maxAge: 7200,
  }),
)

app.use('*', compress())

app.get('/v1/health', (c) => c.json({ ok: true, service: 'armenia-driving-test-api', apiVersion: API_VERSION, time: new Date().toISOString() }))

app.get('/v1/state', requireUser, async (c) => {
  const edition = Edition.safeParse(c.req.query('edition'))
  if (!edition.success) throw new HttpError(400, 'invalid_query', '"edition" must be a date like 2026-11-06.')
  return c.json(await loadState(c.get('userId'), edition.data))
})

app.post(
  '/v1/sync',
  requireUser,
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => errorResponse(c, new HttpError(413, 'payload_too_large', `The sync body is larger than ${MAX_BODY_BYTES} bytes. Split it into smaller batches.`)),
  }),
  async (c) => {
    const type = c.req.header('content-type') ?? ''
    if (!type.toLowerCase().startsWith('application/json')) {
      throw new HttpError(415, 'unsupported_media_type', 'Send the body as JSON with "Content-Type: application/json".')
    }
    let json: unknown
    try {
      json = await c.req.json()
    } catch (err) {
      throw new HttpError(400, 'invalid_json', `The body is not valid JSON: ${(err as Error).message}`)
    }
    const parsed = SyncBody.safeParse(json)
    if (!parsed.success) throw new HttpError(400, 'invalid_body', 'The sync batch failed validation; nothing was saved.', zodDetails(parsed.error))
    if (parsed.data.answers.length === 0 && parsed.data.exams.length === 0) throw new HttpError(400, 'empty_batch', 'Nothing to sync.')
    return c.json(await applySync(c.get('userId'), parsed.data))
  },
)

app.delete('/v1/progress', requireUser, async (c) => c.json(await deleteProgress(c.get('userId'))))

app.notFound((c) => errorResponse(c, new HttpError(404, 'not_found', `No route for ${c.req.method} ${c.req.path}.`)))

app.onError((err, c) => {
  if (err instanceof HttpError) return errorResponse(c, err)
  // 22xxx data exceptions and 23xxx constraint violations: bad input that got past validation.
  if (err instanceof DatabaseError && typeof err.code === 'string' && /^2[23]/.test(err.code)) {
    return errorResponse(c, new HttpError(400, 'invalid_data', `The database rejected the data: ${err.message}`))
  }
  const requestId = c.get('requestId')
  console.error(JSON.stringify({ level: 'error', requestId, message: err.message, stack: err.stack }))
  return errorResponse(c, new HttpError(500, 'internal', `Internal error. Find request ${requestId} in the function logs.`))
})

export default app
