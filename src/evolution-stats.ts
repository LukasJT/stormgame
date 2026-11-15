import { baseEffects, trees, type Effects, type Upgrade } from './upgrades'
import { fatalityRate, lossPerHome, sweptShare, tornadoDebrisBonus, tornadoHailShare, tornadoPropertyProtection, tornadoRunoffShare, tornadoWindProfile } from './impact'
import { tornadoStrips } from './swath'
import type { Storm } from './world'
import { clipperWidthMultiplier } from './blizzard'
import { isCampaignEvent } from './campaign'
import { satelliteRechargeTicks } from './tornado-report'

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
    endurance: 14, tornadoLifetime: .15, seaGain: 30, inlandBuffer: 11,
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
    const weight = stat === 'damage' && key === 'hazardGain' && storm === 'Wildfire' ? 90
      : weights[stat][key] ?? 0
    rating += amount * weight
  }
  return rating
}

function withEffects(effects: Effects, bonus: Partial<Effects>, direction = 1) {
  const result = { ...effects }
  for (const key of Object.keys(bonus) as (keyof Effects)[]) result[key] += (bonus[key] ?? 0) * direction
  return result
}

// Standardize the land and travel distance so the same build can be compared
// across locations. Use the gameplay loss curves for the physical hazards.
function tornadoDamagePotential(effects: Effects) {
  const { windMph, widthKm } = tornadoWindProfile(effects.wind, effects.width)
  const strips = tornadoStrips(windMph, widthKm)
  const referenceArea = 40
  const referenceStepKm = .32
  const windLoss = strips.reduce((total, strip) =>
    total + sweptShare(referenceStepKm, strip.width, referenceArea) * lossPerHome(strip.wind, true) *
    (1 + effects.gust + tornadoDebrisBonus(strip.wind, effects.debris)), 0)
  const hailLoss = tornadoHailShare(effects.hail) * (1 + effects.hailRadius / 5) * lossPerHome(75) / 4
  const rainLoss = tornadoRunoffShare(effects.floodPower) * (36 + effects.floodLife) / 32 * lossPerHome(70) * 1.55
  const warningDisruption = Math.min(.85, effects.rainWrap * .53) * .3 + effects.warningDelay / 180
    + effects.broadcast * Math.min(1, effects.outageTime / 80) * .25 + effects.gridlock / 250 + effects.warningFriction
  const sheltered = .5 * Math.max(0, 1 - warningDisruption)
  const breach = Math.min(.65, (windMph >= 111 ? effects.shelterBreach : 0) + (windMph >= 86 ? effects.power : 0))
  const preparation = 1 + tornadoPropertyProtection(.5 - sheltered * (1 - breach), 1)
  const outageLoss = windMph >= 86 ? 1 + effects.supply * Math.min(1, effects.outageTime / 80) : 1
  const casualties = strips.reduce((total, strip) => total + sweptShare(referenceStepKm, strip.width, referenceArea) *
    fatalityRate(strip.wind, sheltered * (1 - breach), 1, .5), 0)
  const manualFrequency = effects.satelliteTrigger ? 60 / satelliteRechargeTicks(effects.satelliteTrigger) : 0
  const satelliteLoss = (effects.satelliteChance * .8 + manualFrequency * .5) *
    (1 + effects.tornadoLife / 24) * (1 + effects.tornadoWidth) * lossPerHome(95) *
    sweptShare(referenceStepKm, .12, referenceArea)
  return windLoss * preparation * outageLoss + hailLoss + rainLoss + casualties * 160_000 + satelliteLoss
}

const stockTornadoDamage = tornadoDamagePotential(baseEffects)
const fullTornadoDamage = tornadoDamagePotential(trees.Tornado.reduce((effects, upgrade) => withEffects(effects, upgrade.effects), baseEffects))

