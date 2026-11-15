import * as engine from '../src/replay.ts'
import { createScoreApi } from './score-api.mjs'

const origins = [
  'https://playstormwake.com',
  'https://www.playstormwake.com',
  'https://lukasjt.github.io',
  'https://stormwake-forecast.lukajt.chatgpt.site',
]

let scoreApi
async function verify(replay) {
  try {
    return await engine.verifyReplay(replay)
  } catch (error) {
    const status = error.message === 'Regional exposure data is unavailable.' ? 503 : 422
    throw Object.assign(error, { status })
  }
}

export default {
  fetch(request, env) {
    if (!scoreApi) {
      const query = {
        first: (sql, ...params) => env.DB.prepare(sql).bind(...params).first(),
        all: async (sql, ...params) => (await env.DB.prepare(sql).bind(...params).all()).results,
        run: (sql, ...params) => env.DB.prepare(sql).bind(...params).run(),
      }
      scoreApi = createScoreApi({ engine, secret: env.STORMWAKE_SECRET, query, verify, origins })
    }
    return scoreApi(request, request.headers.get('CF-Connecting-IP'))
  },
}
