import { expect, it, vi } from 'vitest'
import * as census from '../src/census'
import { makeDrop } from '../src/free-drop'
import { buyUpgrade, defaultSeed, impactAreas, setCourse, startRun, tick, totals } from '../src/sim'
import { project } from '../src/world'

function gtaForecast() {
  const run = startRun(makeDrop('Tornado', 43.50, -79.72), 0, 'Normal', defaultSeed)
  run.momentum = 200
  for (const upgrade of ['vortex', 'rear-flank', 'tornado-vortex-breakdown', 'tornado-inner-core',
    'wide-funnel', 'satellite', 'wedge', 'multi-vortex',
    'tornado-thermal', 'tornado-organize', 'tornado-course']) {
    expect(buyUpgrade(run, upgrade)).toBe(true)
  }
  expect(setCourse(run, project(43.84, -79.09))).toBe(true)
  while (!run.end && run.time < 245) tick(run)
  return run
}

it('uses GTA census divisions along a moving EF5 tornado track', () => {
  const regional = gtaForecast()
  const nearbyLookup = vi.spyOn(census, 'nearbyCensus').mockReturnValue(undefined)
  const censusLookup = vi.spyOn(census, 'gtaCensusDivision').mockReturnValue(undefined)
  let fallback: ReturnType<typeof gtaForecast>
  try {
    fallback = gtaForecast()
  } finally {
    censusLookup.mockRestore()
    nearbyLookup.mockRestore()
  }

  expect(regional.tornado?.peakEf).toBe(5)
  const scheduled = regional.momentumSchedule.awards.filter(award => award.time <= regional.time)
    .reduce((points, award) => points + award.points, 0)
  const paid = [...regional.upgradePayments.values()].reduce((points, price) => points + price, 0)
  const damagePoints = regional.momentum + paid - 200 - scheduled
  expect(damagePoints).toBeGreaterThan(0)
  expect(damagePoints).toBeLessThanOrEqual(32)
  const sources = impactAreas(regional).filter(area => area.site.loss).map(area => area.zone.source)
  expect(sources).toContain('Toronto, ON · Canadian census division')
  expect(sources).toContain('Peel, ON · Canadian census division')
  expect(totals(regional).damage).toBeGreaterThan(totals(fallback).damage * 50)
  expect(totals(regional).deaths).toBeGreaterThan(totals(fallback).deaths * 50)
})

it('uses a mapped region outside North America when population and boundaries are available', async () => {
  const { getRegions } = await import('../src/regions')
  const { localExposureAt } = await import('../src/world')
  const center = project(48.86, 2.35)
  const ring = [[center.x - 1, center.y - 1], [center.x + 1, center.y - 1],
    [center.x + 1, center.y + 1], [center.x - 1, center.y + 1]]
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
    { id: 'Paris', name: 'Paris', pop: 2_000_000, polygons: [[ring]] },
  ])))
  try {
    await getRegions('FR')
  } finally {
    fetch.mockRestore()
  }
  const region = localExposureAt('FR', 48.86, 2.35)
  expect(region).toMatchObject({ id: 'Paris', pop: 2_000_000 })
  expect(region?.d).toBeGreaterThan(10_000)
  expect(localExposureAt('FR', 45.76, 4.84)).toBeUndefined()
})