function tornadoDamageRating(effects: Effects) {
  // Fourth-root compression keeps severe winds dominant without letting a
  // single EF threshold fill the whole bar.
  const minimum = stockTornadoDamage ** .25
  return 6 + 94 * (tornadoDamagePotential(effects) ** .25 - minimum) / (fullTornadoDamage ** .25 - minimum)
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

export function evolutionRating(storm: Storm, stat: Stat, effects: Effects, preview?: Upgrade, removing = false) {
  const rate = (build: Effects) => storm === 'Tornado' && stat === 'damage'
    ? tornadoDamageRating(build) : starts[stat] + ratingGain(storm, stat, build)
  const current = rate(effects)
  const projected = preview ? rate(withEffects(effects, preview.effects, removing ? -1 : 1)) : current
  return {
    current: Math.max(0, Math.min(100, Math.round(current))),
    projected: Math.max(0, Math.min(100, Math.round(projected))),
  }
}

// Momentum per unit of modeled effect. Several effects in one upgrade are
// priced together, while narrower effects such as outage duration cost less.
const numericalPrice = {
  seaGain: 49, coldBuffer: 37, inlandBuffer: 54, wind: .29, width: 0, fringe: 2,
  rain: 19, rainTrail: 15, surge: 66, surgeFringe: 2.4, gust: 26,
  power: 14, broadcast: 11, outageTime: .055, panic: 16, gridlock: .08,
  warningDelay: .12, overload: 18, supply: 19,
  snowGain: 17, snowRate: 22, lakeMoisture: 13, oceanMoisture: 12, snowRetention: 7,
  drift: 17, burst: .24, hazardGain: 90, hazardBuffer: 24, chargeGain: 21,
  hazardDamage: 24, burstPower: 16, spread: 27, persistence: .13, trackStability: 7,
  courseControl: 0, tornadoIntensity: 43, tornadoWidth: 11, tornadoLife: .39,
  tornadoEfficiency: .52, tornadoSteering: 5, precisionDrop: 9, floodPower: 16, floodLife: .08,
  endurance: 17, targetedBurst: 7, abilityReach: 2, heatDegrees: 2.5, tornadoSpeed: 8, rainWrap: 2,
  hail: 17, hailRadius: .40, coldTolerance: 8, heatTolerance: 8, shelterBreach: 12,
  debris: 8, warningFriction: 10, fireSpot: 0, fireLine: 52, fireAir: 33, fireDelay: .30,
  mesocyclone: 2, outflow: 2, newCells: 2.5, lightning: 16, lightningOutage: .07,
  tornadoRange: .037, tornadoLifetime: .023, satelliteChance: 8, satelliteTrigger: 0,
} satisfies Record<keyof Effects, number>

const basePrices = new WeakMap<Upgrade, Map<Storm, number>>()

function prerequisiteEffects(storm: Storm, upgrade: Upgrade) {
  let effects = baseEffects
  const seen = new Set<string>()
  function include(id: string) {
    if (seen.has(id)) return
    const item = trees[storm].find(entry => entry.id === id)!
    seen.add(id)
    for (const requirement of item.requiresAll ?? (item.requires ? [item.requires] : [])) include(requirement)
    effects = withEffects(effects, item.effects)
  }
  for (const requirement of upgrade.requiresAll ?? (upgrade.requires ? [upgrade.requires] : [])) include(requirement)
  return effects
}

export function upgradeBasePrice(storm: Storm, upgrade: Upgrade) {
  let prices = basePrices.get(upgrade)
  if (!prices) basePrices.set(upgrade, prices = new Map())
  const cached = prices.get(storm)
  if (cached !== undefined) return cached
  const before = prerequisiteEffects(storm, upgrade)
  const bonus = upgrade.effects
  const after = withEffects(before, bonus)
  let value = 0
  for (const [effect, amount] of Object.entries(bonus) as [keyof Effects, number][]) {
    let rate = numericalPrice[effect]
    if (effect === 'width') rate = storm === 'Hurricane' ? .06 : .14
    if (effect === 'fringe' && storm === 'Hurricane') rate = 1
    if (effect === 'hazardGain' && storm === 'Wildfire') rate = 480
    if (effect === 'endurance' && storm === 'Tornado') rate = 8
    if (effect === 'endurance' && storm === 'Blizzard') rate = 26
    if (effect === 'spread' && storm === 'Thunderstorm') rate = 32
    value += Math.abs(amount) * rate
  }
  if (bonus.courseControl) {
    value += (before.courseControl ? 0 : 2.5) + bonus.courseControl * 11
    if (after.courseControl >= 1 && before.courseControl > 0) value += 2
  }
  if (bonus.satelliteTrigger) {
    value += before.satelliteTrigger ? (satelliteRechargeTicks(before.satelliteTrigger) - satelliteRechargeTicks(after.satelliteTrigger)) * .10 : 5
  }
  if (bonus.fireSpot) value += (before.fireSpot ? 0 : 2) + bonus.fireSpot * 2 + (after.fireSpot >= 2 ? 5 : 0)
  if (storm === 'Tornado' && upgrade.branch === 'Damage') {
    // The same reference build sets the Damage preview and captures EF jumps
    // and the combined footprint of rainfall, hail, and debris.
    value = .55 * (tornadoDamageRating(after) - tornadoDamageRating(before)) + value * .05
  }
  if (storm === 'Tornado' && bonus.warningFriction) value *= .72
  // The standalone legacy scenarios use a smaller Momentum schedule.
  if (!isCampaignEvent(storm)) value *= .43
  const cost = Math.max(3, Math.round(2 + value))
  prices.set(storm, cost)
  return cost
}

export function clipperUpgradePremium(upgrade: Upgrade) {
  // A Clipper gets a wider shield and also postpones age-related weakening.
  const { width = 0, endurance = 0 } = upgrade.effects
  return width * .065 * (clipperWidthMultiplier - 1) + endurance * 8
}
