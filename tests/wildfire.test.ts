import { expect, it } from 'vitest'
import { makeDrop } from '../src/free-drop'
import { earnedStars } from '../src/campaign'
import { buyUpgrade, collectWeatherPickup, defaultSeed, startRun, tick, totals, useAbility, type Difficulty } from '../src/sim'
import { trees } from '../src/upgrades'
import { canIgnite, fireHistoryAt } from '../src/wildfire'

const point = (lat: number, lon: number) => ({ x: (lon + 180) * 10, y: (90 - lat) * 10 })
const california = makeDrop('Wildfire', 38.76, -120.58)
const foothillsNearLA = makeDrop('Wildfire', 34.22, -118.23)
const rare = makeDrop('Wildfire', 52.13, -106.67)

it('gates ignition by recorded vegetation burns and land coverage', () => {
  expect(fireHistoryAt(point(38.76, -120.58))).toBeGreaterThan(fireHistoryAt(point(52.13, -106.67)))
  for (const [lat, lon] of [[0, -140], [-86, 0], [25, 15]]) {
    expect(canIgnite(point(lat, lon))).toBe(false)
    const run = startRun(makeDrop('Wildfire', lat, lon), 0, 'Easy', defaultSeed)
    expect(run.end).toBe('Ignition unavailable here.')
    expect(useAbility(run)).toBeFalsy()
  }
})

it('matches the tornado tree and rewards a successful Hard run with the Expert unlock rating', () => {
  expect(trees.Wildfire).toHaveLength(trees.Tornado.length)
  const groups = (tree: typeof trees.Wildfire) => new Set(tree.map(item => item.group)).size
  expect(groups(trees.Wildfire)).toBe(groups(trees.Tornado))
  const run = simulate('Hard', foothillsNearLA)
  expect(run.upgrades).toContain('ember-storm')
  expect(run.fire!.spotfires).toBeGreaterThan(1)
  expect(earnedStars('Wildfire', 'Hard', totals(run).damage, !!run.end)).toBeGreaterThanOrEqual(3)
})

it('grows faster in frequent burn areas and responds to crew and aircraft pressure', () => {
  const frequent = simulate('Normal', california)
  const infrequent = simulate('Normal', rare)
  const harder = simulate('Hard', california)
  expect(frequent.fire!.areaKm2).toBeGreaterThan(infrequent.fire!.areaKm2 * 2)
  expect(frequent.fire!.areaKm2).toBeGreaterThan(harder.fire!.areaKm2)
  expect(harder.fire!.responseAt).toBeLessThan(frequent.fire!.responseAt!)
  expect(harder.fire!.aircraft).toBe(true)
  expect(harder.fire!.cells.size).toBeGreaterThan(1)
  expect([...harder.fire!.cells.values()].some(cell => cell.status === 'Contained')).toBe(true)
  expect([...simulate('Easy', california).fire!.cells.values()].some(cell => cell.status === 'Burned out')).toBe(true)
  expect([...frequent.fire!.cells.values()].every(cell => canIgnite(cell.point))).toBe(true)
})

it('spreads early and sustains a large unupgraded fire before naturally ending', () => {
  const run = startRun(california, 0, 'Normal', defaultSeed)
  while (run.time < 120 && !run.end) tick(run)
  expect(run.fire!.areaKm2).toBeGreaterThan(70)
  expect(run.fire!.containment).toBeLessThan(.15)
  while (run.time < 2400 && !run.end) tick(run)
  expect(run.end).toBeTruthy()
  expect(run.time).toBeGreaterThan(850)
  expect(run.fire!.areaKm2).toBeGreaterThan(4_000)
  expect(earnedStars('Wildfire', 'Normal', totals(run).damage, !!run.end)).toBeLessThan(3)
})

it('delays response and reduces line progress when containment upgrades are bought', () => {
  const base = startRun(california, 0, 'Hard', defaultSeed)
  const upgraded = startRun(california, 0, 'Hard', defaultSeed)
  for (const id of ['evacuation', 'fire-flanks']) expect(buyUpgrade(upgraded, id)).toBe(true)
  for (let tickCount = 0; tickCount < 164; tickCount++) {
    tick(base)
    tick(upgraded)
  }
  expect(upgraded.fire!.responseAt).toBeGreaterThan(base.fire!.responseAt!)
  expect(upgraded.fire!.cells.get('0,0')!.line).toBeLessThan(base.fire!.cells.get('0,0')!.line)
  expect(upgraded.fire!.areaKm2).toBeGreaterThan(base.fire!.areaKm2)
})

function simulate(difficulty: Difficulty, theater: typeof california) {
  const run = startRun(theater, 0, difficulty, defaultSeed)
  const specialty = trees.Wildfire.filter(item => item.group === 'Ember spotting')
  for (let i = 0; i < 2400 && !run.end; i++) {
    if (run.pickup) collectWeatherPickup(run, run.pickup.time)
    for (const upgrade of specialty) buyUpgrade(run, upgrade.id)
    if (i % 16 === 0) useAbility(run)
    tick(run)
  }
  return run
}
