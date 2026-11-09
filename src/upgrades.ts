import { type Storm } from './world'
import { hazards, type NewHazard, type ThunderstormType } from './hazards'

export const tornadoBranches = ['Movement', 'Damage', 'Abilities'] as const
type TornadoBranch = typeof tornadoBranches[number]
export type Branch = 'Formation' | 'Impact' | 'Disruption' | 'Storm Track' | 'Tornadoes' | 'Severe Impact' | 'Flooding' | 'Longevity' | TornadoBranch
export const branches: Branch[] = ['Formation', 'Impact', 'Disruption', 'Storm Track', 'Tornadoes', 'Severe Impact', 'Flooding', 'Longevity']

export const baseEffects = {
  seaGain: 0, coldBuffer: 0, inlandBuffer: 0, wind: 0, width: 0, fringe: 0,
  rain: 0, rainTrail: 0, surge: 0, surgeFringe: 0, gust: 0,
  power: 0, broadcast: 0, outageTime: 0, panic: 0, gridlock: 0, warningDelay: 0, overload: 0, supply: 0,
  snowGain: 0, burst: 0,
  hazardGain: 0, hazardBuffer: 0, chargeGain: 0, hazardDamage: 0, burstPower: 0, spread: 0, persistence: 0,
  trackStability: 0, courseControl: 0, tornadoIntensity: 0, tornadoWidth: 0, tornadoLife: 0,
  tornadoEfficiency: 0, tornadoSteering: 0, precisionDrop: 0, floodPower: 0, floodLife: 0, endurance: 0,
  targetedBurst: 0, tornadoSpeed: 0, rainWrap: 0, hail: 0, hailRadius: 0,
  coldTolerance: 0, heatTolerance: 0, shelterBreach: 0,
  tornadoRange: 0, tornadoLifetime: 0, satelliteChance: 0, satelliteTrigger: 0,
}
export type Effects = typeof baseEffects

export type Upgrade = {
  id: string; name: string; branch: Branch; cost: number; description: string
  requires?: string; requiresAny?: string[]; requiresAll?: string[]; group?: string; lane?: string; capstone?: true; effects: Partial<Effects>
}

type TornadoNode = [id: string, name: string, description: string, effects: Partial<Effects>]

function tornadoTree(branch: TornadoBranch, group: string, lanes: Record<string, TornadoNode[]>, merge?: TornadoNode): Upgrade[] {
  const upgrades = Object.entries(lanes).flatMap(([lane, nodes]) => nodes.map(([id, name, description, effects], index) => ({
    id, name, description, effects, branch, group, lane,
    cost: [4, 7, 11, 15][index], requires: nodes[index - 1]?.[0],
  })))
  if (!merge) return upgrades
  const [id, name, description, effects] = merge
  return [...upgrades, {
    id, name, description, effects, branch, group, cost: 12, capstone: true,
    requiresAll: Object.values(lanes).map(nodes => nodes.at(-1)![0]),
  }]
}

