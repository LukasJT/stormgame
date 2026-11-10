import { expect, it } from 'vitest'
import { makeDrop } from '../src/free-drop'
import { buyUpgrade, defaultSeed, startRun, tick } from '../src/sim'
import { trees } from '../src/upgrades'

function forecast(lat: number, lon: number, upgrades: string[] = []) {
  const run = startRun(makeDrop('Blizzard', lat, lon), 0, 'Normal', defaultSeed)
  run.momentum = 500
  for (const id of upgrades) expect(buyUpgrade(run, id)).toBe(true)
  const sources = new Set<string>()
  while (!run.end && run.time < 180) {
    tick(run)
    if (run.snow?.source) sources.add(run.snow.source)
  }
  const peak = Math.max(...[...run.snow!.deposits.values()].map(({ cm }) => cm))
  return { run, peak, sources }
}

it('produces deeper snow and depth reports after crossing a lake or the ocean', () => {
  const dry = forecast(51.05, -114.07)
  const lake = forecast(43.4, -87.1)
  const coast = forecast(42.8, 139.4)
  expect(dry.sources.size).toBe(0)
  expect(lake.sources.has('Lake Michigan')).toBe(true)
  expect(coast.sources.has('ocean')).toBe(true)
  for (const wet of [lake, coast]) {
    expect(wet.peak).toBeGreaterThan(dry.peak * 2)
    expect(wet.run.events.some(event => (event.snowfall?.cm ?? 0) >= 5)).toBe(true)
  }
})

it('deepens snowfall and can create a whiteout through upgrades alone', () => {
  const base = forecast(43.4, -87.1)
  const evolved = forecast(43.4, -87.1, [
    'gust-front', 'snow-gusts', 'snow-crystals', 'snow-aggregates', 'snow-lift', 'snow-dump',
  ])
  expect(evolved.peak).toBeGreaterThan(base.peak)
  expect(evolved.run.snow!.longestWhiteout).toBeGreaterThan(0)
  expect(trees.Blizzard).toHaveLength(trees.Tornado.length)
})
