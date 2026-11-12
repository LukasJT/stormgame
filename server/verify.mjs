import { parentPort } from 'node:worker_threads'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { verifyReplay } from '../dist-engine/replay.js'

const root = resolve('dist')
globalThis.fetch = async input => {
  const path = resolve(root, String(input).replace(/^\//, ''))
  if (!path.startsWith(root + sep)) return new Response(null, { status: 400 })
  try { return new Response(await readFile(path)) } catch { return new Response(null, { status: 404 }) }
}
parentPort.on('message', async replay => {
  try { parentPort.postMessage({ result: await verifyReplay(replay) }) }
  catch (error) { parentPort.postMessage({ error: error.message }) }
})
