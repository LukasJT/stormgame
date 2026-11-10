import { expect, it } from 'vitest'
import { makeHurricaneDrop } from '../src/free-drop'
import { momentumSchedule, startingMomentum } from '../src/momentum'
import { thunderstormTypes } from '../src/hazards'
import { abilityCost, activeStorm, buyUpgrade, collectWeatherPickup, defaultSeed, startRun, stormStats, tick, useAbility } from '../src/sim'
import { trees } from '../src/upgrades'
import { theaters, type Storm } from '../src/world'

const scenarios = [
  ['Hurricane', 'marine'],
  ['Blizzard', 'whiteout-lock'],
  ['Wildfire', 'ember-storm'],
  ['Dust Storm', 'hazard-dominance'],
  ['Heat Dome', 'hazard-dominance'],
  ...thunderstormTypes.map(storm => [storm, 'track-control'] as const),
] as const satisfies readonly (readonly [Storm, string])[]

it.each(scenarios)('%s can complete a specialty using earned Medium Momentum', (storm, capstone) => {
  const type = thunderstormTypes.find(type => type === storm)
  const theater = theaters.find(theater => theater.storm === (type ? 'Thunderstorm' : storm))!
  const run = startRun(type ? { ...theater, storm: type } : theater, storm === 'Hurricane' ? 1 : 0, 'Normal', defaultSeed)
  const tree = trees[storm]
  const focus = tree.find(upgrade => upgrade.id === capstone)!
  const specialty = tree.filter(upgrade => upgrade.group === focus.group)
  expect(specialty.filter(upgrade => !upgrade.requires && !upgrade.requiresAll && upgrade.cost <= run.momentum).length).toBeGreaterThanOrEqual(2)
  expect(buyUpgrade(run, capstone)).toBe(false)
  while (!run.end && !run.upgrades.includes(capstone) && run.time < 1_200) {
    if (run.pickup) collectWeatherPickup(run, run.pickup.time)
    for (const upgrade of specialty) buyUpgrade(run, upgrade.id)
    if (run.fire && run.time % 16 === 0) useAbility(run)
    tick(run)
  }
  expect(run.upgrades, `${run.time}s elapsed, ${run.momentum} Momentum left`).toContain(capstone)
  expect(run.upgrades.length).toBeLessThan(tree.length)
})


it('supports separate wind and warm-water builds while keeping unupgraded hurricanes below Category 1', () => {
  const theater = makeHurricaneDrop(22, -90)
  const base = startRun(theater, 0, 'Normal', defaultSeed)
  const wind = startRun(theater, 0, 'Normal', defaultSeed)
  const ocean = startRun(theater, 0, 'Normal', defaultSeed)
  wind.momentum = ocean.momentum = 100
  for (const id of ['eye', 'rapid', 'eyewall-jet', 'eyewall-peak']) expect(buyUpgrade(wind, id)).toBe(true)
  for (const id of ['warm', 'deep', 'moist-inflow', 'surface-flux', 'marine']) expect(buyUpgrade(ocean, id)).toBe(true)
  const startingWind = stormStats(base).windMph
  expect(stormStats(ocean).windMph).toBe(startingWind)
  expect(stormStats(wind).windMph).toBeGreaterThan(startingWind)
  for (let i = 0; i < 360; i++) for (const run of [base, wind, ocean]) tick(run)
  expect(base.cyclone!.peakWind).toBeGreaterThan(startingWind)
  expect(base.cyclone!.peakWind).toBeLessThan(74)
  expect(wind.cyclone!.peakWind).toBeGreaterThanOrEqual(130)
  expect(ocean.cyclone!.peakWind).toBeGreaterThanOrEqual(130)
  expect(trees.Hurricane).toHaveLength(trees.Tornado.length)
})


it('matches the tornado tree size and Momentum economy', () => {
  const groups = (storm: Storm) => new Set(trees[storm].map(upgrade => upgrade.group)).size
  expect(trees.Thunderstorm).toHaveLength(trees.Tornado.length)
  expect(groups('Thunderstorm')).toBe(groups('Tornado'))
  expect(startingMomentum('Thunderstorm')).toBe(startingMomentum('Tornado'))
  const schedule = momentumSchedule(defaultSeed, 'Thunderstorm')
  const tornado = momentumSchedule(defaultSeed, 'Tornado')
  expect(schedule.awards).toHaveLength(tornado.awards.length)
  expect(schedule.pickups).toHaveLength(tornado.pickups.length)
  schedule.awards.forEach((award, index) => {
    expect(award.time - index * 23).toBeGreaterThanOrEqual(12)
    expect(award.time - index * 23).toBeLessThan(27)
    expect([2, 3]).toContain(award.points)
  })
  schedule.pickups.forEach((pickup, index) => {
    expect(pickup.time - index * 48).toBeGreaterThanOrEqual(22)
    expect(pickup.time - index * 48).toBeLessThan(31)
    expect([3, 4, 5]).toContain(pickup.points)
  })
})

it.each([
  ['Easy', 'Bowing Line', 'Squall'],
  ['Normal', 'Long-Lived Cluster', 'Multicell'],
  ['Hard', 'Precision Touchdown', 'Supercell'],
  ['Expert', 'Precision Touchdown', 'Supercell'],
] as const)('can specialize on %s with earned points', (difficulty, name, form) => {
  const theater = theaters.find(theater => theater.id === 'thunderstorm-plains')!
  const run = startRun(theater, 0, difficulty, defaultSeed)
  const capstone = trees.Thunderstorm.find(upgrade => upgrade.name === name)!
  const specialty = trees.Thunderstorm.filter(upgrade => upgrade.group === capstone.group)
  let pickedUp = 0
  while (!run.end && !run.upgrades.includes(capstone.id) && run.time < 600) {
    if (run.pickup) {
      pickedUp += run.pickup.points
      collectWeatherPickup(run, run.pickup.time)
    }
    for (const upgrade of specialty) buyUpgrade(run, upgrade.id)
    if (run.charge >= abilityCost(run) && run.time % 23 === 0) useAbility(run)
    tick(run)
  }
  expect(run.upgrades).toContain(capstone.id)
  expect(activeStorm(run)).toBe(form)
  expect(run.front?.funnels.length).toBeGreaterThan(0)
  expect(run.impactCredit).toBeGreaterThan(0)
  const scheduled = run.momentumSchedule.awards.filter(award => award.time <= run.time).reduce((sum, award) => sum + award.points, 0)
  const paid = [...run.upgradePayments.values()].reduce((sum, cost) => sum + cost, 0)
  expect(run.momentum + paid - scheduled - pickedUp - startingMomentum('Thunderstorm'))
    .toBe(Math.min(32, Math.floor(Math.sqrt(run.impactCredit / 125_000_000))))
})
