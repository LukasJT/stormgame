import { expect, it } from 'vitest'
import { createScoreApi } from '../server/score-api.mjs'
import * as engine from '../src/replay'
import { campaign, difficulties } from '../src/campaign'

const scoreApi = createScoreApi({
  engine,
  secret: 'local-demo-scores-test-secret-not-for-production',
  query: { all: async () => [] },
})

async function board(filters: Record<string, string>) {
  const response = await scoreApi(new Request('https://example.test/api/leaderboards?' + new URLSearchParams(filters)))
  expect(response.status).toBe(200)
  return response.json()
}

it('offers modest, deterministic demo results across every event, difficulty and metric', async () => {
  let damageCount = 0
  for (const event of campaign) for (const difficulty of difficulties) {
    const filters = { event, difficulty, metric: 'damage' }
    const { rows, demos } = await board(filters)
    expect(rows).toEqual([])
    expect(demos.length).toBeGreaterThanOrEqual(6)
    expect(demos.length).toBeLessThanOrEqual(60)
    damageCount += demos.length
    const [twoStars, threeStars, fourStars] = engine.damageTargets(event, difficulty)
    expect(demos.some(({ score }) => score < twoStars / 10)).toBe(true)
    expect(demos.some(({ score }) => score >= twoStars)).toBe(true)
    expect(demos[0].score).toBeLessThan(fourStars)
    expect(demos[0].score).toBeLessThanOrEqual(threeStars * 1.151)
    const names = demos.map(({ name }) => name).sort()
    expect(new Set(names).size).toBe(demos.length)
    for (const metric of [...engine.commonMetrics, ...engine.eventMetrics[event]]) {
      const result = await board({ ...filters, metric })
      expect(result.demos.map(({ name }) => name).sort()).toEqual(names)
      expect(result.demos.every(({ score }) => Number.isFinite(score) && score >= 0)).toBe(true)
      expect(result.demos.map(({ score }) => score)).toEqual(result.demos.map(({ score }) => score).sort((a, b) => b - a))
    }
    expect((await board({ ...filters, period: 'month' })).demos).toEqual(demos)
  }
  expect(damageCount).toBe(551)
})

it('includes campaign-star examples and keeps daily and archived boards for verified play', async () => {
  const mastery = await board({ event: 'Tornado', difficulty: 'Normal', metric: 'mastery' })
  expect(mastery.demos).toHaveLength(24)
  expect(mastery.rows).toEqual([])
  expect((await board({ challenge: '2026-11-15' })).demos).toEqual([])
  expect((await board({ version: 'archived' })).demos).toEqual([])
})
