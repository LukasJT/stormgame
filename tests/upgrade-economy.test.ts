import { expect, it } from 'vitest'
import { makeDrop } from '../src/free-drop'
import { buyUpgrade, defaultSeed, removeUpgrade, startRun, upgradeCost, upgradeRefund } from '../src/sim'
import { trees } from '../src/upgrades'

it.each([
  ['Easy', [4, 4, 4], 3, 2],
  ['Normal', [4, 4, 5], 2, 1],
  ['Hard', [4, 5, 6], 2, 1],
  ['Expert', [4, 6, 8], 0, 0],
] as const)('scales purchase prices and diminishing refunds on %s', (difficulty, prices, firstRefund, secondRefund) => {
  const run = startRun(makeDrop('Tornado', 37.69, -97.34), 0, difficulty, defaultSeed)
  run.momentum = 500
  const travel = trees.Tornado.find(item => item.id === 'tornado-track-feed')!
  expect(upgradeCost(run, travel)).toBe(prices[0])
  expect(buyUpgrade(run, 'vortex')).toBe(true)
  expect(upgradeCost(run, travel)).toBe(prices[1])
  expect(buyUpgrade(run, 'rear-flank')).toBe(true)
  expect(upgradeCost(run, travel)).toBe(prices[2])
  expect(buyUpgrade(run, 'tornado-vortex-breakdown')).toBe(true)
  expect(removeUpgrade(run, 'vortex')).toBe(false)
  expect(upgradeRefund(run, 'rear-flank')).toBe(firstRefund)
  expect(removeUpgrade(run, 'tornado-vortex-breakdown')).toBe(true)
  const baseThird = 11 + prices[2] - 4
  const thirdRefund = Math.floor(baseThird * ({ Easy: .5, Normal: .35, Hard: .25, Expert: 0 })[difficulty])
  expect(run.momentum).toBe(500 - 4 - (7 + prices[1] - 4) - baseThird + thirdRefund)
  expect(run.effects.wind).toBe(55)
  expect(upgradeRefund(run, 'rear-flank')).toBe(secondRefund)
  expect(removeUpgrade(run, 'rear-flank')).toBe(true)
  expect(run.effects.wind).toBe(24)
  expect(upgradeCost(run, travel)).toBeGreaterThanOrEqual(prices[2])
})

it('requires both hot and cold branches for their shared upgrade', () => {
  const run = startRun(makeDrop('Tornado', 37.69, -97.34), 0, 'Easy', defaultSeed)
  run.momentum = 100
  for (const id of ['tornado-cold-pool', 'tornado-baroclinic']) expect(buyUpgrade(run, id)).toBe(true)
  expect(buyUpgrade(run, 'tornado-inflow-coupling')).toBe(false)
  for (const id of ['tornado-mixed-layer', 'tornado-heat-flux', 'tornado-inflow-coupling']) expect(buyUpgrade(run, id)).toBe(true)
  expect(removeUpgrade(run, 'tornado-heat-flux')).toBe(false)
})
