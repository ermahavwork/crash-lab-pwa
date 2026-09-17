import { hmacSha256Hex, sha256Hex, crashPointFromHash } from '../fair'
import { h, esc, band } from '../ui'
import type { Screen } from './types'

export const verify: Screen = {
  title: 'Честность',
  mount(root) {
    const params = new URLSearchParams(location.hash.split('?')[1] ?? '')
    root.innerHTML = h`
      <header class="topbar"><b>Provably fair</b></header>
      <section class="card">
        <p>До старта раунда приложение публикует <b>commit</b> = SHA-256(server seed). После краша server seed раскрывается. Точка краша считается так:</p>
        <pre class="mono code">hash = HMAC-SHA256(key = serverSeed, msg = clientSeed)
h    = первые 52 бита hash
h % 33 == 0        → 1.00x
иначе crash = ⌊(100·2⁵² − h) / (2⁵² − h)⌋ / 100</pre>
        <p class="muted small">Схема bustabit — открытый стандарт для crash-игр. Заранее изменить результат нельзя: commit зафиксирован до того, как вы сделали ставку.</p>
      </section>
      <section class="card">
        <label class="field"><span>Server seed</span><input id="server" class="mono" value="${esc(params.get('server') ?? '')}" placeholder="64 hex-символа" /></label>
        <label class="field"><span>Client seed</span><input id="client" class="mono" value="${esc(params.get('client') ?? '')}" /></label>
        <button class="btn primary" id="check">Пересчитать раунд</button>
        <div id="result" class="result"></div>
      </section>
    `
    const server = root.querySelector<HTMLInputElement>('#server')!
    const client = root.querySelector<HTMLInputElement>('#client')!
    const result = root.querySelector<HTMLElement>('#result')!
    const run = async () => {
      const s = server.value.trim()
      const c = client.value.trim()
      if (!s || !c) {
        result.innerHTML = '<p class="muted">Заполните оба поля.</p>'
        return
      }
      const [commit, hash] = await Promise.all([sha256Hex(s), hmacSha256Hex(s, c)])
      const crash = crashPointFromHash(hash)
      result.innerHTML = h`
        <div class="kv"><span>commit (sha256)</span><b class="mono wrap">${commit}</b></div>
        <div class="kv"><span>HMAC</span><b class="mono wrap">${hash}</b></div>
        <div class="kv"><span>Точка краша</span><span class="chip ${band(crash)}">${crash.toFixed(2)}x</span></div>
        <p class="muted small">Сравните commit с тем, что показывался на экране перед стартом раунда.</p>
      `
    }
    root.querySelector<HTMLButtonElement>('#check')!.onclick = () => void run()
    if (server.value && client.value) void run()
    return () => {}
  },
}
