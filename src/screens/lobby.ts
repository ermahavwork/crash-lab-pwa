import { store, stats, fmt } from '../store'
import { pwa } from '../pwa'
import { h, esc, band, toast } from '../ui'
import type { Screen } from './types'

const BONUS = 500
const BONUS_COOLDOWN = 24 * 3600 * 1000

function bonusLeft() {
  return Math.max(0, store.bonusClaimedAt + BONUS_COOLDOWN - Date.now())
}

export const lobby: Screen = {
  title: 'Лобби',
  mount(root) {
    const render = () => {
      const s = stats()
      const last = store.rounds.slice(0, 12)
      const left = bonusLeft()
      const hours = Math.ceil(left / 3600000)
      root.innerHTML = h`
        <header class="hero">
          <div>
            <div class="eyebrow">Привет, ${esc(store.settings.nick)}</div>
            <h1>Crash Lab</h1>
          </div>
          <div class="balance-pill"><span>Баланс</span><b>${fmt(store.balance)}</b></div>
        </header>

        ${
          !pwa.isStandalone
            ? h`<section class="card install-card">
                <div>
                  <b>Установить на телефон</b>
                  <p>Иконка на рабочем столе, полный экран, работает офлайн.</p>
                </div>
                <button class="btn primary" id="install" ${pwa.canInstall ? '' : 'disabled'}>Установить</button>
                ${pwa.canInstall ? '' : '<small class="muted">Если кнопка неактивна — меню Chrome ⋮ → «Добавить на гл. экран» / «Установить приложение».</small>'}
              </section>`
            : ''
        }

        <a class="card play-card" href="#/crash">
          <div class="play-art"><span class="mult">x</span></div>
          <div>
            <b>Crash</b>
            <p>Множитель растёт — заберите выигрыш до краша. Виртуальные кредиты, provably fair.</p>
          </div>
          <span class="chev">›</span>
        </a>

        <section class="card">
          <div class="row between">
            <b>Ежедневный бонус</b>
            <button class="btn ghost" id="bonus" ${left > 0 ? 'disabled' : ''}>${left > 0 ? `через ${hours} ч` : `+${BONUS}`}</button>
          </div>
        </section>

        <section class="grid3">
          <div class="stat"><small>Раундов</small><b>${s.played}</b></div>
          <div class="stat"><small>Побед</small><b>${s.winRate}%</b></div>
          <div class="stat"><small>Профит</small><b class="${s.profit >= 0 ? 'pos' : 'neg'}">${s.profit >= 0 ? '+' : ''}${fmt(s.profit)}</b></div>
        </section>

        ${
          last.length
            ? h`<section class="card">
                <div class="row between"><b>Последние крашы</b><a href="#/history" class="link">все ›</a></div>
                <div class="chips">${last.map((r) => `<span class="chip ${band(r.crash)}">${r.crash.toFixed(2)}x</span>`).join('')}</div>
              </section>`
            : ''
        }

        <section class="card muted small">
          Учебный проект: никаких реальных денег, ставок и выплат. Все раунды проверяемы на экране «Честность».
        </section>
      `
      root.querySelector<HTMLButtonElement>('#install')?.addEventListener('click', async () => {
        const r = await pwa.install()
        if (r === 'dismissed') toast('Установку отменили — кнопка останется здесь')
      })
      root.querySelector<HTMLButtonElement>('#bonus')?.addEventListener('click', () => {
        if (bonusLeft() > 0) return
        store.claimBonus(BONUS)
        toast(`+${BONUS} кредитов — до завтра`)
      })
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