const tornadoUpgrades = [
  ...tornadoTree('Movement', 'Travel distance', {
    Track: [
      ['tornado-track-feed', 'Track Inflow', 'Extend the maximum travel distance by 50 km.', { tornadoRange: 50 }],
      ['tornado-track-corridor', 'Inflow Corridor', 'Extend maximum travel distance by another 70 km.', { tornadoRange: 70 }],
      ['tornado-track-long', 'Long-Track Circulation', 'Raise the travel limit to 400 km and sustain the speed to reach it.', { tornadoRange: 100 }],
    ],
  }),
  ...tornadoTree('Movement', 'Lifetime', {
    Inflow: [
      ['tornado-life-feed', 'Sustained Updraft', 'Add 20 simulated minutes to the lifetime limit and conserve inflow.', { tornadoLifetime: 80, endurance: .40 }],
      ['tornado-life-balance', 'Steady Inflow', 'Add another 30 simulated minutes and preserve more inflow.', { tornadoLifetime: 120, endurance: .65 }],
      ['tornado-life-anchor', 'Anchored Mesocyclone', 'Raise the lifetime limit to four simulated hours and preserve inflow on long tracks.', { tornadoLifetime: 160, endurance: .97 }],
    ],
  }),
  ...tornadoTree('Movement', 'Track control', {
    Steering: [
      ['tornado-thermal', 'Vorticity Alignment', 'Reduce track wobble and increase forward speed by 15% of base speed.', { trackStability: .28, tornadoSpeed: .15 }],
      ['tornado-organize', 'Streamwise Inflow', 'Steady the track further and slow weakening.', { trackStability: .40, hazardBuffer: .12 }],
      ['tornado-course', 'Mesocyclone Track Control', 'Select a point on the map to set a preferred heading.', { courseControl: 1 }],
    ],
  }),
  ...tornadoTree('Damage', 'Wind and width', {
    'Wind speed': [
      ['vortex', 'Vortex Contraction', 'Add 24 mph to peak winds.', { wind: 24 }],
      ['rear-flank', 'Rear-Flank Momentum Surge', 'Add another 31 mph to peak winds.', { wind: 31 }],
      ['tornado-vortex-breakdown', 'Corner-Flow Intensification', 'Add another 38 mph to peak winds.', { wind: 38 }],
      ['tornado-inner-core', 'Inner-Core Acceleration', 'Add another 44 mph to peak winds, enough to reach EF5 at full strength.', { wind: 44 }],
    ],
    'Path width': [
      ['wide-funnel', 'Broad Inflow Layer', 'Add up to 160 m of damage width.', { width: .16 }],
      ['satellite', 'Expanded Vorticity Field', 'Add up to another 360 m of damage width.', { width: .36 }],
      ['wedge', 'Wedge Circulation', 'Add up to another 700 m of damage width.', { width: .70 }],
    ],
  }, ['multi-vortex', 'Violent Multivortex Core', 'Add 15 mph of peak wind and up to 500 m of damage width.', { wind: 15, width: .5 }]),
  ...tornadoTree('Damage', 'Rainfall and concealment', {
    'Heavy rainfall': [
      ['tornado-rain-core', 'High-Precipitation Core', 'Heavy rain leaves damaging runoff along the track.', { floodPower: .38 }],
      ['tornado-rain-swath', 'Sustained Downpour', 'Intensify runoff and extend flooding.', { floodPower: .28, floodLife: 16 }],
    ],
    'Rain concealment': [
      ['rain-wrapped', 'Precipitation Curtain', 'Rain hides the funnel from spotters and delays local warnings.', { warningDelay: 12, rainWrap: 1 }],
      ['tornado-rain-screen', 'Dense Rain Screen', 'Further reduce how quickly the funnel draws attention.', { rainWrap: .55 }],
    ],
  }, ['tornado-runoff', 'Rain-Wrapped Deluge', 'Intensify flooding and deepen the rain curtain around the funnel.', { floodPower: .34, floodLife: 24, rainWrap: .35 }]),
  ...tornadoTree('Damage', 'Debris and surface winds', {
    Debris: [
      ['tornado-debris', 'Debris Entrainment', 'Lift debris into the circulation to increase property damage.', { gust: .20 }],
      ['tornado-debris-load', 'High Debris Loading', 'Increase damage from large windborne fragments.', { gust: .30 }],
    ],
    'Near-ground winds': [
      ['tornado-low-jet', 'Near-Ground Jet', 'Increase wind damage to buildings.', { gust: .12 }],
      ['tornado-ground-jet', 'Ground-Level Surge', 'Concentrate damaging winds close to the ground.', { gust: .20 }],
    ],
  }, ['tornado-debris-barrage', 'Ballistic Debris Field', 'Dense debris increases damage and weakens shelter protection in severe winds.', { gust: .45, shelterBreach: .20 }]),
  ...tornadoTree('Damage', 'Hail', {
    Hail: [
      ['tornado-hail', 'Embryo Recirculation', 'Recycle small hailstones to damage roofs and cars.', { hail: .35, hailRadius: 2 }],
      ['tornado-hail-growth', 'Wet Growth Regime', 'Grow larger hailstones across a wider footprint.', { hail: .45, hailRadius: 2 }],
      ['tornado-hail-swath', 'Giant Hail Swath', 'Spread damaging hail farther around the vortex.', { hail: .65, hailRadius: 3 }],
    ],
  }),
  ...tornadoTree('Abilities', 'Temperature resistance', {
    'Heat resistance': [
      ['tornado-mixed-layer', 'Heat Resistance I', 'Reduce hot-air weakening by 25%.', { heatTolerance: .25 }],
      ['tornado-heat-flux', 'Heat Resistance II', 'Block another 25% of base hot-air weakening.', { heatTolerance: .25 }],
    ],
    'Cold resistance': [
      ['tornado-cold-pool', 'Cold Resistance I', 'Reduce cold-air weakening by 25%.', { coldTolerance: .25 }],
      ['tornado-baroclinic', 'Cold Resistance II', 'Block another 25% of base cold-air weakening.', { coldTolerance: .25 }],
    ],
  }, ['tornado-inflow-coupling', 'Temperature Resilience', 'Further resist hot and cold air and preserve the inflow reserve.', { coldTolerance: .22, heatTolerance: .22, endurance: .20 }]),
  ...tornadoTree('Abilities', 'Warning and response resistance', {
    'Warning delays': [
      ['tornado-response', 'Radar Interference I', 'Delay the first local alerts.', { warningDelay: 10 }],
      ['tornado-warning-gaps', 'Radar Interference II', 'Give local spotters and emergency managers less time to respond.', { warningDelay: 12 }],
    ],
    'Radio disruption': [
      ['tornado-grid', 'Radio Disruption I', 'Damaging winds can interrupt broadcasts and slow sheltering.', { outageTime: 45, broadcast: .25 }],
      ['tornado-repeater', 'Radio Disruption II', 'Keep radio repeaters offline longer and slow sheltering further.', { outageTime: 55, broadcast: .20 }],
    ],
  }, ['tornado-warning-overload', 'Response Overload', 'Delay local warnings and slow the move to shelter.', { warningDelay: 12, gridlock: 18 }]),
  ...tornadoTree('Abilities', 'Satellite tornadoes', {
    Satellites: [
      ['tornado-satellite-seed', 'Satellite Rotation', 'Occasionally shed a weaker tornado in a random direction.', { satelliteChance: .24 }],
      ['tornado-satellite-lobes', 'Unstable Rotation Lobes', 'Increase the chance of shedding a satellite tornado.', { satelliteChance: .20 }],
      ['tornado-satellite-shear', 'Outer Vortex Shear', 'Further increase the chance of shedding a satellite tornado.', { satelliteChance: .20 }],
      ['tornado-satellite-split', 'Vortex Split', 'Unlock a manual satellite tornado every 60 real seconds of active play.', { satelliteTrigger: 1 }],
    ],
  }),
]

