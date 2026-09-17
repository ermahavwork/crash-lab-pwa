import { store, stats, fmt } from '../store'
import { h, band, timeAgo } from '../ui'
import type { Screen } from './types'

export const history: Screen = {
  title: 'История',
  mount(root) {
    const render = () => {
      const s = stats()
      const rows = store.rounds
      root.innerHTML = h`
        <header class="topbar"><b>История</b></header>
        <section class="grid3">
          <div class="stat"><small>Профит</small><b class="${s.profit >= 0 ? 'pos' : 'neg'}">${s.profit >= 0 ? '+' : ''}${fmt(s.profit)}</b></div>
          <div class="stat"><small>Лучший вывод</small><b>${s.best ? s.best.toFixed(2) + 'x' : '—'}</b></div>
          <div class="stat"><small>Макс. краш</small><b>${s.maxCrash ? s.maxCrash.toFixed(2) + 'x' : '—'}</b></div>
        </section>
        ${
          rows.length
            ? h`<section class="list">
                ${rows
                  .map(
                    (r) => h`<a class="rowitem" href="#/fair?server=${r.serverSeed}&client=${encodeURIComponent(r.clientSeed)}">
                      <span class="chip ${band(r.crash)}">${r.crash.toFixed(2)}x</span>
                      <span class="grow">
                        <b>#${r.id}</b> <small class="muted">${timeAgo(r.ts)}</small><br/>
                        <small>${r.bet === null ? 'без ставки' : r.cashedAt !== null ? `ставка ${fmt(r.bet)} → забрали на ${r.cashedAt.toFixed(2)}x` : `ставка ${fmt(r.bet)} сгорела`}</small>
                      </span>
                      <b class="${r.profit > 0 ? 'pos' : r.profit < 0 ? 'neg' : 'muted'}">${r.profit > 0 ? '+' : ''}${r.bet === null ? '' : fmt(r.profit)}</b>
                      <span class="chev">›</span>
                    </a>`,
                  )
                  .join('')}
              </section>
              <p class="muted small center">Нажмите на раунд, чтобы проверить его честность.</p>`
            : h`<section class="card center muted">Раундов ещё нет. <a class="link" href="#/crash">Сыграть первый ›</a></section>`
        }
      `
    }
    render()
    return store.subscribe(render)
  },
}
