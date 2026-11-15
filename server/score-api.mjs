import { demoLeaderboard } from './demo-scores.mjs'

const encode = value => new TextEncoder().encode(value)
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const fromBase64url = value => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0))
const response = (status, data) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
function failure(status, message) { return Object.assign(new Error(message), { status }) }

async function sha256(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encode(value)))
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function body(req) {
  if (!req.body) throw failure(400, 'Invalid JSON.')
  const reader = req.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let json = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.length
    if (size > 256_000) {
      await reader.cancel()
      throw failure(413, 'Replay is too large.')
    }
    json += decoder.decode(value, { stream: true })
  }
  try { return JSON.parse(json + decoder.decode()) }
  catch { throw failure(400, 'Invalid JSON.') }
}

const challenges = {
  Tornado: [37.69, -97.34], Hurricane: [21, -87], Blizzard: [53.54, -113.49],
  Thunderstorm: [50.45, -104.62], Wildfire: [39.76, -121.62],
}
function dailyChallenge(event, date) {
  const day = new Date(date).toISOString().slice(0, 10)
  const [lat, lon] = challenges[event]
  return { id: day, event, lat, lon, seed: Number(day.replaceAll('-', '')) + 80417 }
}
const publicRow = row => ({
  id: row.id, name: row.display_name, player: row.player.slice(0, 6), score: row.score, submitted: row.submitted,
  summary: JSON.parse(row.summary),
})