function chain(branch: Branch, nodes: [string, string, string, Partial<Effects>][]): Upgrade[] {
  return nodes.map(([id, name, description, effects], index) => ({
    id, name, description, branch, effects, cost: [3, 5, 7, 12][index], requires: nodes[index - 1]?.[0],
    ...(index === 3 ? { capstone: true as const } : {}),
  }))
}

const stormSignature: Record<Exclude<ThunderstormType, 'Thunderstorm' | 'Supercell'>, [string, string, Partial<Effects>]> = {
  Derecho: ['Reinforced Cold Pool', 'Drive a wider wind front and keep its burst active for 12 seconds longer.', { width: 75, burst: 12 }],
  Multicell: ['Cell Regeneration', 'Seed cells 18 seconds longer and replenish inflow faster.', { burst: 18, chargeGain: .34 }],
  Pulse: ['Wet Microburst', 'Increase downburst damage by 65%.', { burstPower: .65 }],
  Squall: ['Bowing Line', 'Widen the line by 45 km and extend the active gust front by 9 seconds.', { width: 45, burst: 9 }],
  'Storm Cell': ['Hail Recycling', 'Increase active hail damage by 50% and sustain it for 10 seconds longer.', { burstPower: .5, burst: 10 }],
  Lightning: ['Repeated Strikes', 'Keep the barrage active for 3 more seconds and recharge faster.', { burst: 3, chargeGain: .25 }],
}

