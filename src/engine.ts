/**
 * Движок раунда: ожидание ставок → полёт → краш → пауза → следующий раунд.
 * Кривая роста множителя — формула bustabit: m(t) = floor(100 · e^(0.00006·t_ms)) / 100.
 */
import { makeRound, type FairRound } from './fair'
import { store, type RoundRecord } from './store'

export type Phase = 'betting' | 'flying' | 'crashed'

export interface EngineState {
  phase: Phase
  multiplier: number
  crash: number | null // известен только после краша
  countdown: number // сек до старта (в betting)
  bet: number | null
  cashedAt: number | null
  round: FairRound | null
  roundId: number
  startedAt: number
}

type Listener = (s: EngineState) => void

export const BETTING_MS = 6000
export const CRASHED_MS = 3500
const GROWTH = 0.00006

export function multiplierAt(elapsedMs: number): number {
  return Math.floor(100 * Math.exp(GROWTH * elapsedMs)) / 100
}

/** Обратная функция: сколько мс до заданного множителя. */
export function msToMultiplier(m: number): number {
  return Math.log(m) / GROWTH
}

class Engine {
  state: EngineState = {
    phase: 'betting',
    multiplier: 1,
    crash: null,
    countdown: BETTING_MS / 1000,
    bet: null,
    cashedAt: null,
    round: null,
    roundId: 0,
    startedAt: 0,
  }
  private listeners = new Set<Listener>()
  private raf = 0
  private timer = 0
  private running = false
  private phaseStart = 0

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  private emit() {
    this.listeners.forEach((l) => l(this.state))
  }

  start() {
    if (this.running) return
    this.running = true
    void this.enterBetting()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    clearTimeout(this.timer)
  }

  private async enterBetting() {
    const round = await makeRound(store.settings.clientSeed)
    this.state = {
      ...this.state,
      phase: 'betting',
      multiplier: 1,
      crash: null,
      bet: null,
      cashedAt: null,
      round,
      roundId: store.nextRoundId(),
      countdown: BETTING_MS / 1000,
    }
    this.phaseStart = performance.now()
    this.emit()
    const tick = () => {
      if (!this.running) return
      const left = BETTING_MS - (performance.now() - this.phaseStart)
      if (left <= 0) return this.enterFlying()
      this.state.countdown = Math.ceil(left / 100) / 10
      this.emit()
      this.timer = window.setTimeout(tick, 100)
    }
    tick()
  }

  private enterFlying() {
    this.state.phase = 'flying'
    this.state.startedAt = performance.now()
    this.emit()
    const crashAt = this.state.round!.crash
    const auto = store.settings.autoCashout
    const frame = () => {
      if (!this.running) return
      const m = multiplierAt(performance.now() - this.state.startedAt)
      if (m >= crashAt) return this.enterCrashed()
      this.state.multiplier = m
      if (auto && this.state.bet !== null && this.state.cashedAt === null && m >= auto) this.cashout()
      this.emit()
      this.raf = requestAnimationFrame(frame)
    }
    frame()
  }

  private enterCrashed() {
    const r = this.state.round!
    this.state.phase = 'crashed'
    this.state.multiplier = r.crash
    this.state.crash = r.crash
    this.emit()
    const bet = this.state.bet
    const cashedAt = this.state.cashedAt
    const profit = bet === null ? 0 : cashedAt === null ? -bet : Math.round(bet * (cashedAt - 1) * 100) / 100
    const rec: RoundRecord = {
      id: this.state.roundId,
      ts: Date.now(),
      crash: r.crash,
      serverSeed: r.serverSeed,
      serverSeedHash: r.serverSeedHash,
      clientSeed: r.clientSeed,
      hash: r.hash,
      bet,
      cashedAt,
      profit,
    }
    store.pushRound(rec)
    this.timer = window.setTimeout(() => this.running && this.enterBetting(), CRASHED_MS)
  }

  /** Ставка принимается только в фазе ожидания. */
  placeBet(amount: number): string | null {
    if (this.state.phase !== 'betting') return 'Ставки принимаются до старта'
    if (this.state.bet !== null) return 'Ставка уже сделана'
    if (!(amount > 0)) return 'Введите сумму'
    if (amount > store.balance) return 'Недостаточно кредитов'
    store.addBalance(-amount)
    store.setSettings({ lastBet: amount })
    this.state.bet = amount
    this.emit()
    return null
  }

  cancelBet() {
    if (this.state.phase !== 'betting' || this.state.bet === null) return
    store.addBalance(this.state.bet)
    this.state.bet = null
    this.emit()
  }

  cashout(): number | null {
    if (this.state.phase !== 'flying' || this.state.bet === null || this.state.cashedAt !== null) return null
    const m = this.state.multiplier
    const win = Math.round(this.state.bet * m * 100) / 100
    store.addBalance(win)
    this.state.cashedAt = m
    this.emit()
    return win
  }
}

export const engine = new Engine()
