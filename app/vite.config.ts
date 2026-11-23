/// <reference types="vitest/config" />
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const appDir = path.dirname(fileURLToPath(import.meta.url))
// Questions and pictures live in ../data (built by scripts/build_dataset.py and build_old_pool.py).
const dataDir = path.resolve(appDir, '..', 'data')

/** The edition of the pool = the date of the newest official PDF. Saved progress is tied to it, because the site
 * renumbered 181 questions between two editions (results/edition_diff_2026-11-06.json). */
function edition(): string {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(appDir, '..', 'official', 'manifest.json'), 'utf8')) as Record<
    string,
    { version_utc: string }
  >
  const dates = Object.entries(manifest)
    .filter(([name]) => name.startsWith('abc_hy_'))
    .map(([, file]) => file.version_utc.slice(0, 10))
    .sort()
  const newest = dates.at(-1)
  if (dates.length !== 10 || newest === undefined) throw new Error(`official/manifest.json lists ${dates.length} Armenian PDFs, expected 10`)
  return newest
}

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the site at /armenia-driving-test/; the dev server serves it at /.
  base: command === 'serve' && !isPreview ? '/' : '/armenia-driving-test/',
  plugins: [react()],
  define: { __EDITION__: JSON.stringify(edition()) },
  server: {
    port: 5175,
    strictPort: true,
    fs: { allow: [appDir, dataDir] },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
}))