function convectionTree(storm: ThunderstormType) {
  const signature = storm === 'Thunderstorm' || storm === 'Supercell' ? undefined : stormSignature[storm]
  return [
    ...chain('Storm Track', [
      ['track-inflow', 'Moist Inflow', 'Gain strength more quickly in favorable air.', { hazardGain: .035 }],
      ['track-organize', 'Organized Core', 'Reduce natural course wobble and weaken more slowly in stable air.', { trackStability: .42, hazardBuffer: .15 }],
      ['track-align', 'Flow Alignment', 'Reduce course wobble further and speed up travel by 12%.', { trackStability: .26, spread: .12 }],
      ['track-control', 'Course Control', 'Tap a point on the map to set the parent storm’s heading. The storm turns gradually.', { courseControl: 1 }],
    ]),
    ...(!signature ? chain('Tornadoes', [
      ['funnel-rotation', 'Stronger Rotation', 'Rebuild rotation faster and improve the odds of higher EF ratings.', { chargeGain: .32, tornadoIntensity: .065 }],
      ['funnel-core', 'Violent Core', 'Spawn wider, longer-lived tornadoes with a better chance of EF5.', { tornadoWidth: .65, tornadoLife: 17, tornadoIntensity: .12 }],
      ['funnel-guidance', 'Guided Funnels', 'Select an active tornado and tap the map to bias its heading. Drops cost less rotation.', { tornadoSteering: 1, tornadoEfficiency: 6 }],
      ['funnel-precision', 'Precision Touchdown', 'Choose any land point inside the highlighted drop area. Initial heading still varies.', { precisionDrop: 1 }],
    ]) : []),
    ...chain('Severe Impact', [
      ['impact-hail', 'Stronger Core', 'Increase ongoing storm damage by 40%.', { hazardDamage: .4 }],
      ['impact-gust', ...(signature ?? ['Severe Gusts', 'Increase the damaging footprint and funnel damage.', { width: 30, burstPower: .35 }] as const)],
      ['impact-grid', 'Grid Failure', 'Damage causes power outages that slow sheltering.', { outageTime: 55, broadcast: .4, power: .12 }],
      ['impact-extreme', signature ? 'Targeted Outbreak' : 'Extreme Outbreak',
        signature ? 'Aim the active ability anywhere on land inside the highlighted range and increase its damage by 50%.'
          : 'Increase storm and ability damage across a much wider footprint.',
        { hazardDamage: .9, burstPower: .5, width: 65, targetedBurst: signature ? 1 : 0 }],
    ]),
    ...chain('Flooding', [
      ['flood-rain', 'Heavy Rain', 'Leave accumulating runoff along the storm track.', { floodPower: .35 }],
      ['flood-ground', 'Saturated Ground', 'Increase runoff and extend local flooding by 30 seconds.', { floodPower: .4, floodLife: 30 }],
      ['flood-drain', 'Overloaded Drainage', 'Increase flood damage and keep water in impacted districts longer.', { floodPower: .48, floodLife: 35 }],
      ['flood-cascade', 'Flash Flood Cascade', 'Send runoff into more districts and sharply increase flood damage.', { floodPower: .9, floodLife: 40, width: 45 }],
    ]),
    ...chain('Longevity', [
      ['life-inflow', 'Sustained Inflow', 'Slow weakening in stable air.', { hazardBuffer: .22 }],
      ['life-reserve', 'Moisture Reserve', 'Rebuild strength faster and lose less in stable air.', { hazardGain: .065, hazardBuffer: .18 }],
      ['life-recharge', 'Persistent Updraft', 'Regain ability charge and resist dry or stable periods.', { chargeGain: .28, hazardBuffer: .17 }],
      ['life-window', 'Long-Lived System', 'Use inflow more slowly and further resist weakening in stable air.', { endurance: .30, hazardBuffer: .18 }],
    ]),
  ]
}

function hazardTree(storm: NewHazard, formation: string, impact: string, mastery: string): Upgrade[] {
  const { ability, width } = hazards[storm]
  const radius = Math.round(width * .35)
  return [
    { id: 'favorable', name: formation, branch: 'Formation', cost: 3, description: 'Build strength faster in favorable and mixed conditions.', effects: { hazardGain: .075 } },
    { id: 'reserve', name: 'Recharge Reserve', branch: 'Formation', cost: 5, requires: 'favorable', description: `Replenish ${ability.resource} faster between activations.`, effects: { chargeGain: .42 } },
    { id: 'persistence', name: 'Persistent Pattern', branch: 'Formation', cost: 6, requires: 'favorable', description: 'Lose 40% less strength in unfavorable conditions.', effects: { hazardBuffer: .40 } },
    { id: 'impact', name: impact, branch: 'Impact', cost: 3, description: 'Increase ongoing impact damage by 25%.', effects: { hazardDamage: .25 } },
    { id: 'mastery', name: mastery, branch: 'Impact', cost: 5, requires: 'impact', description: `${ability.name} deals 40% more damage.`, effects: { burstPower: .4 } },
    { id: 'footprint', name: 'Wider Footprint', branch: 'Impact', cost: 6, requires: 'impact', description: `Add ${radius} km of width and reach another adjacent zone when available.`, effects: { fringe: 1, width: radius } },
    { id: 'response', name: 'Delayed Response', branch: 'Disruption', cost: 3, description: 'Warnings take 18 seconds longer to reach newly threatened areas.', effects: { warningDelay: 18 } },
    { id: 'grid', name: 'Grid Failure', branch: 'Disruption', cost: 5, requires: 'response', description: 'Damage triggers outages that slow sheltering and reduce its protection.', effects: { outageTime: 48, broadcast: .32, power: .12 } },
    { id: 'hazard-dominance', name: `${mastery} Reserve`, branch: 'Impact', cost: 11, requires: 'mastery', capstone: true, description: `Keep ${ability.name.toLowerCase()} active 25 seconds longer and increase its damage by another 55%.`, effects: { burst: 25, burstPower: .55 } },
    { id: 'hazard-endurance', name: 'Anchored Pattern', branch: 'Formation', cost: 11, requires: 'persistence', capstone: true, description: 'Use environmental support more slowly and withstand unfavorable conditions.', effects: { endurance: .22, hazardBuffer: .25 } },
  ]
}

