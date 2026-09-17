/** Мелкие UI-хелперы: html-тег, тосты, вибрация. */
import { store } from './store'

export function h(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((acc, s, i) => acc + s + (i < values.length ? String(values[i] ?? '') : ''), '')
}

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

let toastTimer = 0
export function toast(text: string, opts: { action?: () => void; ttl?: number } = {}) {
  const el = document.getElementById('toast')!
  el.textContent = text
  el.classList.add('show')
  el.onclick = () => {
    opts.action?.()
    el.classList.remove('show')
  }
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => el.classList.remove('show'), opts.ttl ?? 3500)
}

export function vibrate(pattern: number | number[]) {
  if (store.settings.haptics && 'vibrate' in navigator) navigator.vibrate(pattern)
}

/** Цветовая полоса множителя — градация как в aviator-клоне ozgeonec (MIT). */
export function band(m: number): 'low' | 'mid' | 'high' {
  return m < 2 ? 'low' : m < 10 ? 'mid' : 'high'
}

export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return `${s} с назад`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} мин назад`
  const hh = Math.round(m / 60)
  if (hh < 24) return `${hh} ч назад`
  return new Date(ts).toLocaleDateString('ru-RU')
}
