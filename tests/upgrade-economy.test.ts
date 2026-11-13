import { expect, it } from 'vitest'
import { makeDrop } from '../src/free-drop'
import { buyUpgrade, defaultSeed, removeUpgrade, startRun, upgradeCost, upgradeRefund } from '../src/sim'
import { trees } from '../src/upgrades'

it.each([
  ['Easy', 5, 7, 4, 3],
  ['Normal', 6, 8, 3, 2],
  ['Hard', 6, 8, 2, 1],
  ['Expert', 7, 9, 0, 0],
] as const)('prices Damage gains and keeps refunds based on the amount paid on %s', (difficulty, price, vortexPrice, firstRefund, secondRefund) => {
  const run = startRun(makeDrop('Tornado', 37.69, -97.34), 0, difficulty, defaultSeed)
  run.momentum = 500
  const travel = trees.Tornado.find(item => item.id === 'tornado-track-feed')!
  expect(upgradeCost(run, travel)).toBe(price)
  expect(buyUpgrade(run, 'vortex')).toBe(true)
  expect(run.upgradePayments.get('vortex')).toBe(vortexPrice)
  expect(upgradeCost(run, travel)).toBe(price)
  expect(buyUpgrade(run, 'rear-flank')).toBe(true)
  expect(upgradeCost(run, travel)).toBe(price)
  expect(buyUpgrade(run, 'tornado-vortex-breakdown')).toBe(true)
  const corePrice = run.upgradePayments.get('tornado-vortex-breakdown')!
  const balance = run.momentum
  expect(removeUpgrade(run, 'vortex')).toBe(false)
  expect(upgradeRefund(run, 'rear-flank')).toBe(firstRefund)
  expect(removeUpgrade(run, 'tornado-vortex-breakdown')).toBe(true)
  const thirdRefund = Math.floor(corePrice * ({ Easy: .5, Normal: .35, Hard: .25, Expert: 0 })[difficulty])
  expect(run.momentum).toBe(balance + thirdRefund)
  expect(run.effects.wind).toBe(55)
  expect(upgradeRefund(run, 'rear-flank')).toBe(secondRefund)
  expect(removeUpgrade(run, 'rear-flank')).toBe(true)
  expect(run.effects.wind).toBe(24)
  expect(upgradeCost(run, travel)).toBe(price)
})

it('lets players specialize in one ability without buying another branch', () => {
  const run = startRun(makeDrop('Tornado', 37.69, -97.34), 0, 'Easy', defaultSeed)
  run.momentum = 100
  for (const path of [
    ['tornado-cold-pool', 'tornado-baroclinic', 'tornado-inflow-coupling'],
    ['tornado-response', 'tornado-grid', 'tornado-warning-overload'],
    ['tornado-satellite-seed', 'tornado-satellite-lobes', 'tornado-satellite-split'],
  ]) {
    expect(buyUpgrade(run, path[2])).toBe(false)
    for (const id of path) expect(buyUpgrade(run, id)).toBe(true)
    expect(removeUpgrade(run, path[0])).toBe(false)
  }
})
