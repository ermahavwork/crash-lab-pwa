/** Локальное состояние (localStorage). Никаких реальных денег — только виртуальные кредиты. */

export interface RoundRecord {
  id: number
  ts: number
  crash: number
  serverSeed: string
  serverSeedHash: string
  clientSeed: string
  hash: string
  bet: number | null
  cashedAt: number | null // множитель, на котором забрали
  profit: number // + / - / 0
}

export interface Settings {
  nick: string
  clientSeed: string
  sound: boolean
  haptics: boolean
  autoCashout: number | null
  lastBet: number
}

interface State {
  balance: number
  rounds: RoundRecord[]
  settings: Settings
  bonusClaimedAt: number
  roundCounter: number
}

const KEY = 'crashlab.v1'
export const START_BALANCE = 1000
export const MAX_ROUNDS = 100

const defaults = (): State => ({
  balance: START_BALANCE,
  rounds: [],
  settings: {
    nick: 'Игрок',
    clientSeed: 'crashlab-' + Math.random().toString(36).slice(2, 10),
    sound: true,
    haptics: true,
    autoCashout: null,
    lastBet: 50,
  },
  bonusClaimedAt: 0,
  roundCounter: 0,
})

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<State>
    const d = defaults()
    return { ...d, ...parsed, settings: { ...d.settings, ...(parsed.settings ?? {}) } }
  } catch {
    return defaults()
  }
}

let state: State = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* приватный режим / нет места — работаем в памяти */
  }
  listeners.forEach((l) => l())
}

export const store = {
  get balance() {
    return state.balance
  },
  get rounds() {
    return state.rounds
  },
  get settings() {
    return state.settings
  },
  get bonusClaimedAt() {
    return state.bonusClaimedAt
  },
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  nextRoundId() {
    state.roundCounter += 1
    return state.roundCounter
  },
  addBalance(delta: number) {
    state.balance = Math.round((state.balance + delta) * 100) / 100
    persist()
  },
  setSettings(patch: Partial<Settings>) {
    state.settings = { ...state.settings, ...patch }
    persist()
  },
  pushRound(r: RoundRecord) {
    state.rounds.unshift(r)
    if (state.rounds.length > MAX_ROUNDS) state.rounds.length = MAX_ROUNDS
    persist()
  },
  claimBonus(amount: number) {
    state.bonusClaimedAt = Date.now()
    state.balance += amount
    persist()
  },
  reset() {
    const keepSeed = state.settings.clientSeed
    state = defaults()
    state.settings.clientSeed = keepSeed
    persist()
  },
  exportJson() {
    return JSON.stringify(state, null, 2)
  },
}

export function stats() {
  const r = state.rounds
  const played = r.filter((x) => x.bet !== null)
  const wins = played.filter((x) => x.profit > 0)
  const profit = played.reduce((a, x) => a + x.profit, 0)
  const best = played.reduce((a, x) => Math.max(a, x.cashedAt ?? 0), 0)
  const maxCrash = r.reduce((a, x) => Math.max(a, x.crash), 0)
  return {
    total: r.length,
    played: played.length,
    wins: wins.length,
    winRate: played.length ? Math.round((wins.length / played.length) * 100) : 0,
    profit: Math.round(profit * 100) / 100,
    best,
    maxCrash,
  }
}

export const fmt = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