export function createScoreApi({ engine, secret, origins = [], query, verify }) {
  if (!secret || secret.length < 32) throw Error('Set STORMWAKE_SECRET to a persistent random secret of at least 32 characters.')
  const { commonMetrics, eventMetrics, damageTargets, rulesVersion, validPlacement } = engine
  const allowedOrigins = new Set(origins)
  const key = crypto.subtle.importKey('raw', encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  const hmac = async value => base64url(new Uint8Array(await crypto.subtle.sign('HMAC', await key, encode(value))))
  const normalize = ({ event, difficulty, lat, lon, theaterId, origin }) => ({ event, difficulty, lat, lon, theaterId, origin })

  async function playerFor(req) {
    const guest = req.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]
    if (!guest) throw failure(401, 'Guest identity missing.')
    return hmac(guest)
  }

  async function decodeTicket(token) {
    if (typeof token !== 'string' || token.length > 2048) throw failure(400, 'Invalid run ticket.')
    const [payload, signature, extra] = token.split('.')
    if (extra !== undefined || !payload || !/^[A-Za-z0-9_-]{43}$/.test(signature ?? '') ||
      !await crypto.subtle.verify('HMAC', await key, fromBase64url(signature), encode(payload))) {
      throw failure(403, 'Invalid run ticket.')
    }
    return JSON.parse(new TextDecoder().decode(fromBase64url(payload)))
  }

  const limits = new Map()
  function rateLimit(ip) {
    if (!ip) return
    const minute = Math.floor(Date.now() / 60_000)
    const entry = limits.get(ip)
    if (entry?.minute === minute) {
      if (++entry.count > 120) throw failure(429, 'Too many requests. Try again in a minute.')
      return
    }
    for (const [address, value] of limits) if (value.minute < minute) limits.delete(address)
    if (limits.size < 10_000) limits.set(ip, { minute, count: 1 })
  }

  async function handle(req, url) {
    const path = url.pathname
    if (path === '/api/health' && req.method === 'GET') return response(200, { rulesVersion })
    if (path === '/api/challenge' && req.method === 'GET') {
      const event = url.searchParams.get('event')
      if (!Object.hasOwn(challenges, event)) throw failure(400, 'Unknown event.')
      return response(200, dailyChallenge(event, Date.now()))
    }
    if (path === '/api/runs/start' && req.method === 'POST') {
      const player = await playerFor(req)
      const input = await body(req)
      if (!validPlacement(input?.placement) || input.rulesVersion !== rulesVersion) throw failure(400, 'Invalid placement or game version.')
      const placement = normalize(input.placement)
      const issuedAt = Date.now()
      const challenge = input.challenge ? dailyChallenge(placement.event, issuedAt) : null
      if (challenge && (input.challenge !== challenge.id || challenge.lat !== placement.lat ||
        challenge.lon !== placement.lon || placement.theaterId !== undefined)) throw failure(409, 'Daily challenge has changed.')
      const seed = challenge?.seed ?? ((crypto.getRandomValues(new Uint32Array(1))[0] >>> 1) || 1)
      const id = crypto.randomUUID()
      const payload = base64url(encode(JSON.stringify({ id, player, placement, seed, issuedAt, version: rulesVersion, challenge: challenge?.id })))
      return response(201, { id, seed, issuedAt, token: payload + '.' + await hmac(payload) })
    }
    const runMatch = path.match(/^\/api\/runs\/([a-f0-9-]{36})\/submit$/)
    if (runMatch && req.method === 'POST') {
      const player = await playerFor(req)
      const input = await body(req)
      const ticket = await decodeTicket(input?.token)
      const name = typeof input.displayName === 'string' ? input.displayName.normalize('NFC').trim() : ''
      if ([...name].length < 2 || [...name].length > 24 || /[\p{Cc}\p{Cf}]/u.test(name)) throw failure(400, 'Use 2 to 24 characters for the display name.')
      if (ticket.id !== runMatch[1] || ticket.player !== player || ticket.version !== rulesVersion) throw failure(403, 'Run ticket belongs to another player or season.')
      const prior = await query.first('SELECT id, player, summary FROM scores WHERE id = ?', ticket.id)
      if (prior) return response(200, { id: prior.id, summary: JSON.parse(prior.summary) })
      if (Date.now() - ticket.issuedAt > 7 * 86400_000) throw failure(410, 'Run ticket expired.')
      const replay = input.replay
      if (!validPlacement(replay?.placement) || JSON.stringify(normalize(replay.placement)) !== JSON.stringify(ticket.placement) ||
        replay.seed !== ticket.seed || replay.startedAt !== ticket.issuedAt) throw failure(422, 'Replay does not match the issued run.')
      const result = await verify(replay)
      const replayHash = await sha256(JSON.stringify(replay))
      const summary = { ...result, id: ticket.id, replayHash, challenge: ticket.challenge }
      await query.run('INSERT OR IGNORE INTO scores VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ticket.id, player, name, rulesVersion, ticket.placement.event, ticket.placement.difficulty, Date.now(), JSON.stringify(summary))
      return response(201, { id: ticket.id, summary })
    }
    if (path === '/api/leaderboards' && req.method === 'GET') {
      const event = url.searchParams.get('event') || 'Tornado'
      const difficulty = url.searchParams.get('difficulty') || 'Normal'
      const metric = url.searchParams.get('metric') || 'damage'
      const period = url.searchParams.get('period') || 'all'
      const challenge = url.searchParams.get('challenge')
      const version = url.searchParams.get('version') || rulesVersion
      if (!Object.hasOwn(eventMetrics, event) || !['Easy', 'Normal', 'Hard', 'Expert'].includes(difficulty) ||
        ![...commonMetrics, ...eventMetrics[event], 'mastery'].includes(metric) || !['all', 'month'].includes(period) ||
        (challenge && !/^\d{4}-\d{2}-\d{2}$/.test(challenge))) throw failure(400, 'Invalid leaderboard filters.')
      const now = new Date()
      const since = period === 'month' ? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) : 0
      const demos = version === rulesVersion && !challenge ? demoLeaderboard({ event, difficulty, metric }, damageTargets) : []
      if (metric === 'mastery') {
        const rows = await query.all(`
          WITH best AS (
            SELECT player, event, difficulty, MAX(json_extract(summary, '$.stars')) AS stars
            FROM scores WHERE version = ? AND submitted >= ? GROUP BY player, event, difficulty
          ), recent AS (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY player ORDER BY submitted DESC, id) AS n
            FROM scores WHERE version = ?
          )
          SELECT recent.*, SUM(best.stars) AS score FROM best JOIN recent USING (player) WHERE recent.n = 1
          GROUP BY best.player ORDER BY score DESC, recent.submitted ASC, recent.id LIMIT 50
        `, version, since, version)
        return response(200, { rows: rows.map(publicRow), demos, version })
      }
      const rows = await query.all(`
        WITH eligible AS (
          SELECT *, CAST(json_extract(summary, ?) AS REAL) AS score
          FROM scores WHERE version = ? AND event = ? AND difficulty = ? AND submitted >= ?
            AND COALESCE(json_extract(summary, '$.challenge'), '') = ?
        ), ranked AS (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY player ORDER BY score DESC, submitted ASC, id) AS n
          FROM eligible WHERE score IS NOT NULL
        )
        SELECT * FROM ranked WHERE n = 1 ORDER BY score DESC, submitted ASC, id LIMIT 50
      `, '$.metrics.' + metric, version, event, difficulty, since, challenge || '')
      return response(200, { rows: rows.map(publicRow), demos, version })
    }
    throw failure(404, 'Unknown API route.')
  }

  return async (req, ip) => {
    const url = new URL(req.url)
    const origin = req.headers.get('Origin')
    if (origin && origin !== url.origin && !allowedOrigins.has(origin)) return response(403, { error: 'Origin unavailable.' })
    let result
    try {
      if (req.method === 'OPTIONS') result = new Response(null, { status: 204 })
      else {
        rateLimit(ip)
        result = await handle(req, url)
      }
    } catch (error) {
      if (!error.status) console.error(error)
      result = response(error.status || 500, { error: error.status ? error.message : 'Score service encountered an error.' })
    }
    if (origin) {
      result.headers.set('Access-Control-Allow-Origin', origin)
      result.headers.set('Vary', 'Origin')
      result.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      result.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    }
    return result
  }
}
