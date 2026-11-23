// Chrome's install offer. Android Chrome fires `beforeinstallprompt` when the app can be installed; keeping that event
// lets the app show its own "install" button instead of relying on people finding the browser menu.
import { useSyncExternalStore } from 'react'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let offer: InstallEvent | null = null
const listeners = new Set<() => void>()
const notify = () => {
  for (const l of listeners) l()
}

export function initInstall(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    offer = e as InstallEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    offer = null
    notify()
  })
}

export function useCanInstall(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => offer !== null,
  )
}

export async function installApp(): Promise<void> {
  if (offer === null) throw new Error('Տեղադրման առաջարկը հասանելի չէ։')
  const event = offer
  await event.prompt()
  await event.userChoice
  offer = null // Chrome allows one prompt per event
  notify()
}
