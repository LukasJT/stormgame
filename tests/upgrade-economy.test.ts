import { expect, it } from 'vitest'
import { makeDrop } from '../src/free-drop'
import { buyUpgrade, defaultSeed, removeUpgrade, startRun, upgradeCost, upgradeRefund } from '../src/sim'
import { trees } from '../src/upgrades'

it.each([
  ['Easy', 4, 8, 9, 9, 4, 3],
  ['Normal', 4, 9, 10, 10, 3, 2],
  ['Hard', 5, 10, 11, 11, 2, 1],
  ['Expert', 5, 11, 12, 12, 0, 0],
] as const)('prices Damage gains and keeps refunds based on the amount paid on %s', (difficulty, price, vortexPrice, rearPrice, corePrice, firstRefund, secondRefund) => {
  const run = startRun(makeDrop('Tornado', 37.69, -97.34), 0, difficulty, defaultSeed)
  run.momentum = 500
  const travel = trees.Tornado.find(item => item.id === 'tornado-track-feed')!
  expect(upgradeCost(run, travel)).toBe(price)
  expect(buyUpgrade(run, 'vortex')).toBe(true)
  expect(upgradeCost(run, travel)).toBe(price)
  expect(buyUpgrade(run, 'rear-flank')).toBe(true)
  expect(upgradeCost(run, travel)).toBe(price)
  expect(buyUpgrade(run, 'tornado-vortex-breakdown')).toBe(true)
  expect(removeUpgrade(run, 'vortex')).toBe(false)
  expect(upgradeRefund(run, 'rear-flank')).toBe(firstRefund)
  expect(removeUpgrade(run, 'tornado-vortex-breakdown')).toBe(true)
  const thirdRefund = Math.floor(corePrice * ({ Easy: .5, Normal: .35, Hard: .25, Expert: 0 })[difficulty])
  expect(run.momentum).toBe(500 - vortexPrice - rearPrice - corePrice + thirdRefund)
  expect(run.effects.wind).toBe(55)
  expect(upgradeRefund(run, 'rear-flank')).toBe(secondRefund)
  expect(removeUpgrade(run, 'rear-flank')).toBe(true)
  expect(run.effects.wind).toBe(24)
  expect(upgradeCost(run, travel)).toBe(price)
})

it('requires both hot and cold branches for their shared upgrade', () => {
  const run = startRun(makeDrop('Tornado', 37.69, -97.34), 0, 'Easy', defaultSeed)
  run.momentum = 100
  for (const id of ['tornado-cold-pool', 'tornado-baroclinic']) expect(buyUpgrade(run, id)).toBe(true)
  expect(buyUpgrade(run, 'tornado-inflow-coupling')).toBe(false)
  for (const id of ['tornado-mixed-layer', 'tornado-heat-flux', 'tornado-inflow-coupling']) expect(buyUpgrade(run, id)).toBe(true)
  expect(removeUpgrade(run, 'tornado-heat-flux')).toBe(false)
})
