import { createReadStream, readFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { Readable } from 'node:stream'
import { Worker } from 'node:worker_threads'
import * as engine from '../dist-engine/replay.js'
import { createScoreApi } from './score-api.mjs'

const root = resolve('dist')
const database = new DatabaseSync(process.env.STORMWAKE_DB || 'stormwake.sqlite')
database.exec('PRAGMA journal_mode = WAL;' + readFileSync(new URL('../drizzle/0000_scores.sql', import.meta.url), 'utf8'))
const query = {
  first: (sql, ...params) => database.prepare(sql).get(...params),
  all: (sql, ...params) => database.prepare(sql).all(...params),
  run: (sql, ...params) => database.prepare(sql).run(...params),
}
const scoreApi = createScoreApi({
  engine, query, verify, secret: process.env.STORMWAKE_SECRET,
  origins: (process.env.STORMWAKE_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
})
function failure(status, message) { return Object.assign(new Error(message), { status }) }

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

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' }
createServer(async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'
    const url = new URL(req.url, protocol + '://' + (req.headers.host || 'localhost'))
    if (url.pathname.startsWith('/api/')) {
      const request = new Request(url, {
        headers: req.headers, method: req.method,
        ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: Readable.toWeb(req), duplex: 'half' } : {}),
      })
      const result = await scoreApi(request, req.socket.remoteAddress)
      res.writeHead(result.status, Object.fromEntries(result.headers))
      res.end(await result.text())
      return
    }
    const file = resolve(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1))
    if (!file.startsWith(root + sep) || !['GET', 'HEAD'].includes(req.method)) throw failure(404, 'Page unavailable.')
    if (!(await stat(file).catch(() => null))?.isFile()) throw failure(404, 'Page unavailable.')
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' })
    if (req.method === 'HEAD') return res.end()
    createReadStream(file).on('error', () => res.destroy()).pipe(res)
  } catch (error) {
    if (!error.status) console.error(error)
    res.writeHead(error.status || 500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ error: error.status ? error.message : 'Score service encountered an error.' }))
  }
}).listen(Number(process.env.PORT) || 4174, () => console.log('Stormwake score service ready.'))
