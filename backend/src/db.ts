// One small pg pool per isolate, created at module scope (Neon Functions reuse an isolate across requests).
// DATABASE_URL is the pooled connection string Neon injects.
import { attachDatabasePool } from '@neon/functions'
import { Pool } from 'pg'
import type { PoolClient } from 'pg'
import { requireEnv } from './config.ts'

export const pool = new Pool({ connectionString: requireEnv('DATABASE_URL'), max: 3 })
// Idle disconnects (scale to zero, pooler reclaim) would otherwise be an uncaughtException.
attachDatabasePool(pool)

/** Run fn inside one transaction on one pooled connection. Any error rolls back and is rethrown. */
export async function withTransaction<T>(begin: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  let broken: Error | undefined
  try {
    await client.query(begin)
    const out = await fn(client)
    await client.query('COMMIT')
    return out
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackErr) {
      // The connection is in an unknown state: drop it instead of returning it to the pool.
      broken = rollbackErr as Error
      console.error(JSON.stringify({ level: 'error', message: 'ROLLBACK failed', error: String(rollbackErr) }))
    }
    throw err
  } finally {
    client.release(broken)
  }
}
