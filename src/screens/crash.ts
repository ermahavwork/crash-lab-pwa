import { engine, msToMultiplier, type EngineState } from '../engine'
import { store, fmt } from '../store'
import { h, esc, band, toast, vibrate } from '../ui'
import type { Screen } from './types'

const QUICK = [10, 50, 100, 500]

/**
 * График: кривая множителя на canvas. Идея «хвоста» из точек и градации цветов —
 * из aviator-betting-game-clone (ozgeonec, MIT); сам расчёт переписан под
 * экспоненциальную кривую и авто-масштаб камеры.
 */
class Chart {
  private ctx: CanvasRenderingContext2D
  private dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  private w = 0
  private hgt = 0
  private canvas: HTMLCanvasElement
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.resize()
  }
  resize() {
    const r = this.canvas.getBoundingClientRect()
    this.w = Math.max(1, r.width)
    this.hgt = Math.max(1, r.height)
    this.canvas.width = this.w * this.dpr
    this.canvas.height = this.hgt * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }
  draw(s: EngineState) {
    const { ctx, w, hgt } = this
    ctx.clearRect(0, 0, w, hgt)
    const pad = { l: 12, r: 16, t: 18, b: 22 }
    const iw = w - pad.l - pad.r
    const ih = hgt - pad.t - pad.b
    // Окно по времени/множителю растёт вместе с полётом
    const elapsed = s.phase === 'betting' ? 0 : msToMultiplier(Math.max(1.0001, s.multiplier))
    const tMax = Math.max(6000, elapsed * 1.15)
    const mMax = Math.max(2, s.multiplier * 1.2)
    const X = (t: number) => pad.l + (t / tMax) * iw
    const Y = (m: number) => pad.t + ih - ((m - 1) / (mMax - 1)) * ih

    // сетка
    ctx.strokeStyle = 'rgba(148,163,184,0.12)'
    ctx.lineWidth = 1
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillStyle = 'rgba(148,163,184,0.7)'
    const steps = 4
    for (let i = 0; i <= steps; i++) {
      const m = 1 + ((mMax - 1) * i) / steps
      const y = Y(m)
      ctx.beginPath()
      ctx.moveTo(pad.l, y)
      ctx.lineTo(w - pad.r, y)
      ctx.stroke()
      ctx.fillText(m.toFixed(2) + 'x', pad.l + 2, y - 3)
    }

    if (s.phase === 'betting') return

    // кривая
    const crashed = s.phase === 'crashed'
    const color = crashed ? '#f43f5e' : s.cashedAt !== null ? '#22c55e' : '#22d3ee'
    const grad = ctx.createLinearGradient(0, pad.t, 0, hgt)
    grad.addColorStop(0, color + '55')
    grad.addColorStop(1, color + '00')
    ctx.beginPath()
    ctx.moveTo(X(0), Y(1))
    const n = 80
    for (let i = 1; i <= n; i++) {
      const t = (elapsed * i) / n
      ctx.lineTo(X(t), Y(Math.exp(0.00006 * t)))
    }
    const tipX = X(elapsed)
    const tipY = Y(s.multiplier)
    ctx.lineTo(tipX, tipY)
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.lineTo(tipX, Y(1))
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // точка
    ctx.beginPath()
    ctx.arc(tipX, tipY, crashed ? 7 : 5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    if (!crashed) {
      ctx.beginPath()
      ctx.arc(tipX, tipY, 11, 0, Math.PI * 2)
      ctx.strokeStyle = color + '66'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    // метка кэшаута
    if (s.cashedAt !== null) {
      const cx = X(msToMultiplier(s.cashedAt))
      const cy = Y(s.cashedAt)
      ctx.beginPath()
      ctx.arc(cx, cy, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#22c55e'
      ctx.fill()
      ctx.fillStyle = '#22c55e'
      ctx.fillText(`забрали ${s.cashedAt.toFixed(2)}x`, Math.min(cx + 6, w - 110), cy - 8)
    }
  }
}

export const crash: Screen = {
  title: 'Crash',
  mount(root) {
    root.innerHTML = h`
      <header class="topbar">
        <a href="#/" class="back" aria-label="Назад">‹</a>
        <b>Crash</b>
        <div class="balance-pill small"><span>Баланс</span><b id="bal">${fmt(store.balance)}</b></div>
      </header>
      <div class="chips scroll" id="lastchips"></div>
      <section class="stage">
        <canvas id="chart" class="chart"></canvas>
        <div class="overlay" id="overlay"></div>
      </section>
      <section class="panel">
        <div class="row gap">
          <label class="field grow">
            <span>Ставка</span>
            <input id="amount" type="number" inputmode="decimal" min="1" step="1" value="${store.settings.lastBet}" />
          </label>
          <label class="field">
            <span>Авто-вывод</span>
            <input id="auto" type="number" inputmode="decimal" min="1.01" step="0.01" placeholder="—" value="${store.settings.autoCashout ?? ''}" />
          </label>
        </div>
        <div class="row gap quick">${QUICK.map((q) => `<button class="btn chipbtn" data-q="${q}">${q}</button>`).join('')}<button class="btn chipbtn" data-q="x2">×2</button><button class="btn chipbtn" data-q="half">½</button></div>
        <button class="btn big" id="action">Сделать ставку</button>
        <div class="hint" id="hint"></div>
      </section>
    `
    const canvas = root.querySelector<HTMLCanvasElement>('#chart')!
    const chart = new Chart(canvas)
    const overlay = root.querySelector<HTMLElement>('#overlay')!
    const action = root.querySelector<HTMLButtonElement>('#action')!
    const hint = root.querySelector<HTMLElement>('#hint')!
    const amount = root.querySelector<HTMLInputElement>('#amount')!
    const auto = root.querySelector<HTMLInputElement>('#auto')!
    const chips = root.querySelector<HTMLElement>('#lastchips')!
    const bal = root.querySelector<HTMLElement>('#bal')!

    const renderChips = () => {
      chips.innerHTML = store.rounds
        .slice(0, 20)
        .map((r) => `<span class="chip ${band(r.crash)}">${r.crash.toFixed(2)}x</span>`)
        .join('')
    }
    renderChips()

    let lastPhase: EngineState['phase'] | null = null
    const onState = (s: EngineState) => {
      chart.draw(s)
      const m = s.multiplier.toFixed(2)
      if (s.phase === 'betting') {
        overlay.className = 'overlay betting'
        overlay.innerHTML = `<small>Раунд #${s.roundId} · старт через</small><b>${s.countdown.toFixed(1)} с</b><small class="mono">commit ${esc(s.round?.serverSeedHash.slice(0, 16))}…</small>`
        action.className = 'btn big ' + (s.bet !== null ? 'ghost' : 'primary')
        action.textContent = s.bet !== null ? `Отменить ставку ${fmt(s.bet)}` : 'Сделать ставку'
        action.disabled = false
        hint.textContent = s.bet !== null ? 'Ставка принята — ждём старта' : ''
      } else if (s.phase === 'flying') {
        overlay.className = 'overlay flying' + (s.cashedAt !== null ? ' won' : '')
        overlay.innerHTML = `<b>${m}x</b>`
        if (s.bet !== null && s.cashedAt === null) {
          action.className = 'btn big cashout'
          action.textContent = `Забрать ${fmt(s.bet * s.multiplier)}`
          action.disabled = false
          hint.textContent = ''
        } else {
          action.className = 'btn big ghost'
          action.textContent = s.cashedAt !== null ? `Забрали на ${s.cashedAt.toFixed(2)}x` : 'Ждём следующий раунд'
          action.disabled = true
          hint.textContent = ''
        }
      } else {
        overlay.className = 'overlay crashed'
        overlay.innerHTML = `<small>Краш</small><b>${m}x</b>`
        action.className = 'btn big ghost'
        action.disabled = true
        action.textContent = 'Следующий раунд…'
        if (lastPhase !== 'crashed') {
          vibrate(s.cashedAt !== null ? 30 : [60, 40, 60])
          if (s.bet !== null) hint.textContent = s.cashedAt !== null ? `Выигрыш +${fmt(s.bet * (s.cashedAt - 1))}` : `Ставка ${fmt(s.bet)} сгорела`
          renderChips()
        }
      }
      lastPhase = s.phase
    }

    action.addEventListener('click', () => {
      const s = engine.state
      if (s.phase === 'betting') {
        if (s.bet !== null) return engine.cancelBet()
        const err = engine.placeBet(Number(amount.value))
        if (err) toast(err)
        else vibrate(15)
      } else if (s.phase === 'flying') {
        const win = engine.cashout()
        if (win !== null) {
          vibrate(25)
          toast(`Забрали ${fmt(win)}`)
        }
      }
    })
    root.querySelectorAll<HTMLButtonElement>('[data-q]').forEach((b) =>
      b.addEventListener('click', () => {
        const q = b.dataset.q!
        const cur = Number(amount.value) || 0
        amount.value = String(q === 'x2' ? cur * 2 : q === 'half' ? Math.max(1, Math.floor(cur / 2)) : Number(q))
      }),
    )
    auto.addEventListener('change', () => {
      const v = Number(auto.value)
      store.setSettings({ autoCashout: v >= 1.01 ? v : null })
      if (v >= 1.01) toast(`Авто-вывод на ${v.toFixed(2)}x`)
    })

    const unStore = store.subscribe(() => (bal.textContent = fmt(store.balance)))
    const unEngine = engine.subscribe(onState)
    const onResize = () => {
      chart.resize()
      chart.draw(engine.state)
    }
    window.addEventListener('resize', onResize)
    engine.start()
    return () => {
      unStore()
      unEngine()
      window.removeEventListener('resize', onResize)
    }
  },
}
