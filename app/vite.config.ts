/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const appDir = path.dirname(fileURLToPath(import.meta.url))
// Questions and pictures live in ../data (built by scripts/build_dataset.py and build_old_pool.py).
const dataDir = path.resolve(appDir, '..', 'data')

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the site at /armenia-driving-test/; the dev server serves it at /.
  base: command === 'serve' && !isPreview ? '/' : '/armenia-driving-test/',
  plugins: [react()],
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
