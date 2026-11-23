// Preferences of this device: theme, text size, daily goal. They are not progress and are not synced.
import { useSyncExternalStore } from 'react'
import { z } from 'zod'

const KEY = 'armenia-driving-test.settings.v1'

const SettingsSchema = z.strictObject({
  theme: z.enum(['auto', 'light', 'dark']),
  textSize: z.enum(['normal', 'large']),
  dailyGoal: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)]),
  installDismissed: z.boolean(),
})
export type Settings = z.infer<typeof SettingsSchema>

const DEFAULTS: Settings = { theme: 'auto', textSize: 'normal', dailyGoal: 20, installDismissed: false }
export const DAILY_GOALS = [10, 20, 30, 50] as const

let current: Settings | null = null
/** Set when stored preferences could not be read; the settings page says so. */
let problem: string | null = null
const listeners = new Set<() => void>()

function load(): Settings {
  if (current !== null) return current
  const raw = localStorage.getItem(KEY)
  if (raw === null) {
    current = DEFAULTS
    return current
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    parsed = err
  }
  const result = SettingsSchema.safeParse(parsed)
  if (result.success) {
    current = result.data
  } else {
    console.error(`Stored settings are invalid and were reset: ${raw}`)
    problem = 'Պահված կարգավորումները չհաջողվեց կարդալ, ուստի վերականգնվել են սկզբնականները։'
    localStorage.removeItem(KEY)
    current = DEFAULTS
  }
  return current
}

export function getSettings(): Settings {
  return load()
}

export function settingsProblem(): string | null {
  load()
  return problem
}

export function useSettings(): Settings {
  return useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, load)
}

export function updateSettings(change: Partial<Settings>): void {
  current = { ...load(), ...change }
  localStorage.setItem(KEY, JSON.stringify(current))
  applyAppearance()
  for (const l of listeners) l()
}

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function effectiveTheme(s: Settings = load()): 'light' | 'dark' {
  if (s.theme !== 'auto') return s.theme
  return darkQuery().matches ? 'dark' : 'light'
}

/** Puts the theme and text size on <html>; the status bar of the installed app follows the theme. */
export function applyAppearance(): void {
  const s = load()
  const root = document.documentElement
  if (s.theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = s.theme
  if (s.textSize === 'large') root.dataset.size = 'large'
  else delete root.dataset.size
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', effectiveTheme(s) === 'dark' ? '#23272e' : '#ffffff')
}

export function initAppearance(): void {
  applyAppearance()
  darkQuery().addEventListener('change', () => {
    applyAppearance()
    for (const l of listeners) l()
  })
}
