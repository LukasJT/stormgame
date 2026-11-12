import { expect, it } from 'vitest'
import { lakeAt, makeDrop } from '../src/free-drop'
import { latitudeAt, longitudeAt } from '../src/cyclone'
import { landAt } from '../src/convection'
import { buyUpgrade, collectWeatherPickup, defaultSeed, startRun, tick } from '../src/sim'

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
})

it('lets an Alberta Clipper buy persistence with earned points and rebuild over Lake Superior', () => {
  const theater = makeDrop('Blizzard', 51.19, -114.47)
  const stock = startRun(theater, 0, 'Normal', defaultSeed)
  const upgraded = startRun(theater, 0, 'Normal', defaultSeed)
  const plan = ['snow-support', 'snow-reserve', 'polar-lock', 'snow-lake', 'snow-lake-band']
  const overSuperior = (run: typeof stock) => {
    const point = run.front!.point
    return lakeAt(latitudeAt(point), longitudeAt(point)) === 'Lake Superior'
  }
  while (!stock.end && stock.time < 1800 && !overSuperior(stock)) tick(stock)
  expect(stock.end).toBeTruthy()
  expect(overSuperior(stock)).toBe(false)
  while (!upgraded.end && upgraded.time < 1800 && !overSuperior(upgraded)) {
    if (upgraded.pickup) collectWeatherPickup(upgraded, upgraded.pickup.time)
    for (const id of plan) buyUpgrade(upgraded, id)
    tick(upgraded)
  }
  expect(upgraded.upgrades).toEqual(expect.arrayContaining(plan))
  expect(overSuperior(upgraded)).toBe(true)
  const arrival = upgraded.strength
  const support = upgraded.support
  for (let i = 0; i < 40; i++) tick(upgraded)
  expect(upgraded.snow!.source).toBe('Lake Superior')
  expect(upgraded.strength).toBeGreaterThan(arrival + 3)
  expect(upgraded.support).toBeGreaterThan(support)
  expect(upgraded.events.some(event => event.text.includes('Alberta Clipper rebuilds over Lake Superior'))).toBe(true)
}, 20000)

it('takes a weakening Nor’easter from New England to Newfoundland', () => {
  const run = startRun(makeDrop('Blizzard', 41.7, -70.3), 0, 'Normal', defaultSeed)
  expect(run.blizzardPattern).toBe("Nor'easter")
  const atNewfoundland = () => {
    const point = run.front!.point
    const lat = latitudeAt(point)
    const lon = longitudeAt(point)
    return lat >= 47.1 && lat <= 51.7 && lon >= -59.6 && lon <= -52.5 && landAt(point).code === 'CA'
  }
  let peak = run.strength
  while (!run.end && !atNewfoundland() && run.time < 1400) {
    peak = Math.max(peak, run.strength)
    tick(run)
  }
  expect(atNewfoundland()).toBe(true)
  expect(run.end).toBeNull()
  expect(run.strength).toBeLessThan(peak)
}, 20000)
