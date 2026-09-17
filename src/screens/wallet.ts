import { store, fmt, START_BALANCE } from '../store'
import { pwa } from '../pwa'
import { h, esc, toast } from '../ui'
import type { Screen } from './types'

export const wallet: Screen = {
  title: 'Профиль',
  mount(root) {
    const render = () => {
      const st = store.settings
      root.innerHTML = h`
        <header class="topbar"><b>Профиль и кошелёк</b></header>
        <section class="card wallet-card">
          <small>Виртуальные кредиты</small>
          <div class="big-balance">${fmt(store.balance)}</div>
          <div class="row gap">
            <button class="btn primary grow" id="topup">+1000 демо-кредитов</button>
            <button class="btn ghost" id="reset">Сброс</button>
          </div>
        </section>

        <section class="card">
          <label class="field"><span>Ник</span><input id="nick" maxlength="20" value="${esc(st.nick)}" /></label>
          <label class="field"><span>Client seed (участвует в HMAC каждого раунда)</span><input id="seed" maxlength="64" value="${esc(st.clientSeed)}" class="mono" /></label>
          <label class="switch"><input type="checkbox" id="sound" ${st.sound ? 'checked' : ''} /><span>Звук</span></label>
          <label class="switch"><input type="checkbox" id="haptics" ${st.haptics ? 'checked' : ''} /><span>Вибрация</span></label>
        </section>

        <section class="card">
          <b>Приложение</b>
          <div class="kv"><span>Режим</span><b>${pwa.isStandalone ? 'установлено (standalone)' : 'в браузере'}</b></div>
          <div class="kv"><span>Сеть</span><b>${pwa.online ? 'онлайн' : 'офлайн'}</b></div>
          <div class="kv"><span>Версия</span><b>${esc(__APP_VERSION__)}</b></div>
          ${!pwa.isStandalone && pwa.canInstall ? '<button class="btn primary" id="install">Установить на телефон</button>' : ''}
          <button class="btn ghost" id="export">Экспорт истории (JSON)</button>
        </section>

        <section class="card muted small">
          Стартовый баланс ${START_BALANCE}. Кредиты не имеют стоимости, вывод и пополнение невозможны — это учебная демонстрация механики crash-игры.
        </section>
      `
      const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!
      q<HTMLButtonElement>('#topup').onclick = () => {
        store.addBalance(1000)
        toast('+1000 демо-кредитов')
      }
      q<HTMLButtonElement>('#reset').onclick = () => {
        if (confirm('Сбросить баланс и историю?')) {
          store.reset()
          toast('Сброшено')
        }
      }
      q<HTMLInputElement>('#nick').onchange = (e) => store.setSettings({ nick: (e.target as HTMLInputElement).value.trim() || 'Игрок' })
      q<HTMLInputElement>('#seed').onchange = (e) => {
        const v = (e.target as HTMLInputElement).value.trim()
        if (v) {
          store.setSettings({ clientSeed: v })
          toast('Client seed применится со следующего раунда')
        }
      }
      q<HTMLInputElement>('#sound').onchange = (e) => store.setSettings({ sound: (e.target as HTMLInputElement).checked })
      q<HTMLInputElement>('#haptics').onchange = (e) => store.setSettings({ haptics: (e.target as HTMLInputElement).checked })
      root.querySelector<HTMLButtonElement>('#install')?.addEventListener('click', () => void pwa.install())
      q<HTMLButtonElement>('#export').onclick = () => {
        const blob = new Blob([store.exportJson()], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `crashlab-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      }
    }
    render()
    const un1 = store.subscribe(render)
    const un2 = pwa.onChange(render)
    return () => {
      un1()
      un2()
    }
  },
}
