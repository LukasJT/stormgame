import { expect, it } from 'vitest'
import { thunderstormTypes } from '../src/hazards'
import { buyUpgrade, chooseThunderstormType, collectWeatherPickup, defaultSeed, startRun, tick, useAbility } from '../src/sim'
import { trees } from '../src/upgrades'
import { theaters, type Storm } from '../src/world'

const scenarios = [
  ['Hurricane', 'marine'],
  ['Blizzard', 'whiteout-lock'],
  ['Wildfire', 'ember-storm'],
  ['Flooding', 'hazard-dominance'],
  ['Dust Storm', 'hazard-dominance'],
  ['Heat Dome', 'hazard-dominance'],
  ...thunderstormTypes.map(storm => [storm, 'track-control'] as const),
] as const satisfies readonly (readonly [Storm, string])[]

it.each(scenarios)('%s can complete a specialty using earned Medium Momentum', (storm, capstone) => {
  const type = thunderstormTypes.find(type => type === storm)
  const theater = theaters.find(theater => theater.storm === (type ? 'Thunderstorm' : storm))!
  const run = startRun(theater, storm === 'Hurricane' ? 1 : 0, 'Normal', defaultSeed)
  if (type) expect(chooseThunderstormType(run, type)).toBe(true)
  const tree = trees[storm]
  const focus = tree.find(upgrade => upgrade.id === capstone)!
  const specialty = tree.filter(upgrade => upgrade.group === focus.group)
  expect(specialty.filter(upgrade => !upgrade.requires && !upgrade.requiresAll && upgrade.cost <= run.momentum).length).toBeGreaterThanOrEqual(2)
  expect(buyUpgrade(run, capstone)).toBe(false)
  while (!run.end && !run.upgrades.includes(capstone) && run.time < 1_200) {
    if (run.pickup) collectWeatherPickup(run, run.pickup.time)
    for (const upgrade of specialty) buyUpgrade(run, upgrade.id)
    tick(run)
  }
  expect(run.upgrades, `${run.time}s elapsed, ${run.momentum} Momentum left`).toContain(capstone)
  expect(run.upgrades.length).toBeLessThan(tree.length)
})


it('lets a breach cascade overtop a second neighboring land zone', () => {
  const theater = theaters.find(theater => theater.storm === 'Flooding')!
  const base = startRun(theater, 0, 'Easy', defaultSeed)
  const upgraded = startRun(theater, 0, 'Easy', defaultSeed)
  upgraded.momentum = 50
  for (const id of ['impact', 'footprint', 'mastery', 'bank-erosion', 'hazard-dominance']) {
    expect(buyUpgrade(upgraded, id)).toBe(true)
  }
  useAbility(base)
  useAbility(upgraded)
  expect(base.pulses).toHaveLength(2)
  expect(upgraded.pulses).toHaveLength(3)
  expect(upgraded.pulses[0].damage).toBeGreaterThan(base.pulses[0].damage)
})
