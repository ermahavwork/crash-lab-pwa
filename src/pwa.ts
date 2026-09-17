/** Установка PWA: перехват beforeinstallprompt, статус, обновление service worker. */
import { registerSW } from 'virtual:pwa-register'
import { toast } from './ui'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export const pwa = {
  get canInstall() {
    return deferred !== null
  },
  get isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    )
  },
  get online() {
    return navigator.onLine
  },
  onChange(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  async install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferred) return 'unavailable'
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') deferred = null
    listeners.forEach((l) => l())
    return outcome
  },
}

const notify = () => listeners.forEach((l) => l())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as BeforeInstallPromptEvent
  notify()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  toast('Приложение установлено — ищите иконку Crash Lab на рабочем столе')
  notify()
})
window.addEventListener('online', notify)
window.addEventListener('offline', notify)

export function setupServiceWorker() {
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('Доступна новая версия — нажмите, чтобы обновить', { action: () => update(true), ttl: 15000 })
    },
    onOfflineReady() {
      toast('Приложение готово к работе офлайн')
    },
  })
}