export const trees: Record<Storm, Upgrade[]> = {
  Hurricane: [
    { id: 'warm', name: 'Warmer Water', branch: 'Formation', cost: 3, description: 'Build strength faster over tropical water.', effects: { seaGain: .045 } },
    { id: 'deep', name: 'Deep Heat', branch: 'Formation', cost: 5, requires: 'warm', description: 'Tap deeper heat to intensify even faster offshore.', effects: { seaGain: .065 } },
    { id: 'marine', name: 'Marine Recharge', branch: 'Formation', cost: 7, requires: 'deep', description: 'Gain extra strength over warm water and lose less in cooler water.', effects: { seaGain: .065, coldBuffer: .18 } },
    { id: 'shear', name: 'Low Shear', branch: 'Formation', cost: 3, description: 'Reduce strength loss in cool or otherwise unfavorable water.', effects: { coldBuffer: .22 } },
    { id: 'core', name: 'Inland Reserve', branch: 'Formation', cost: 5, requires: 'shear', description: 'Lose 13% less strength over land.', effects: { inlandBuffer: .13 } },
    { id: 'persistent', name: 'Persistent Core', branch: 'Formation', cost: 7, requires: 'core', description: 'Reduce inland weakening by another 10% of the base rate.', effects: { inlandBuffer: .10 } },
    { id: 'eye', name: 'Tight Eye', branch: 'Formation', cost: 4, description: 'Add up to 12 mph to sustained winds. Stronger winds also make the storm easier to notice.', effects: { wind: 12 } },
    { id: 'rapid', name: 'Rapid Intensification', branch: 'Formation', cost: 7, requires: 'eye', description: 'Add up to another 18 mph to sustained winds.', effects: { wind: 18 } },
    { id: 'air-masses', name: 'Moisture Corridor', branch: 'Formation', cost: 5, requires: 'warm', description: 'Intensify faster over warm water and resist shear.', effects: { seaGain: .035, coldBuffer: .12 } },

    { id: 'bands', name: 'Outer Bands', branch: 'Impact', cost: 4, description: 'Add 65 km to storm width and hit one neighboring land zone.', effects: { width: 65, fringe: 1 } },
    { id: 'wide', name: 'Broad Circulation', branch: 'Impact', cost: 6, requires: 'bands', description: 'Add another 95 km of width and reach a second neighboring land zone.', effects: { width: 95, fringe: 1 } },
    { id: 'gusts', name: 'Violent Gusts', branch: 'Impact', cost: 7, requires: 'wide', description: 'Increase property damage from wind by 35%.', effects: { gust: .35 } },
    { id: 'rain', name: 'Heavy Rain', branch: 'Impact', cost: 3, description: 'Add rainfall damage across the storm footprint.', effects: { rain: .30 } },
    { id: 'flood', name: 'Inland Flooding', branch: 'Impact', cost: 6, requires: 'rain', description: 'Leave a damaging rain trail in the last land zone you passed.', effects: { rainTrail: .25 } },
    { id: 'saturated', name: 'Saturated Ground', branch: 'Impact', cost: 7, requires: 'flood', description: 'Amplify flood damage in the footprint and the rain trail.', effects: { rain: .23, rainTrail: .15 } },
    { id: 'surge', name: 'Storm Surge', branch: 'Impact', cost: 4, description: 'Deal a burst of coastal damage when the storm crosses from sea to land.', effects: { surge: .08 } },
    { id: 'surge-fan', name: 'Surge Fan', branch: 'Impact', cost: 6, requires: 'surge', description: 'Strengthen surge and spread half of it to a neighboring coastal zone.', effects: { surge: .04, surgeFringe: 1 } },

    { id: 'power', name: 'Power Outage', branch: 'Disruption', cost: 4, description: 'Damage triggers local outages. Shelters offer less protection during an outage.', effects: { power: .20, outageTime: 55 } },
    { id: 'broadcast', name: 'Broadcasting Outage', branch: 'Disruption', cost: 5, requires: 'power', description: 'Outages slow sheltering in affected towns. Residents already sheltered stay there.', effects: { broadcast: .52 } },
    { id: 'signal', name: 'Signal Loss', branch: 'Disruption', cost: 7, requires: 'broadcast', description: 'Keep local outages active for another 65 seconds after each hit.', effects: { outageTime: 65 } },
    { id: 'warnings', name: 'Delayed Advisories', branch: 'Disruption', cost: 3, description: 'Add 18 seconds before newly threatened towns receive a warning.', effects: { warningDelay: 18 } },
    { id: 'gridlock', name: 'Road Gridlock', branch: 'Disruption', cost: 5, requires: 'warnings', description: 'Add 32 seconds to the time residents need to reach shelter.', effects: { gridlock: 32 } },
    { id: 'panic', name: 'Public Hysteria', branch: 'Disruption', cost: 7, requires: 'gridlock', description: 'Reduce new shelter uptake by 20% and increase exposure among residents outside shelters.', effects: { panic: .20 } },
    { id: 'overload', name: 'Emergency Overload', branch: 'Disruption', cost: 6, requires: 'power', description: 'Increase exposure in towns that have lost at least a fifth of their property.', effects: { overload: .24 } },
    { id: 'supply', name: 'Supply Breakdown', branch: 'Disruption', cost: 8, requires: 'overload', description: 'Increase property damage while a local outage is active.', effects: { supply: .30 } },
    { id: 'population-centers', name: 'Emergency Gridlock', branch: 'Disruption', cost: 5, requires: 'warnings', description: 'Shelter travel takes longer, especially when roads are already blocked.', effects: { gridlock: 22 } },
    { id: 'coastal-inundation', name: 'Coastal Inundation', branch: 'Impact', cost: 12, requires: 'surge-fan', capstone: true, description: 'Nearly double the upgraded landfall surge and extend coastal flooding.', effects: { surge: .1, rainTrail: .18 } },
    { id: 'inland-engine', name: 'Inland Engine', branch: 'Formation', cost: 12, requires: 'persistent', capstone: true, description: 'Reduce inland weakening by 32% in total.', effects: { inlandBuffer: .09 } },
  ],
  Tornado: tornadoUpgrades,
  Blizzard: [
    { id: 'snow-bands', name: 'Snow Bands', branch: 'Impact', cost: 4, description: 'Build snowpack faster, widen the storm, and reach an adjacent zone during whiteout.', effects: { width: 100, snowGain: .35, fringe: 1 } },
    { id: 'whiteout', name: 'Prolonged Whiteout', branch: 'Impact', cost: 6, requires: 'snow-bands', description: 'Keep whiteout active for another 20 seconds.', effects: { burst: 20 } },
    { id: 'powder', name: 'Powder Reserve', branch: 'Formation', cost: 3, description: 'Build snowpack faster in every weather pattern.', effects: { snowGain: .30 } },
    { id: 'gust-front', name: 'Gust Front', branch: 'Formation', cost: 5, requires: 'powder', description: 'Add up to 17 mph to whiteout winds.', effects: { wind: 17 } },
    { id: 'arctic-feed', name: 'Arctic Feed', branch: 'Formation', cost: 7, requires: 'gust-front', description: 'Build strength faster in cold air and lose 45% less strength in warm air.', effects: { hazardGain: .06, hazardBuffer: .45 } },
    { id: 'polar-lock', name: 'Polar Lock', branch: 'Formation', cost: 12, requires: 'arctic-feed', capstone: true, description: 'Use cold-air support more slowly and replenish snowpack faster.', effects: { endurance: .22, snowGain: .44 } },
    { id: 'snow-squalls', name: 'Snow Squalls', branch: 'Impact', cost: 7, requires: 'whiteout', description: 'Reach a second neighboring zone and increase wind damage by 30%.', effects: { fringe: 1, gust: .30 } },
    { id: 'whiteout-lock', name: 'Ground Blizzard', branch: 'Impact', cost: 12, requires: 'snow-squalls', capstone: true, description: 'Extend each whiteout by 35 seconds and widen the bands by 80 km.', effects: { burst: 35, width: 80 } },
    { id: 'ice-grid', name: 'Ice-Loaded Lines', branch: 'Disruption', cost: 4, description: 'Damage knocks out power and slows sheltering.', effects: { outageTime: 50, broadcast: .32, power: .12 } },
    { id: 'blocked-roads', name: 'Blocked Roads', branch: 'Disruption', cost: 6, requires: 'ice-grid', description: 'Add 30 seconds to shelter travel time.', effects: { gridlock: 30 } },
  ],
  Thunderstorm: convectionTree('Thunderstorm'),
  Derecho: convectionTree('Derecho'),
  Multicell: convectionTree('Multicell'),
  Pulse: convectionTree('Pulse'),
  Squall: convectionTree('Squall'),
  'Storm Cell': convectionTree('Storm Cell'),
  Supercell: convectionTree('Supercell'),
  Lightning: convectionTree('Lightning'),
  Wildfire: [
    { id: 'spread', name: 'Fast Spread', branch: 'Formation', cost: 3, description: 'The fire front advances 35% faster between zones.', effects: { spread: .35 } },
    { id: 'rain-proof', name: 'Rain Resistance', branch: 'Formation', cost: 4, description: 'Cut weakening in rain and wet fuels by 60%.', effects: { hazardBuffer: .6 } },
    { id: 'dry-fuels', name: 'Dry Fuel Beds', branch: 'Formation', cost: 3, description: 'Grow faster when fuels are dry or moderately moist.', effects: { hazardGain: .08 } },
    { id: 'embers', name: 'Long-Range Embers', branch: 'Impact', cost: 3, description: 'Generate embers faster and make spot fires 35% stronger.', effects: { chargeGain: .35, burstPower: .35 } },
    { id: 'crown', name: 'Crown Fire', branch: 'Impact', cost: 5, requires: 'embers', description: 'Increase active fire damage by 40% and spread impact into one adjacent zone.', effects: { hazardDamage: .4, fringe: 1, width: 9 } },
    { id: 'smolder', name: 'Smoldering Fuels', branch: 'Impact', cost: 4, description: 'Burn zones behind the fire front stay active for 55 more seconds.', effects: { persistence: 55 } },
    { id: 'evacuation', name: 'Delayed Evacuation', branch: 'Disruption', cost: 3, description: 'Delay evacuation orders by 22 seconds.', effects: { warningDelay: 22 } },
    { id: 'response', name: 'Overwhelmed Response', branch: 'Disruption', cost: 5, requires: 'evacuation', description: 'Evacuation takes longer, and heavily damaged areas are more exposed.', effects: { gridlock: 40, overload: .30 } },
    { id: 'ember-storm', name: 'Ember Storm', branch: 'Impact', cost: 12, requires: 'crown', capstone: true, description: 'Keep spot fires active 30 seconds longer and increase their damage by 60%.', effects: { burst: 30, burstPower: .60 } },
    { id: 'deep-roots', name: 'Deep Fuel Reserve', branch: 'Formation', cost: 12, requires: 'rain-proof', capstone: true, description: 'Burn through available fuel more slowly and keep burn zones active another 75 seconds.', effects: { endurance: .22, persistence: 75 } },
  ],
  Flooding: [
    ...hazardTree('Flooding', 'Saturated Soil', 'Deeper Water', 'Levee Overtopping'),
    { id: 'drainage', name: 'Slow Drainage', branch: 'Impact', cost: 4, description: 'Keep standing water damaging for 50 more seconds after passing a zone.', effects: { persistence: 50 } },
  ],
  'Dust Storm': hazardTree('Dust Storm', 'Loose Topsoil', 'Denser Dust', 'Near-Zero Visibility'),
  'Heat Dome': [
    ...hazardTree('Heat Dome', 'Sinking Air', 'Heat Stress', 'Hot Nights'),
    { id: 'grid-load', name: 'Cooling Grid Overload', branch: 'Disruption', cost: 6, requires: 'grid', description: 'Overloaded grids stay down longer and cut shelter protection further.', effects: { outageTime: 45, power: .19 } },
  ],
}
