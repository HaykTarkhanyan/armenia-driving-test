// Fixed settings of the API. The allowed origins are not secrets, so they live in code: changing one means a redeploy.

export const API_VERSION = '1'

/** Browser origins that may call the API. Anything else with an Origin header gets 403. */
export const ALLOWED_ORIGINS: readonly string[] = ['https://hayktarkhanyan.github.io', 'http://localhost:5175', 'http://localhost:4179']

export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin)
}

export const MAX_BODY_BYTES = 1024 * 1024

/** Most items in one POST /v1/sync. The app splits a bigger upload into several batches. */
export const SYNC_LIMITS = { answers: 500, exams: 20 } as const

/** Most rows one account may keep. Sign-up is open through Google, so one account must not be able to fill the free
 * 0.5 GB database. Answering all 2,144 questions ten times is about 21,000 answers. */
export const USER_LIMITS = { answers: 30_000, exams: 300 } as const

/** Read a variable Neon injects into the function. Missing means the service is not set up: fail at start. */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(
      `Environment variable ${name} is not set. Neon injects DATABASE_URL on every branch and ` +
        `NEON_AUTH_BASE_URL / NEON_AUTH_JWKS_URL once "auth: true" in neon.ts is deployed.`,
    )
  }
  return value
}
