import './style.css'
import { setupServiceWorker } from './pwa'
import { lobby } from './screens/lobby'
import { crash } from './screens/crash'
import { history } from './screens/history'
import { wallet } from './screens/wallet'
import { verify } from './screens/verify'
import type { Screen } from './screens/types'

const routes: Record<string, { screen: Screen; icon: string; tab: boolean }> = {
  '/': { screen: lobby, icon: '⌂', tab: true },
  '/crash': { screen: crash, icon: '×', tab: true },
  '/history': { screen: history, icon: '≡', tab: true },
  '/fair': { screen: verify, icon: '✓', tab: true },
  '/wallet': { screen: wallet, icon: '◎', tab: true },
}

const view = document.getElementById('view')!
const tabs = document.getElementById('tabs')!
let cleanup: (() => void) | null = null

function currentPath() {
  const raw = location.hash.replace(/^#/, '') || '/'
  return raw.split('?')[0]
}

function renderTabs(active: string) {
  tabs.innerHTML = Object.entries(routes)
    .filter(([, r]) => r.tab)
    .map(([p, r]) => `<a href="#${p}" class="tab ${p === active ? 'active' : ''}"><span class="ico">${r.icon}</span><span>${r.screen.title}</span></a>`)
    .join('')
}

function navigate() {
  const path = currentPath()
  const route = routes[path] ?? routes['/']
  cleanup?.()
  view.scrollTop = 0
  view.className = 'view screen-' + (path === '/' ? 'lobby' : path.slice(1))
  cleanup = route.screen.mount(view)
  renderTabs(path)
  document.title = route.screen.title === 'Лобби' ? 'Crash Lab' : `${route.screen.title} — Crash Lab`
}

window.addEventListener('hashchange', navigate)
navigate()
setupServiceWorker()
