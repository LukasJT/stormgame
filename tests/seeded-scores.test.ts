import { expect, it, vi } from 'vitest'
import { createScoreApi } from '../server/score-api.mjs'
import * as engine from '../src/replay'
import { campaign, difficulties } from '../src/campaign'

const scoreApi = createScoreApi({
  engine,
  secret: 'local-seeded-scores-test-secret-not-for-production',
  query: { all: async () => [] },
})

async function board(filters: Record<string, string>, api = scoreApi) {
  const response = await api(new Request('https://example.test/api/leaderboards?' + new URLSearchParams(filters)))
  expect(response.status).toBe(200)
  return response.json()
}

it('ranks seeded runs across every event, difficulty and metric with weak and four-star results', async () => {
  let damageCount = 0
  for (const event of campaign) for (const difficulty of difficulties) {
    const filters = { event, difficulty, metric: 'damage' }
    const { rows } = await board(filters)
    expect(rows.length).toBeGreaterThanOrEqual(6)
    expect(rows.length).toBeLessThanOrEqual(60)
    damageCount += rows.length
    const [twoStars, , fourStars, fiveStars] = engine.damageTargets(event, difficulty)
    expect(rows.some(({ score }) => score < twoStars / 10)).toBe(true)
    expect(rows[0].score).toBeGreaterThanOrEqual(fourStars)
    expect(rows[0].score).toBeLessThan(fiveStars)
    const names = rows.map(({ name }) => name).sort()
    expect(new Set(names).size).toBe(rows.length)
    for (const metric of [...engine.commonMetrics, ...engine.eventMetrics[event]]) {
      const result = await board({ ...filters, metric })
      expect(result.rows.map(({ name }) => name).sort()).toEqual(names)
      expect(result.rows.every(({ score }) => Number.isFinite(score) && score >= 0)).toBe(true)
      expect(result.rows.map(({ score }) => score)).toEqual(result.rows.map(({ score }) => score).sort((a, b) => b - a))
    }
  }
  expect(damageCount).toBe(551)
})

it('includes campaign-star totals and keeps daily and archived boards for submitted runs', async () => {
  const mastery = await board({ event: 'Tornado', difficulty: 'Normal', metric: 'mastery' })
  expect(mastery.rows).toHaveLength(60)
  expect((await board({ challenge: '2026-11-15' })).rows).toEqual([])
  expect((await board({ version: 'archived' })).rows).toEqual([])
  vi.useFakeTimers()
  try {
    vi.setSystemTime(new Date('2026-11-20T00:00:00Z'))
    expect((await board({ period: 'month' })).rows).toHaveLength(54)
    vi.setSystemTime(new Date('2026-12-01T00:00:00Z'))
    expect((await board({ period: 'month' })).rows).toHaveLength(0)
  } finally {
    vi.useRealTimers()
  }
})

it('orders submitted and seeded results together and honors the 60-place limit', async () => {
  const submitted = { player: 'abcdefguest', display_name: 'Actual player', submitted: 1,
    summary: JSON.stringify({ placement: { event: 'Tornado', difficulty: 'Easy' } }) }
  const api = createScoreApi({
    engine,
    secret: 'local-seeded-scores-test-secret-not-for-production',
    query: { all: async () => [
      { ...submitted, id: 'winning-run', score: 2_000_000_000 },
      { ...submitted, id: 'middle-run', score: 215_000_000 },
    ] },
  })
  const { rows } = await board({ difficulty: 'Easy' }, api)
  expect(rows).toHaveLength(60)
  expect(rows[0].id).toBe('winning-run')
  expect(rows[1].id).toMatch(/^seed-/)
  const middle = rows.findIndex(({ id }) => id === 'middle-run')
  expect(middle).toBeGreaterThan(1)
  expect(rows[middle - 1].score).toBeGreaterThanOrEqual(rows[middle].score)
  expect(rows[middle + 1].score).toBeLessThanOrEqual(rows[middle].score)
})
