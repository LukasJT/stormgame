import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Worker } from 'node:worker_threads'
import { commonMetrics, eventMetrics, rulesVersion, validPlacement } from '../dist-engine/replay.js'

const secret = process.env.STORMWAKE_SECRET
if (!secret || secret.length < 32) throw Error('Set STORMWAKE_SECRET to a persistent random secret of at least 32 characters.')
const database = new DatabaseSync(process.env.STORMWAKE_DB || 'stormwake.sqlite')
database.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY, player TEXT NOT NULL, display_name TEXT NOT NULL,
    version TEXT NOT NULL, event TEXT NOT NULL, difficulty TEXT NOT NULL,
    submitted INTEGER NOT NULL, summary TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS score_filters ON scores(version, event, difficulty, submitted, player);
`)

const origins = new Set((process.env.STORMWAKE_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean))
const root = resolve('dist')
const hmac = value => createHmac('sha256', secret).update(value).digest('base64url')
const response = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(data))
}
function failure(status, message) { return Object.assign(new Error(message), { status }) }

async function body(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 256_000) throw failure(413, 'Replay is too large.')
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()) }
  catch { throw failure(400, 'Invalid JSON.') }
}

const playerFor = req => {
  const key = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]
  if (!key) throw failure(401, 'Guest identity missing.')
  return hmac(key)
}
const normalize = ({ event, difficulty, lat, lon, theaterId, origin }) => ({ event, difficulty, lat, lon, theaterId, origin })

function decodeTicket(token) {
  if (typeof token !== 'string' || token.length > 2048) throw failure(400, 'Invalid run ticket.')
  const [payload, signature, extra] = token.split('.')
  const expected = hmac(payload)
  if (extra !== undefined || signature?.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature, 'ascii'), Buffer.from(expected, 'ascii'))) throw failure(403, 'Invalid run ticket.')
  return JSON.parse(Buffer.from(payload, 'base64url').toString())
}

let worker
let verifying = false
async function verify(replay) {
  if (verifying) throw failure(503, 'Verifier busy. Retry shortly.')
  verifying = true
  try {
    if (!worker) {
      const created = new Worker(new URL('./verify.mjs', import.meta.url), { resourceLimits: { maxOldGenerationSizeMb: 768 } })
      const reset = () => { if (worker === created) worker = undefined }
      created.on('error', reset)
      created.on('exit', reset)
      worker = created
    }
    const current = worker
    return await new Promise((resolve, reject) => {
      const finish = () => {
        clearTimeout(timeout)
        current.off('message', onMessage)
        current.off('error', onError)
        current.off('exit', onExit)
      }
      const onMessage = message => {
        finish()
        if (message.error) reject(failure(422, message.error))
        else resolve(message.result)
      }
      const onError = () => { finish(); worker = undefined; reject(failure(503, 'Verifier unavailable. Retry shortly.')) }
      const onExit = () => onError()
      const timeout = setTimeout(() => {
        onError()
        void current.terminate()
      }, 90_000)
      current.once('message', onMessage)
      current.once('error', onError)
      current.once('exit', onExit)
      current.postMessage(replay)
    })
  } finally {
    verifying = false
  }
}

const limits = new Map()
function rateLimit(req) {
  const key = req.socket.remoteAddress
  const now = Date.now()
  for (const [ip, entry] of limits) if (entry.until <= now) limits.delete(ip)
  const entry = limits.get(key) ?? { count: 0, until: now + 60_000 }
  if (++entry.count > 120) throw failure(429, 'Too many requests. Try again in a minute.')
  limits.set(key, entry)
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
const recorded = database.prepare('SELECT id, player, summary FROM scores WHERE id = ?')
const insert = database.prepare('INSERT OR IGNORE INTO scores VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
const publicRow = row => ({
  id: row.id, name: row.display_name, player: row.player.slice(0, 6), score: row.score, submitted: row.submitted,
  summary: JSON.parse(row.summary),
})

async function handle(req, res, url) {
  rateLimit(req)
  const path = url.pathname
  if (path === '/api/health' && req.method === 'GET') return response(res, 200, { rulesVersion })
  if (path === '/api/challenge' && req.method === 'GET') {
    const event = url.searchParams.get('event')
    if (!Object.hasOwn(challenges, event)) throw failure(400, 'Unknown event.')
    return response(res, 200, dailyChallenge(event, Date.now()))
  }
  if (path === '/api/runs/start' && req.method === 'POST') {
    const player = playerFor(req)
    const input = await body(req)
    if (!validPlacement(input?.placement) || input.rulesVersion !== rulesVersion) throw failure(400, 'Invalid placement or game version.')
    const placement = normalize(input.placement)
    const issuedAt = Date.now()
    const challenge = input.challenge ? dailyChallenge(placement.event, issuedAt) : null
    if (challenge && (input.challenge !== challenge.id || challenge.lat !== placement.lat ||
      challenge.lon !== placement.lon || placement.theaterId !== undefined)) throw failure(409, 'Daily challenge has changed.')
    const seed = challenge?.seed ?? randomInt(1, 2 ** 31)
    const id = randomUUID()
    const payload = Buffer.from(JSON.stringify({ id, player, placement, seed, issuedAt, version: rulesVersion, challenge: challenge?.id })).toString('base64url')
    return response(res, 201, { id, seed, issuedAt, token: payload + '.' + hmac(payload) })
  }
  const runMatch = path.match(/^\/api\/runs\/([a-f0-9-]{36})\/submit$/)
  if (runMatch && req.method === 'POST') {
    const player = playerFor(req)
    const input = await body(req)
    const ticket = decodeTicket(input?.token)
    const name = typeof input.displayName === 'string' ? input.displayName.normalize('NFC').trim() : ''
    if ([...name].length < 2 || [...name].length > 24 || /[\p{Cc}\p{Cf}]/u.test(name)) throw failure(400, 'Use 2 to 24 characters for the display name.')
    if (ticket.id !== runMatch[1] || ticket.player !== player || ticket.version !== rulesVersion) throw failure(403, 'Run ticket belongs to another player or season.')
    const prior = recorded.get(ticket.id)
    if (prior) return response(res, 200, { id: prior.id, summary: JSON.parse(prior.summary) })
    if (Date.now() - ticket.issuedAt > 7 * 86400_000) throw failure(410, 'Run ticket expired.')
    const replay = input.replay
    if (!validPlacement(replay?.placement) || JSON.stringify(normalize(replay.placement)) !== JSON.stringify(ticket.placement) ||
      replay.seed !== ticket.seed || replay.startedAt !== ticket.issuedAt) throw failure(422, 'Replay does not match the issued run.')
    const result = await verify(replay)
    const replayHash = createHash('sha256').update(JSON.stringify(replay)).digest('hex')
    const summary = { ...result, id: ticket.id, replayHash, challenge: ticket.challenge }
    insert.run(ticket.id, player, name, rulesVersion, ticket.placement.event, ticket.placement.difficulty, Date.now(), JSON.stringify(summary))
    return response(res, 201, { id: ticket.id, summary })
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
    if (metric === 'mastery') {
      const rows = database.prepare(`
        WITH best AS (
          SELECT player, event, difficulty, MAX(json_extract(summary, '$.stars')) AS stars
          FROM scores WHERE version = ? AND submitted >= ? GROUP BY player, event, difficulty
        ), recent AS (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY player ORDER BY submitted DESC, id) AS n
          FROM scores WHERE version = ?
        )
        SELECT recent.*, SUM(best.stars) AS score FROM best JOIN recent USING (player) WHERE recent.n = 1
        GROUP BY best.player ORDER BY score DESC, recent.submitted ASC, recent.id LIMIT 50
      `).all(version, since, version)
      return response(res, 200, { rows: rows.map(publicRow), version })
    }
    const rows = database.prepare(`
      WITH eligible AS (
        SELECT *, CAST(json_extract(summary, ?) AS REAL) AS score
        FROM scores WHERE version = ? AND event = ? AND difficulty = ? AND submitted >= ?
          AND COALESCE(json_extract(summary, '$.challenge'), '') = ?
      ), ranked AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY player ORDER BY score DESC, submitted ASC, id) AS n
        FROM eligible WHERE score IS NOT NULL
      )
      SELECT * FROM ranked WHERE n = 1 ORDER BY score DESC, submitted ASC, id LIMIT 50
    `).all('$.metrics.' + metric, version, event, difficulty, since, challenge || '')
    return response(res, 200, { rows: rows.map(publicRow), version })
  }
  throw failure(404, 'Unknown API route.')
}

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' }
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname.startsWith('/api/')) {
      const origin = req.headers.origin
      if (origin) {
        const requestHost = req.headers.host
        if (!origins.has(origin) && new URL(origin).host !== requestHost) throw failure(403, 'Origin unavailable.')
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      }
      if (req.method === 'OPTIONS') return res.writeHead(204).end()
      return await handle(req, res, url)
    }
    const file = resolve(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1))
    if (!file.startsWith(root + sep) || !['GET', 'HEAD'].includes(req.method)) throw failure(404, 'Page unavailable.')
    if (!(await stat(file).catch(() => null))?.isFile()) throw failure(404, 'Page unavailable.')
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' })
    if (req.method === 'HEAD') return res.end()
    createReadStream(file).on('error', () => res.destroy()).pipe(res)
  } catch (error) {
    if (!error.status) console.error(error)
    response(res, error.status || 500, { error: error.status ? error.message : 'Score service encountered an error.' })
  }
}).listen(Number(process.env.PORT) || 4174, () => console.log('Stormwake score service ready.'))
