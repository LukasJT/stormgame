import { trees, type Effects, type Upgrade } from './upgrades'
import type { Storm } from './world'
import { isCampaignEvent } from './campaign'

export const evolutionStats = ['damage', 'lifespan', 'resistance'] as const
type Stat = typeof evolutionStats[number]
type Ratings = Record<Stat, number>
type Weights = Partial<Record<keyof Effects, number>>

// Relative build ratings. These measure upgrade potential, independent of the
// location, current storm strength, and the damage already recorded on the map.
const weights: Record<Stat, Weights> = {
  damage: {
    wind: .29, width: .046, fringe: .85, gust: 10, seaGain: 18,
    rain: 10, rainTrail: 7, surge: 65, surgeFringe: 1.4, floodPower: 9, floodLife: .05,
    hail: 10, hailRadius: .4, lightning: 13, lightningOutage: .12, outageTime: .065, power: 12,
    broadcast: 7, panic: 7, gridlock: .055, warningDelay: .075, overload: 7, supply: 7,
    shelterBreach: 10, rainWrap: 2.5, hazardDamage: 14, hazardGain: 27, burstPower: 8,
    snowRate: 14, snowGain: 4, drift: 8, tornadoIntensity: 12, tornadoWidth: 8,
    tornadoLife: .08, tornadoEfficiency: .35, satelliteChance: 5, satelliteTrigger: 3,
    mesocyclone: .8, outflow: .9, abilityReach: .7, targetedBurst: 1.4, precisionDrop: 2,
    spread: 10, chargeGain: 6, burst: .055, heatDegrees: 1.8, fireSpot: 2,
  },
  lifespan: {
    endurance: 14, tornadoLifetime: .15, tornadoRange: .085, seaGain: 30, inlandBuffer: 11,
    coldBuffer: 7, snowRetention: 11, lakeMoisture: 7, oceanMoisture: 7, snowGain: 6,
    persistence: .14, hazardGain: 32, newCells: 2, fireDelay: .045, fireLine: 7, fireAir: 7,
  },
  resistance: {
    hazardBuffer: 18, coldBuffer: 16, inlandBuffer: 19, coldTolerance: 15, heatTolerance: 15,
    lakeMoisture: 6, oceanMoisture: 6, fireLine: 10, fireAir: 10, fireDelay: .055,
  },
}

const starts: Ratings = { damage: 6, lifespan: 22, resistance: 0 }
const ceilings = new Map<Storm, Ratings>()

function rawRating(storm: Storm, stat: Stat, effects: Partial<Effects>) {
  let rating = 0
  for (const [key, amount] of Object.entries(effects) as [keyof Effects, number][]) {
    const weight = stat === 'damage' && key === 'width' && storm === 'Tornado' ? 10
      : stat === 'damage' && key === 'hazardGain' && storm === 'Wildfire' ? 90
      : weights[stat][key] ?? 0
    rating += amount * weight
  }
  return rating
}

function ratingGain(storm: Storm, stat: Stat, effects: Partial<Effects>) {
  let ceiling = ceilings.get(storm)
  if (!ceiling) {
    const total: Ratings = { damage: 0, lifespan: 0, resistance: 0 }
    for (const upgrade of trees[storm]) {
      for (const key of evolutionStats) total[key] += Math.max(0, rawRating(storm, key, upgrade.effects))
    }
    ceilings.set(storm, total)
    ceiling = total
  }
  return ceiling[stat] ? rawRating(storm, stat, effects) * (100 - starts[stat]) / ceiling[stat] : 0
}

export function evolutionRating(storm: Storm, stat: Stat, effects: Effects, preview?: Upgrade) {
  const current = starts[stat] + ratingGain(storm, stat, effects)
  const projected = current + (preview ? ratingGain(storm, stat, preview.effects) : 0)
  return {
    current: Math.max(0, Math.min(100, Math.round(current))),
    projected: Math.max(0, Math.min(100, Math.round(projected))),
  }
}

export function damagePrice(storm: Storm, upgrade: Upgrade) {
  if (!isCampaignEvent(storm)) return 0
  // Add roughly one Momentum per 3.5 points of Damage before difficulty scaling.
  return Math.round(Math.max(0, ratingGain(storm, 'damage', upgrade.effects)) / 3.5)
}
