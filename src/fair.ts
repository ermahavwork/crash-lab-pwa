/**
 * Provably-fair расчёт точки краша.
 *
 * Схема — классическая bustabit (opensource, повторена десятками crash-проектов):
 *   hash  = HMAC-SHA256(key = serverSeed, message = clientSeed)
 *   h     = первые 52 бита hash как целое
 *   если h % 33 == 0  → краш на 1.00x (house edge ≈ 3 %)
 *   иначе crash = floor((100 * 2^52 - h) / (2^52 - h)) / 100
 *
 * Перед раундом публикуется sha256(serverSeed) (commit), после раунда — сам
 * serverSeed. Любой может пересчитать раунд на экране «Честность».
 */

const E52 = 1n << 52n

export function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of u8) s += b.toString(16).padStart(2, '0')
  return s
}

export function randomHex(bytes = 32): string {
  const u8 = new Uint8Array(bytes)
  crypto.getRandomValues(u8)
  return toHex(u8)
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return toHex(buf)
}

export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message))
  return toHex(sig)
}

/** Точка краша из готового hex-хэша (первые 13 hex-символов = 52 бита). */
export function crashPointFromHash(hashHex: string): number {
  const h = BigInt('0x' + hashHex.slice(0, 13))
  if (h % 33n === 0n) return 1.0
  const num = 100n * E52 - h
  const den = E52 - h
  return Number(num / den) / 100
}

export interface FairRound {
  serverSeed: string
  serverSeedHash: string // commit, публикуется до раунда
  clientSeed: string
  hash: string
  crash: number
}

export async function makeRound(clientSeed: string, serverSeed = randomHex()): Promise<FairRound> {
  const [serverSeedHash, hash] = await Promise.all([sha256Hex(serverSeed), hmacSha256Hex(serverSeed, clientSeed)])
  return { serverSeed, serverSeedHash, clientSeed, hash, crash: crashPointFromHash(hash) }
}
