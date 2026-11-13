import { type Storm } from './world'
import { hazards, type ThunderstormType } from './hazards'

export const tornadoBranches = ['Movement', 'Damage', 'Abilities'] as const
type TornadoBranch = typeof tornadoBranches[number]
export type Branch = 'Formation' | 'Impact' | 'Disruption' | 'Storm Track' | 'Tornadoes' | 'Severe Impact' | 'Flooding' | 'Longevity' | TornadoBranch
export const branches: Branch[] = ['Formation', 'Impact', 'Disruption', 'Storm Track', 'Tornadoes', 'Severe Impact', 'Flooding', 'Longevity']

export const baseEffects = {
  seaGain: 0, coldBuffer: 0, inlandBuffer: 0, wind: 0, width: 0, fringe: 0,
  rain: 0, rainTrail: 0, surge: 0, surgeFringe: 0, gust: 0,
  power: 0, broadcast: 0, outageTime: 0, panic: 0, gridlock: 0, warningDelay: 0, overload: 0, supply: 0,
  snowGain: 0, snowRate: 0, lakeMoisture: 0, oceanMoisture: 0, snowRetention: 0, drift: 0, burst: 0,
  hazardGain: 0, hazardBuffer: 0, chargeGain: 0, hazardDamage: 0, burstPower: 0, spread: 0, persistence: 0,
  trackStability: 0, courseControl: 0, tornadoIntensity: 0, tornadoWidth: 0, tornadoLife: 0,
  tornadoEfficiency: 0, tornadoSteering: 0, precisionDrop: 0, floodPower: 0, floodLife: 0, endurance: 0,
  targetedBurst: 0, abilityReach: 0, heatDegrees: 0, tornadoSpeed: 0, rainWrap: 0, hail: 0, hailRadius: 0,
  coldTolerance: 0, heatTolerance: 0, shelterBreach: 0, debris: 0, warningFriction: 0,
  fireSpot: 0, fireLine: 0, fireAir: 0, fireDelay: 0,
  mesocyclone: 0, outflow: 0, newCells: 0, lightning: 0, lightningOutage: 0,
  tornadoRange: 0, tornadoLifetime: 0, satelliteChance: 0, satelliteTrigger: 0,
}
export type Effects = typeof baseEffects

export type Upgrade = {
  id: string; name: string; branch: Branch; cost: number; description: string
  requires?: string; requiresAll?: string[]; group?: string; lane?: string; capstone?: true; effects: Partial<Effects>
}

type UpgradeNode = [id: string, name: string, description: string, effects: Partial<Effects>, cost?: number]

function upgradeTree(branch: Branch, group: string, lanes: Record<string, UpgradeNode[]>, merge?: UpgradeNode, root?: string): Upgrade[] {
  const tornado = tornadoBranches.some(category => category === branch)
  const prices = tornado ? [4, 7, 11, 15] : [3, 5, 7, 11]
  const upgrades = Object.entries(lanes).flatMap(([lane, nodes]) => nodes.map(([id, name, description, effects, cost], index) => ({
    id, name, description, effects, branch, group, lane,
    cost: cost ?? prices[index], requires: nodes[index - 1]?.[0] ?? root,
  })))
  if (!merge) return upgrades
  const [id, name, description, effects, cost] = merge
  return [...upgrades, {
    id, name, description, effects, branch, group, cost: cost ?? (tornado ? 12 : 9), capstone: true,
    requiresAll: Object.values(lanes).map(nodes => nodes.at(-1)![0]),
  }]
}

const tornadoUpgrades: Upgrade[] = [
  ...upgradeTree('Movement', 'Forward speed', {
    Track: [
      ['tornado-track-feed', 'Track Inflow', 'Add 18% of base forward speed and 50 km of travel range.', { tornadoSpeed: .18, tornadoRange: 50 }, 5],
      ['tornado-track-corridor', 'Inflow Corridor', 'Add another 25% of base forward speed and 70 km of travel range.', { tornadoSpeed: .25, tornadoRange: 70 }, 7],
      ['tornado-track-long', 'Long-Track Circulation', 'Add another 38% of base forward speed and 100 km of travel range.', { tornadoSpeed: .38, tornadoRange: 100 }, 9],
    ],
  }),
  ...upgradeTree('Movement', 'Lifetime', {
    Inflow: [
      ['tornado-life-feed', 'Sustained Updraft', 'Add 25 simulated minutes and make the inflow reserve last longer.', { tornadoLifetime: 100, endurance: .55 }, 5],
      ['tornado-life-balance', 'Steady Inflow', 'Add another 30 simulated minutes and slow inflow depletion further.', { tornadoLifetime: 120, endurance: .67 }, 8],
      ['tornado-life-anchor', 'Anchored Mesocyclone', 'Add another 35 simulated minutes, reaching a four-hour lifetime limit, and conserve more inflow.', { tornadoLifetime: 140, endurance: .80 }, 11],
    ],
  }),
  ...upgradeTree('Movement', 'Track control', {
    Steering: [
      ['tornado-thermal', 'Vorticity Alignment', 'Reduce track wobble and steer up to 35° to either side of the natural track.', { trackStability: .25, courseControl: 35 / 180 }, 5],
      ['tornado-organize', 'Streamwise Inflow', 'Steady the track further and steer up to 90° to either side of the natural track.', { trackStability: .25, courseControl: 55 / 180 }, 7],
      ['tornado-course', 'Mesocyclone Track Control', 'Set a heading in any direction. The tornado turns faster toward your chosen heading.', { trackStability: .25, courseControl: .5 }, 9],
    ],
  }),
  ...upgradeTree('Damage', 'Wind speed', {
    'Wind speed': [
      ['vortex', 'Vortex Contraction', 'Add 24 mph to peak winds.', { wind: 24 }],
      ['rear-flank', 'Rear-Flank Momentum Surge', 'Add another 31 mph to peak winds.', { wind: 31 }],
      ['tornado-vortex-breakdown', 'Corner-Flow Intensification', 'Add 50 mph to reach EF4 (170 mph) at full strength.', { wind: 50 }],
      ['tornado-inner-core', 'Inner-Core Acceleration', 'Add 32 mph to reach EF5 (202 mph) at full strength.', { wind: 32 }],
    ],
  }),
  ...upgradeTree('Damage', 'Path width', {
    'Path width': [
      ['wide-funnel', 'Broad Inflow Layer', 'Add up to 160 m of damage width.', { width: .16 }],
      ['satellite', 'Expanded Vorticity Field', 'Add up to another 360 m of damage width.', { width: .36 }],
      ['wedge', 'Wedge Circulation', 'Add up to another 700 m of damage width.', { width: .70 }],
    ],
  }, undefined, 'vortex'),
  { id: 'multi-vortex', name: 'Violent Multivortex Core', branch: 'Damage', group: 'Path width', cost: 12, capstone: true,
    description: 'Add 15 mph of peak wind and up to 500 m of damage width.',
    requiresAll: ['tornado-inner-core', 'wedge'], effects: { wind: 15, width: .5 } },
  ...upgradeTree('Damage', 'Rain and hail', {
    Precipitation: [
      ['rain-wrapped', 'Precipitation Curtain', 'Rain hides the funnel and delays warnings. Hail damages roofs and cars around the track.', { warningDelay: 12, rainWrap: 1, hail: .35, hailRadius: 2 }],
      ['tornado-rain-core', 'High-Precipitation Core', 'Larger hail damages a wider area, and heavy rain leaves runoff that keeps damaging property after the funnel passes.', { floodPower: .38, hail: .45, hailRadius: 2 }],
      ['tornado-rain-swath', 'Sustained Downpour', 'Increase hail damage and its reach. Heavier rain hides more of the funnel and makes flooding more damaging and longer lasting.', { floodPower: .28, floodLife: 16, rainWrap: .55, hail: .65, hailRadius: 3 }],
      ['tornado-runoff', 'Rain-Wrapped Deluge', 'Floodwater damages property faster and lingers longer. Heavier rain further conceals the funnel.', { floodPower: .34, floodLife: 24, rainWrap: .35 }],
    ],
  }, undefined, 'rear-flank'),
  ...upgradeTree('Damage', 'Debris and surface winds', {
    Debris: [
      ['tornado-debris', 'Debris Entrainment', 'Windborne debris adds up to 45% to property damage along the tornado track. Starts at EF1 and reaches full effect at EF3.', { debris: .45 }],
      ['tornado-debris-load', 'High Debris Loading', 'Larger windborne fragments add up to another 55% to track property damage, based on wind speed.', { debris: .55 }],
    ],
    'Near-ground winds': [
      ['tornado-low-jet', 'Near-Ground Jet', 'Add 24% to baseline wind damage to property.', { gust: .24 }],
      ['tornado-ground-jet', 'Ground-Level Surge', 'Add another 32% to baseline wind damage to property.', { gust: .32 }],
    ],
  }, ['tornado-debris-barrage', 'Ballistic Debris Field', 'Add up to another 75% to baseline track property damage. EF2 and stronger winds also reduce shelter protection by 20%.', { debris: .75, shelterBreach: .20 }], 'rear-flank'),
  ...upgradeTree('Abilities', 'Environmental resistance', {
    Inflow: [
      ['tornado-cold-pool', 'Buffered Inflow', 'Reduce weakening in both cold and hot, dry air. Also slow weakening over marginal terrain.', { coldTolerance: .24, heatTolerance: .24, hazardBuffer: .08 }, 5],
      ['tornado-baroclinic', 'Inflow Stabilization', 'Further resist temperature extremes and slow weakening as surrounding air becomes less favorable.', { coldTolerance: .24, heatTolerance: .24, hazardBuffer: .10 }, 8],
      ['tornado-inflow-coupling', 'Temperature Resilience', 'Further reduce weakening in hostile air and extend the inflow reserve.', { coldTolerance: .24, heatTolerance: .24, hazardBuffer: .12, endurance: .20 }, 10],
    ],
  }),
  ...upgradeTree('Abilities', 'Warning disruption', {
    Response: [
      ['tornado-response', 'Radar Signature Masking', 'Delay local warnings and reduce the share of residents who reach shelter, even before the tornado strikes.', { warningDelay: 16, gridlock: 18, warningFriction: .08 }, 4],
      ['tornado-grid', 'Repeater Failure', 'Delay warnings further and reduce shelter uptake. EF1 and stronger winds can cut local broadcasts.', { warningDelay: 10, gridlock: 12, warningFriction: .07, outageTime: 64, broadcast: .25 }, 6],
      ['tornado-warning-overload', 'Response Overload', 'Further reduce shelter uptake, keep broadcasts offline longer, and weaken protection where winds cut power.', { warningDelay: 10, gridlock: 18, warningFriction: .10, outageTime: 36, broadcast: .20, power: .14 }, 8],
    ],
  }),
  ...upgradeTree('Abilities', 'Satellite tornadoes', {
    Satellites: [
      ['tornado-satellite-seed', 'Satellite Rotation', 'Spawn a weaker tornado on land in a random direction. Recharges in 25 simulated minutes.', { satelliteTrigger: 1, satelliteChance: .10 }, 6],
      ['tornado-satellite-lobes', 'Unstable Rotation Lobes', 'Reduce recharge to 20 simulated minutes. Satellites last longer and form on their own more often.', { satelliteTrigger: 1, satelliteChance: .24, tornadoLife: 6 }, 8],
      ['tornado-satellite-split', 'Vortex Split', 'Reduce recharge to 15 simulated minutes. Satellites persist longer, cover more ground, and form on their own more often.', { satelliteTrigger: 1, satelliteChance: .30, tornadoLife: 8, tornadoWidth: .30 }, 10],
    ],
  }),
]

const hurricane = [
  ...upgradeTree('Formation', 'Warm-water intensification', {
    'Ocean heat': [
      ['warm', 'Warmer Water', 'Strengthen faster and reach higher winds over warm water.', { seaGain: .060 }],
      ['deep', 'Deep Heat', 'Draw on a deeper supply of warm water to strengthen further offshore.', { seaGain: .070 }],
    ],
    'Ocean coupling': [
      ['moist-inflow', 'Moist Inflow', 'Feed the circulation with moist air over warm seas.', { seaGain: .045 }],
      ['surface-flux', 'Ocean Heat Exchange', 'Draw more energy from warm seas into the storm core.', { seaGain: .045 }],
    ],
  }, ['marine', 'Marine Recharge', 'Unlock the highest sustained winds the warm-water path can support.', { seaGain: .055 }]),
  ...upgradeTree('Formation', 'Wind shear and cooler water', {
    Shear: [
      ['shear', 'Low Shear', 'Reduce weakening in cooler water and wind shear.', { coldBuffer: .10 }],
      ['shear-core', 'Aligned Core', 'Keep the circulation aligned when upper-level winds shift.', { coldBuffer: .09 }],
    ],
    'Cool water': [
      ['moist-core', 'Moisture Reserve', 'Reduce strength loss after moving into cooler water.', { coldBuffer: .08 }],
      ['cool-water', 'Cool-Water Buffer', 'Maintain the core longer as the ocean cools.', { coldBuffer: .08 }],
    ],
  }, ['shear-shield', 'Protected Core', 'Further resist the combined effects of shear and cooler water.', { coldBuffer: .09 }]),
  ...upgradeTree('Formation', 'Landfall endurance', {
    'Inner core': [
      ['core', 'Inland Reserve', 'Reduce base weakening over land by 8%.', { inlandBuffer: .08 }],
      ['persistent', 'Persistent Core', 'Reduce base inland weakening by another 6%.', { inlandBuffer: .06 }],
    ],
    'Moist inflow': [
      ['coastal-feed', 'Coastal Feed', 'Maintain the circulation longer as it crosses onto land.', { inlandBuffer: .055 }],
      ['inland-moisture', 'Inland Moisture', 'Slow the loss of strength over land.', { inlandBuffer: .055 }],
    ],
  }, ['inland-engine', 'Inland Engine', 'Reduce base inland weakening by another 7%.', { inlandBuffer: .07 }]),
  ...upgradeTree('Impact', 'Sustained winds', {
    Eyewall: [
      ['eye', 'Tight Eye', 'Add up to 12 mph to sustained winds.', { wind: 12 }, 4],
      ['rapid', 'Eyewall Contraction', 'Add up to another 18 mph while the core holds together.', { wind: 18 }],
      ['eyewall-jet', 'Eyewall Jet', 'Add up to another 25 mph to sustained winds.', { wind: 25 }],
      ['eyewall-peak', 'Intense Eyewall', 'Add up to another 34 mph. The extra wind fades as the core weakens.', { wind: 34 }],
    ],
  }),
  ...upgradeTree('Impact', 'Storm size and reach', {
    Circulation: [
      ['bands', 'Outer Bands', 'Widen the storm by 45 km and strengthen its outer impact.', { width: 45, fringe: 1 }, 4],
      ['broad-circulation', 'Broad Circulation', 'Widen the storm by another 50 km.', { width: 50 }],
      ['outer-wind-field', 'Outer Wind Field', 'Extend the damaging footprint and add another 55 km of width.', { width: 55, fringe: 1 }],
      ['expansive-circulation', 'Expansive Circulation', 'Add another 60 km of width and strengthen impact at the edges.', { width: 60, fringe: 1 }],
    ],
  }),
  ...upgradeTree('Impact', 'Rainfall and inland flooding', {
    Rain: [
      ['rain', 'Heavy Rain', 'Increase rainfall damage across the footprint.', { rain: .18 }],
      ['flood', 'Inland Flooding', 'Leave a damaging rain trail behind the storm.', { rainTrail: .20 }],
      ['training-bands', 'Training Rainbands', 'Repeated bands raise rainfall damage.', { rain: .16 }],
      ['saturated', 'Compound Flooding', 'Increase rainfall damage and strengthen the rain trail.', { rain: .14, rainTrail: .18 }],
    ],
  }),
  ...upgradeTree('Impact', 'Coastal surge', {
    Surge: [
      ['surge', 'Storm Surge', 'Push water ashore during sea-to-land crossings.', { surge: .08 }, 4],
      ['surge-fan', 'Surge Fan', 'Strengthen the surge and expose more coastal districts.', { surge: .035, surgeFringe: 1 }],
      ['coastal-fetch', 'Long Coastal Fetch', 'Drive water across a wider stretch of exposed coast.', { surge: .035, surgeFringe: 1 }],
      ['coastal-inundation', 'Coastal Inundation', 'Increase the force of landfall surge.', { surge: .055 }],
    ],
  }),
  ...upgradeTree('Impact', 'Gusts and structural damage', {
    Gusts: [
      ['gusts', 'Convective Gusts', 'Increase property damage caused by short gusts.', { gust: .10 }],
      ['gust-fronts', 'Rainband Gust Fronts', 'Increase damage to roofs and other exposed structures.', { gust: .12 }],
      ['wind-loading', 'Repeated Wind Loading', 'Repeated gusts increase property damage further.', { gust: .14 }],
      ['debris-impacts', 'Windborne Debris', 'Add damage from debris driven by strong gusts.', { gust: .17 }],
    ],
  }),
  ...upgradeTree('Disruption', 'Power and evacuation', {
    Power: [
      ['power', 'Power Outage', 'Strong impacts trigger outages and reduce shelter protection.', { outageTime: 48, power: .14 }],
      ['broadcast', 'Broadcasting Outage', 'Slow sheltering while power is out.', { broadcast: .32 }],
    ],
    Evacuation: [
      ['warnings', 'Delayed Advisories', 'Delay warnings in newly threatened districts.', { warningDelay: 13 }],
      ['gridlock', 'Road Gridlock', 'Increase travel time to shelter.', { gridlock: 25 }],
    ],
  }, ['overload', 'Emergency Overload', 'Increase exposure where damage overwhelms local response.', { overload: .18 }]),
  ...upgradeTree('Disruption', 'Recovery setbacks', {
    Infrastructure: [
      ['signal', 'Repeater Outages', 'Trigger local outages and keep them active after impact.', { outageTime: 34 }],
      ['blocked-routes', 'Blocked Access', 'Lengthen the time needed to reach shelter.', { gridlock: 16 }],
      ['spare-capacity', 'Strained Backup Power', 'Make outages last longer and reduce shelter protection.', { outageTime: 25, power: .10 }],
      ['supply', 'Supply Breakdown', 'Increase property damage while a local outage is active.', { supply: .22 }],
    ],
  }),
]

const blizzard = [
  ...upgradeTree('Movement', 'Storm track', {
    Steering: [
      ['snow-steer', 'Aligned Flow', 'Reduce drift away from the prevailing wind.', { trackStability: .32 }, 3],
      ['snow-track', 'Stable Storm Track', 'Steady the path as the storm travels.', { trackStability: .31 }, 5],
      ['snow-alignment', 'Deep-Layer Alignment', 'Keep the band on a more predictable track.', { trackStability: .37 }, 7],
    ],
  }),
  ...upgradeTree('Movement', 'Forward speed', {
    Translation: [
      ['snow-slow', 'Slow Translation', 'Move 12% more slowly so snow has longer to accumulate.', { spread: -.12 }, 3],
      ['snow-block', 'Blocking Pattern', 'Slow the storm by another 10% of base speed.', { spread: -.10 }, 5],
      ['snow-stall', 'Anchored Band', 'Slow the storm by another 8% of base speed.', { spread: -.08 }, 7],
    ],
  }),
  ...upgradeTree('Movement', 'Persistence', {
    Support: [
      ['snow-support', 'Steady Cold Feed', 'Draw down environmental support more slowly.', { endurance: .16 }, 3],
      ['snow-reserve', 'Cold-Air Reserve', 'Preserve support farther down the track.', { endurance: .18 }, 5],
      ['polar-lock', 'Polar Lock', 'Sustain the circulation as its support runs low. Especially useful for Clippers crossing the prairies.', { endurance: .24 }, 7],
    ],
  }),
  ...upgradeTree('Damage', 'Moisture and snowfall', {
    'Moisture uptake': [
      ['powder', 'Moisture Uptake', 'Absorb more moisture as cold air feeds the storm.', { snowGain: .24 }, 3],
      ['powder-drift', 'Moisture Convergence', 'Feed more moisture into the snow band.', { snowGain: .22 }, 5],
      ['snow-feeder', 'Persistent Moisture Feed', 'Keep drawing moisture into the storm as it moves.', { snowGain: .22 }, 7],
    ],
    'Snow production': [
      ['snow-crystals', 'Snow Crystal Growth', 'Increase the snowfall rate in cold air.', { snowRate: .18 }, 3],
      ['snow-aggregates', 'Heavy Flakes', 'Increase the accumulation rate as flakes clump together.', { snowRate: .18 }, 5],
      ['snow-lift', 'Sustained Lift', 'Support heavier precipitation in the band.', { snowRate: .21 }, 7],
      ['snow-dump', 'Intense Snowfall', 'Further increase the snowfall rate when moisture is available.', { snowRate: .26 }, 10],
    ],
  }, ['snow-plume', 'Deep Snow Plume', 'Combine strong moisture uptake with heavier snowfall.', { snowGain: .20, snowRate: .20 }, 11]),
  ...upgradeTree('Damage', 'Band width', {
    'Snow shield': [
      ['snow-bands', 'Snow Bands', 'Widen the area receiving snow by 14 km.', { width: 14 }, 3],
      ['snow-squalls', 'Expanded Snow Shield', 'Add another 16 km to the snow footprint.', { width: 16 }, 5],
    ],
    'Band edges': [
      ['snow-fringe', 'Fringe Flurries', 'Spread light snow beyond the main band.', { width: 10 }, 3],
      ['snow-wrap', 'Wraparound Snow', 'Extend snow farther out from the core.', { width: 14 }, 5],
    ],
  }, ['snow-wide', 'Broad Snow Shield', 'Widen the snow footprint by another 20 km.', { width: 20 }, 8]),
  ...upgradeTree('Damage', 'Wind and whiteouts', {
    Wind: [
      ['gust-front', 'Gust Front', 'Raise peak winds by up to 7 mph.', { wind: 7 }, 3],
      ['snow-gusts', 'Strong Surface Gusts', 'Add up to another 9 mph to peak winds.', { wind: 9 }, 5],
    ],
    'Blowing snow': [
      ['snow-loft', 'Lofted Snow', 'Let wind lift more settled snow and reduce visibility.', { drift: .20 }, 3],
      ['whiteout', 'Blowing Snow', 'Increase blowing snow when wind crosses an existing snowpack.', { drift: .24 }, 5],
    ],
  }, ['whiteout-lock', 'Ground Blizzard', 'Stronger winds and more blowing snow make whiteouts more likely.', { wind: 7, drift: .25 }, 9]),
  ...upgradeTree('Damage', 'Drifting snow', {
    Drifts: [
      ['snow-drifts', 'Snowdrifts', 'Increase drifting snow and damage from deep accumulations.', { drift: .14 }, 3],
      ['snow-loading', 'Snow Loading', 'Raise property losses as snow accumulates.', { gust: .16 }, 5],
      ['snow-burden', 'Heavy Snow Load', 'Increase damage from snow and wind.', { gust: .21 }, 7],
    ],
  }),
  ...upgradeTree('Abilities', 'Cold-air resilience', {
    'Cold core': [
      ['arctic-inflow', 'Arctic Inflow', 'Build strength faster in favorable cold air.', { hazardGain: .035 }, 3],
      ['arctic-feed', 'Arctic Feed', 'Reduce weakening during warmer intervals.', { hazardBuffer: .17 }, 5],
    ],
    'Cold margin': [
      ['snow-cold', 'Cold-Air Retention', 'Preserve snowfall at the warm edge of the band.', { coldTolerance: .10 }, 3],
      ['snow-warm-front', 'Resist Thaw', 'Protect the cold core against short warm-air intrusions.', { coldTolerance: .12 }, 5],
    ],
  }, ['snow-cold-lock', 'Cold-Core Resilience', 'Resist warming and preserve the cold air needed for snow.', { coldTolerance: .11, hazardBuffer: .17 }, 8]),
  ...upgradeTree('Abilities', 'Lake and ocean moisture', {
    'Lake fetch': [
      ['snow-lake', 'Lake Inflow', 'Absorb more lake moisture. An Alberta Clipper can use it to rebuild over the Great Lakes.', { lakeMoisture: .25 }, 3],
      ['snow-lake-band', 'Long Lake Fetch', 'Increase lake moisture uptake and strengthen a Clipper’s recovery over the Great Lakes.', { lakeMoisture: .32 }, 5],
    ],
    'Ocean feed': [
      ['snow-ocean', 'Maritime Inflow', 'Absorb more moisture while crossing cold coastal waters.', { oceanMoisture: .23 }, 3],
      ['snow-coastal', 'Coastal Moisture Feed', 'Increase ocean moisture uptake further.', { oceanMoisture: .32 }, 5],
    ],
  }, ['snow-water-reserve', 'Water-Fed Snow Band', 'Hold moisture from lakes and oceans longer after moving inland.', { snowRetention: .65 }, 8]),
  ...upgradeTree('Abilities', 'Ice and blocked roads', {
    Infrastructure: [
      ['ice-grid', 'Ice-Loaded Lines', 'Damage triggers power outages that slow sheltering.', { outageTime: 44, broadcast: .18 }, 3],
      ['blocked-roads', 'Blocked Roads', 'Drifts increase travel time to shelter.', { gridlock: 20 }, 5],
      ['isolated-towns', 'Isolated Towns', 'Lengthen outages and keep roads blocked longer.', { outageTime: 26, gridlock: 12 }, 7],
      ['snow-response', 'Regional Disruption', 'Slow emergency response in the hardest-hit areas.', { overload: .17 }, 10],
    ],
  }),
]

const wildfire = [
  ...upgradeTree('Movement', 'Wind-driven spread', {
    Wind: [
      ['spread', 'Surface Gusts', 'Help flames reach adjacent fuel.', { spread: .16 }, 3],
      ['fire-wind', 'Sustained Wind', 'Increase heat transfer toward unburned ground.', { spread: .18 }, 5],
    ],
    Front: [['fire-edge', 'Fast-Moving Edge', 'Increase the rate of spread along the perimeter.', { spread: .12 }, 4]],
  }, ['fire-run', 'Wind-Driven Run', 'Allow another patch to ignite during a spread step.', { spread: .12, fringe: 1 }, 10]),
  ...upgradeTree('Movement', 'Fuel continuity', {
    Surface: [
      ['dry-fuels', 'Dry Fine Fuels', 'Dry grass and litter help fire build heat.', { hazardGain: .008 }, 3],
      ['fire-continuity', 'Continuous Litter', 'Move more easily through connected surface fuel.', { spread: .15 }, 5],
    ],
    Reserve: [['fire-logs', 'Coarse Fuel', 'Sustain burning with a larger fuel reserve.', { endurance: .16 }, 4]],
  }, ['deep-roots', 'Deep Fuel Reserve', 'Slow fuel exhaustion and sustain the fire edge.', { endurance: .20, spread: .10 }, 9]),
  ...upgradeTree('Movement', 'Moisture resistance', {
    Duff: [
      ['rain-proof', 'Duff Insulation', 'Reduce cooling during damp weather.', { hazardBuffer: .16 }, 3],
      ['fire-deep-duff', 'Deep Duff', 'Retain heat and fuel in damp conditions.', { hazardBuffer: .13, endurance: .10 }, 5],
    ],
    Drying: [['fire-drying', 'Preheated Fuel', 'Build heat faster as nearby fuel dries.', { hazardGain: .009 }, 4]],
  }, ['fire-dry-window', 'Persistent Drying', 'Retain more heat when damp air returns.', { hazardBuffer: .18, hazardGain: .006 }, 9]),
  ...upgradeTree('Damage', 'Crown fire', {
    Canopy: [
      ['crown', 'Torching Canopy', 'Build hotter flames as individual crowns ignite.', { hazardGain: .009 }, 3],
      ['fire-ladder', 'Ladder Fuels', 'Carry fire into the canopy and increase damage.', { hazardDamage: .13, hazardGain: .006 }, 5],
    ],
    Heat: [
      ['fire-radiant', 'Radiant Heat', 'Increase damage around burning fuel.', { hazardDamage: .16 }, 3],
      ['fire-crown-front', 'Crown Fire Front', 'Sustain a hotter, more damaging crown fire.', { hazardDamage: .15, hazardGain: .009 }, 6],
    ],
  }, ['fire-crown-run', 'Active Crown Fire', 'Increase heat and damage across the fire front.', { hazardDamage: .22, hazardGain: .012 }, 11]),
  ...upgradeTree('Damage', 'Ember spotting', {
    Embers: [
      ['embers', 'Lofted Firebrands', 'Recharge the Send Embers ability faster.', { chargeGain: .18 }, 3],
      ['ember-loft', 'Long-Range Embers', 'Reach farther downwind and let intense fire start occasional spot fires.', { fireSpot: 1 }, 6],
    ],
    Ignition: [
      ['fire-receptive', 'Receptive Fuel', 'Give new spot fires more starting heat.', { burstPower: .18 }, 3],
      ['fire-ember-shower', 'Ember Shower', 'Further strengthen newly ignited spot fires.', { burstPower: .18, chargeGain: .10 }, 6],
    ],
  }, ['ember-storm', 'Ember Storm', 'Extend spotting reach, start hotter spot fires, and target a highlighted downwind cell.', { fireSpot: 1, burstPower: .22 }, 11]),
  ...upgradeTree('Damage', 'Persistent heat', {
    Fuel: [
      ['smolder', 'Smoldering Fuels', 'Use fuel more slowly.', { endurance: .12 }, 3],
      ['fire-coals', 'Deep Coals', 'Maintain heat and burn for longer.', { endurance: .14, hazardGain: .005 }, 5],
    ],
    Heat: [['fire-buildup', 'Heat Buildup', 'Increase damage from active fire.', { hazardDamage: .13 }, 4]],
  }, ['fire-holdover', 'Holdover Heat', 'Extend burning and intensify damage.', { endurance: .16, hazardDamage: .16 }, 9]),
  ...upgradeTree('Damage', 'Built exposure', {
    Structures: [
      ['fire-structures', 'Structure Exposure', 'Increase property damage in populated areas.', { hazardDamage: .14 }, 3],
      ['fire-interface', 'Interface Fire', 'Increase damage at the edge of settlements.', { hazardDamage: .16 }, 5],
    ],
    Smoke: [['fire-smoke-damage', 'Dense Smoke', 'Add to damage in affected districts.', { hazardDamage: .10 }, 4]],
  }, ['fire-urban-edge', 'Urban Interface', 'Increase property damage where fire reaches settlements.', { hazardDamage: .20 }, 9]),
  ...upgradeTree('Abilities', 'Ground crew resistance', {
    Perimeter: [
      ['fire-flanks', 'Active Flanks', 'Slow containment as crews divide across the perimeter.', { fireLine: .09 }, 3],
      ['fire-line-hold', 'Persistent Flanks', 'Further slow crew containment.', { fireLine: .09 }, 6],
    ],
    Front: [
      ['fire-line-heat', 'Intense Flame Front', 'High heat limits direct attack.', { fireLine: .08 }, 3],
      ['fire-long-edge', 'Long Perimeter', 'Increase the amount of line crews must hold.', { fireLine: .08 }, 6],
    ],
  }, ['fire-line-pressure', 'Perimeter Pressure', 'Slow progress on crew containment lines.', { fireLine: .11 }, 12]),
  ...upgradeTree('Abilities', 'Aerial suppression resistance', {
    Smoke: [
      ['fire-smoke-column', 'Smoke Column', 'Reduce the effect of aerial drops.', { fireAir: .12 }, 3],
      ['fire-low-visibility', 'Low Visibility', 'Further reduce aerial suppression.', { fireAir: .12 }, 6],
    ],
    Weather: [
      ['fire-gusty-air', 'Gusty Air', 'Make aerial suppression less effective in the model.', { fireAir: .10 }, 3],
      ['fire-turbulence', 'Turbulent Air', 'Reduce containment gained during a drop.', { fireAir: .10 }, 6],
    ],
  }, ['fire-flight-window', 'Limited Flight Window', 'Further reduce the effect of aerial suppression.', { fireAir: .12 }, 11]),
  ...upgradeTree('Abilities', 'Warnings and evacuation', {
    Warnings: [
      ['evacuation', 'Late Detection', 'Give crews and evacuation warnings a later start.', { fireDelay: 8, warningDelay: 6 }, 3],
      ['response', 'Overwhelmed Response', 'Delay additional response in damaged districts.', { fireDelay: 6, overload: .12 }, 6],
    ],
    Roads: [['smoke-roads', 'Smoke Over Roads', 'Slow evacuation in low visibility.', { gridlock: 14 }, 4]],
  }, ['fire-evac-pressure', 'Evacuation Pressure', 'Extend response and evacuation delays.', { fireDelay: 7, warningDelay: 6, gridlock: 10 }, 10]),
]

const dustStorm = [
  ...upgradeTree('Formation', 'Dust supply and outflow', {
    'Dry soils': [
      ['favorable', 'Loose Topsoil', 'Build strength faster when dry soil is available.', { hazardGain: .055 }],
      ['persistence', 'Deep Dust Bed', 'Lose less strength when crossing patches of damp ground.', { hazardBuffer: .32 }],
    ],
    Outflow: [
      ['reserve', 'Gust Front', 'Build dust load faster between dust walls.', { chargeGain: .25 }],
      ['dust-travel', 'Outflow Propagation', 'Advance faster along the current route.', { spread: .17 }],
    ],
  }, ['hazard-endurance', 'Sustained Haboob', 'Preserve support and keep replenishing the dust load.', { endurance: .21, chargeGain: .14 }]),
  ...upgradeTree('Impact', 'Airborne dust and dust wall', {
    'Airborne dust': [
      ['impact', 'Denser Dust', 'Increase ongoing damage from airborne dust.', { hazardDamage: .23 }],
      ['footprint', 'Broad Dust Plume', 'Widen the plume and expose an adjacent zone.', { fringe: 1, width: 35 }],
    ],
    'Dust wall': [
      ['mastery', 'Near-Zero Visibility', 'Make an active dust wall more damaging.', { burstPower: .30 }],
      ['dust-linger', 'Suspended Dust', 'Keep the dust wall active longer.', { burst: 13 }],
    ],
  }, ['hazard-dominance', 'Sustained Dust Wall', 'Sustain a more damaging wall and extend its duration.', { burstPower: .25, burst: 12 }]),
  ...upgradeTree('Disruption', 'Road visibility', {
    Response: [
      ['response', 'Sudden Visibility Drop', 'Delay warnings in the path of a fast-moving dust wall.', { warningDelay: 13 }],
      ['grid', 'Highway Closures', 'Increase travel time to shelter as routes close.', { gridlock: 26 }],
      ['dust-response', 'Stranded Traffic', 'Increase exposure where damage has already interrupted travel.', { overload: .20 }],
    ],
  }),
]

const heatDome = [
  ...upgradeTree('Formation', 'High pressure and overnight heat', {
    'High pressure': [
      ['favorable', 'Sinking Air', 'Build heat faster under stagnant high pressure.', { hazardGain: .058 }],
      ['persistence', 'Blocking Ridge', 'Slow weakening when a cool front approaches.', { hazardBuffer: .32 }],
    ],
    'Heat storage': [
      ['reserve', 'Heat Reservoir', 'Recharge heat reserve faster between hot nights.', { chargeGain: .21 }],
      ['heat-retention', 'Urban Heat Storage', 'Preserve the dome’s environmental support longer.', { endurance: .15 }],
    ],
  }, ['hazard-endurance', 'Persistent Block', 'Sustain the dome longer through changes in surrounding weather.', { endurance: .19, hazardBuffer: .12 }]),
  ...upgradeTree('Impact', 'Daytime heat and hot nights', {
    Daytime: [
      ['impact', 'Heat Stress', 'Increase ongoing heat impacts.', { hazardDamage: .24 }],
      ['footprint', 'Stored Surface Heat', 'Raise peak temperatures and increase ongoing heat impacts.', { heatDegrees: 2, hazardDamage: .12 }],
    ],
    Nighttime: [
      ['mastery', 'Hot Nights', 'Increase the impact of trapped overnight heat.', { burstPower: .28 }],
      ['heat-night', 'No Overnight Relief', 'Extend the period of trapped overnight heat.', { burst: 22 }],
    ],
  }, ['hazard-dominance', 'Compound Heat Wave', 'Extend hot nights and increase their impact as heat accumulates.', { burstPower: .25, burst: 20 }]),
  ...upgradeTree('Disruption', 'Heat alerts and cooling power', {
    Alerts: [
      ['response', 'Delayed Heat Alert', 'Delay official alerts in newly affected areas.', { warningDelay: 14 }],
      ['cooling-access', 'Cooling Center Queues', 'Increase the time it takes residents to reach relief.', { gridlock: 24 }],
    ],
    'Power demand': [
      ['grid', 'Peak Grid Load', 'Damage triggers outages that slow access to cooling.', { outageTime: 48, broadcast: .24, power: .12 }],
      ['grid-load', 'Cooling Grid Overload', 'Keep the cooling grid down longer in affected areas.', { outageTime: 32, power: .12 }],
    ],
  }, ['heat-grid-cascade', 'Cascading Outages', 'Increase exposure when local heat damage has disrupted emergency response.', { overload: .19 }]),
]

const stormSignature: Record<Exclude<ThunderstormType, 'Thunderstorm' | 'Supercell'>, {
  group: string; first: UpgradeNode; second: UpgradeNode; capstone: UpgradeNode
}> = {
  Derecho: {
    group: 'Straight-line wind',
    first: ['impact-gust', 'Momentum Transfer', 'Strengthen the active gust front.', { burstPower: .28 }],
    second: ['impact-signature', 'Bow Echo', 'Increase width and keep the active front damaging longer.', { width: 36, burst: 8 }],
    capstone: ['impact-extreme', 'Targeted Wind Front', 'Aim the gust front over land and increase its reach and impact.', { targetedBurst: 1, width: 26, burstPower: .22 }],
  },
  Multicell: {
    group: 'Cell regeneration',
    first: ['impact-gust', 'Cell Regeneration', 'Extend the lifetime of newly seeded cells.', { burst: 14 }],
    second: ['impact-signature', 'Feeder Cells', 'Rebuild inflow faster and strengthen seeded cells.', { chargeGain: .18, burstPower: .24 }],
    capstone: ['impact-extreme', 'Targeted Cell Cluster', 'Choose where to seed a cluster over land and keep its cells active longer.', { targetedBurst: 1, burst: 10, width: 22 }],
  },
  Pulse: {
    group: 'Downburst',
    first: ['impact-gust', 'Evaporative Cooling', 'Strengthen short downbursts.', { burstPower: .36 }],
    second: ['impact-signature', 'Descending Core', 'Keep the damaging downburst active for another four seconds.', { burst: 4 }],
    capstone: ['impact-extreme', 'Targeted Downburst', 'Aim a concentrated downburst over land and increase its damage.', { targetedBurst: 1, burstPower: .28 }],
  },
  Squall: {
    group: 'Line outflow',
    first: ['impact-gust', 'Bowing Line', 'Widen the line and sustain its gust front longer.', { width: 30, burst: 6 }],
    second: ['impact-signature', 'Rear Inflow Jet', 'Strengthen the active line’s damaging wind.', { burstPower: .28 }],
    capstone: ['impact-extreme', 'Targeted Squall Line', 'Aim the gust front over land and widen its damaging footprint.', { targetedBurst: 1, width: 30, burst: 5 }],
  },
  'Storm Cell': {
    group: 'Hail growth',
    first: ['impact-gust', 'Hail Recycling', 'Increase damage from the active hail barrage.', { burstPower: .30 }],
    second: ['impact-signature', 'Wet Growth', 'Sustain the barrage longer as hail grows in the updraft.', { burst: 8 }],
    capstone: ['impact-extreme', 'Targeted Hail Swath', 'Aim hail over land and widen its damaging footprint.', { targetedBurst: 1, width: 16, burstPower: .22 }],
  },
  Lightning: {
    group: 'Electrical discharge',
    first: ['impact-gust', 'Repeated Strikes', 'Extend the strike barrage by three seconds.', { burst: 3 }],
    second: ['impact-signature', 'Charge Separation', 'Build charge faster and increase barrage damage.', { chargeGain: .16, burstPower: .22 }],
    capstone: ['impact-extreme', 'Targeted Outbreak', 'Aim a concentrated lightning barrage over land and increase its damage.', { targetedBurst: 1, burstPower: .28 }],
  },
}

function convectionTree(storm: ThunderstormType) {
  const rotating = storm === 'Thunderstorm' || storm === 'Supercell'
  const signature = rotating ? undefined : stormSignature[storm]
  const resource = hazards[storm].ability.resource
  return [
    ...upgradeTree('Storm Track', 'Inflow and steering', {
      Inflow: [
        ['track-inflow', 'Moist Inflow', 'Build strength faster in favorable air.', { hazardGain: .030 }],
        ['track-organize', 'Organized Core', 'Weaken more slowly in stable air and reduce course wobble.', { hazardBuffer: .15, trackStability: .24 }],
      ],
      Steering: [
        ['track-align', 'Flow Alignment', 'Reduce course wobble and move 12% faster.', { trackStability: .26, spread: .12 }],
      ],
    }, ['track-control', 'Course Control', 'Choose a preferred heading on the map. The parent storm turns gradually.', { courseControl: 1 }]),
    ...(rotating ? upgradeTree('Tornadoes', 'Rotation and touchdown', {
      Rotation: [
        ['funnel-rotation', 'Stronger Rotation', 'Rebuild rotation faster and improve the odds of stronger tornadoes.', { chargeGain: .22, tornadoIntensity: .055 }],
        ['funnel-core', 'Violent Core', 'Spawn wider, longer-lived tornadoes with a better chance of higher EF ratings.', { tornadoWidth: .42, tornadoLife: 13, tornadoIntensity: .085 }],
      ],
      Guidance: [
        ['funnel-guidance', 'Guided Funnels', 'Select a funnel to guide its heading and spend less rotation on each drop.', { tornadoSteering: 1, tornadoEfficiency: 4 }],
      ],
    }, ['funnel-precision', 'Precision Touchdown', 'Choose a land point inside the highlighted drop area.', { precisionDrop: 1 }]) : []),
    ...upgradeTree('Severe Impact', signature?.group ?? 'Wind and power disruption', {
      [signature ? 'Active ability' : 'Damaging winds']: signature ? [signature.first, signature.second] : [
        ['impact-hail', 'Stronger Core', 'Increase ongoing storm damage.', { hazardDamage: .27 }],
        ['impact-gust', 'Severe Gusts', 'Widen the damaging storm footprint and strengthen tornado property damage.', { width: 24, burstPower: .25 }],
      ],
      [signature ? 'Storm core' : 'Power disruption']: signature ? [
        ['impact-hail', 'Stronger Core', 'Increase ongoing storm damage.', { hazardDamage: .27 }],
        ['impact-grid', 'Grid Failure', 'Damage causes outages that slow sheltering.', { outageTime: 42, broadcast: .26, power: .10 }],
      ] : [
        ['impact-grid', 'Grid Failure', 'Damage causes outages that slow sheltering.', { outageTime: 42, broadcast: .26, power: .10 }],
        ['impact-broadcast', 'Interrupted Alerts', 'Delay local warnings and extend power outages.', { warningDelay: 12, outageTime: 22 }],
      ],
    }, signature?.capstone ?? ['impact-extreme', 'Extreme Outbreak', 'Strengthen ongoing storm damage and widen the impact footprint.', { hazardDamage: .28, width: 28 }]),
    ...upgradeTree('Flooding', 'Rainfall and drainage', {
      Rain: [
        ['flood-rain', 'Heavy Rain', 'Leave accumulating runoff along the storm track.', { floodPower: .30 }],
        ['flood-ground', 'Saturated Ground', 'Increase runoff and extend local flooding.', { floodPower: .28, floodLife: 21 }],
      ],
      Drainage: [
        ['flood-drain', 'Overloaded Drainage', 'Increase flood damage and keep water in impacted districts longer.', { floodPower: .22, floodLife: 24 }],
      ],
    }, ['flood-cascade', 'Flash Flood Cascade', 'Spread runoff across more districts and increase flood damage.', { floodPower: .34, width: 20 }]),
    ...upgradeTree('Longevity', 'Stable inflow and recharge', {
      Inflow: [
        ['life-inflow', 'Sustained Inflow', 'Slow weakening in stable air.', { hazardBuffer: .18 }],
        ['life-reserve', 'Moisture Reserve', 'Rebuild strength faster and lose less in stable air.', { hazardGain: .035, hazardBuffer: .17 }],
      ],
      Recharge: [
        ['life-recharge', 'Persistent Updraft', `Replenish ${resource} faster between ability activations.`, { chargeGain: .20 }],
      ],
    }, ['life-window', 'Long-Lived System', 'Use inflow more slowly and further resist weakening in stable air.', { endurance: .26, hazardBuffer: .14 }]),
  ]
}

const thunderstorm = [
  ...upgradeTree('Movement', 'Track control', {
    Inflow: [
      ['track-inflow', 'Moist Inflow', 'Build strength faster in unstable air.', { hazardGain: .030 }],
      ['track-organize', 'Organized Core', 'Reduce course wobble and resist stable air.', { hazardBuffer: .12, trackStability: .24 }],
    ],
    Steering: [
      ['track-align', 'Flow Alignment', 'Reduce course wobble and move 12% faster.', { trackStability: .26, spread: .12 }],
    ],
  }, ['track-control', 'Course Control', 'Set a preferred heading. The storm turns gradually.', { courseControl: 1 }, 9]),
  ...upgradeTree('Movement', 'Inflow and longevity', {
    Inflow: [
      ['life-inflow', 'Sustained Inflow', 'Slow weakening in stable air.', { hazardBuffer: .14 }],
      ['life-reserve', 'Moisture Reserve', 'Build strength faster and conserve inflow.', { hazardGain: .025, endurance: .12 }],
    ],
    Updraft: [
      ['life-recharge', 'Persistent Updraft', 'Replenish rotation faster after a tornado drop.', { chargeGain: .13 }],
    ],
  }, ['life-window', 'Long-Lived System', 'Slow inflow depletion and resist weakening.', { endurance: .23, hazardBuffer: .12 }, 9]),
  ...upgradeTree('Movement', 'Forward motion', {
    Flow: [
      ['storm-flow', 'Deep-Layer Flow', 'Move 8% faster.', { spread: .08 }],
      ['storm-corridor', 'Fast-Moving Corridor', 'Increase forward speed and reduce track wobble.', { spread: .10, trackStability: .12 }],
      ['storm-jet', 'Fast Steering Flow', 'Add another 12% to forward speed.', { spread: .12 }],
    ],
  }),
  ...upgradeTree('Damage', 'Straight-line winds', {
    Outflow: [
      ['storm-outflow', 'Cold Pool', 'Rain-cooled outflow begins organizing the storm into a squall line.', { outflow: 1, width: 8 }],
      ['storm-shelf', 'Shelf Cloud', 'Strengthen the organized gust front and widen the wind footprint.', { outflow: 1, width: 12 }],
    ],
    Gusts: [
      ['storm-gusts', 'Damaging Gusts', 'Add up to 9 mph to surface winds.', { wind: 9 }],
      ['storm-downburst', 'Downburst Core', 'Increase local wind damage and add up to 10 mph.', { wind: 10, hazardDamage: .18 }],
    ],
  }, ['storm-bow', 'Bowing Line', 'Build a stronger outflow and concentrate the fastest winds along the leading edge.', { outflow: 1, wind: 9, hazardDamage: .15 }, 12]),
  ...upgradeTree('Damage', 'Hail and ice', {
    Hail: [
      ['impact-hail', 'Hail Embryos', 'Grow hail in the updraft and begin damaging property under the core.', { hail: .18, hailRadius: 5 }],
      ['storm-hail-growth', 'Large Hail', 'Increase damage from hailstones.', { hail: .18 }],
    ],
    Footprint: [
      ['storm-hail-shaft', 'Wide Hail Shaft', 'Spread hail damage over more ground.', { hail: .10, hailRadius: 4 }],
      ['storm-hail-swath', 'Hail Swath', 'Widen the hail footprint and increase property damage.', { hail: .15, hailRadius: 4 }],
    ],
  }, ['storm-hail-core', 'Giant Hail Core', 'Sustain a concentrated swath of damaging hail.', { hail: .27, hailRadius: 5 }, 11]),
  ...upgradeTree('Damage', 'Rainfall and drainage', {
    Rain: [
      ['flood-rain', 'Heavy Rain', 'Leave runoff behind the storm.', { floodPower: .26 }],
      ['flood-ground', 'Saturated Ground', 'Increase runoff and extend local flooding.', { floodPower: .19, floodLife: 16 }],
    ],
    Drainage: [
      ['flood-drain', 'Overloaded Drainage', 'Keep floodwater in low-lying districts longer.', { floodPower: .14, floodLife: 19 }],
    ],
  }, ['flood-cascade', 'Flash Flood Cascade', 'Increase flood damage, especially where cells keep passing over the same area.', { floodPower: .27, floodLife: 12 }, 9]),
  ...upgradeTree('Abilities', 'Rotation and touchdown', {
    Rotation: [
      ['funnel-rotation', 'Stronger Rotation', 'Organize a rotating updraft into a supercell and improve tornado intensity.', { mesocyclone: 1, chargeGain: .12, tornadoIntensity: .055 }],
      ['funnel-core', 'Violent Core', 'Favor supercell organization and drop wider, longer-lived tornadoes.', { mesocyclone: 1, tornadoWidth: .28, tornadoLife: 8, tornadoIntensity: .075 }],
    ],
    Guidance: [
      ['funnel-guidance', 'Guided Funnels', 'Steer individual tornadoes and spend less rotation on each drop.', { tornadoSteering: 1, tornadoEfficiency: 4 }],
    ],
  }, ['funnel-precision', 'Precision Touchdown', 'Choose a land point inside the drop area and further favor supercell organization.', { mesocyclone: 1, precisionDrop: 1 }, 11]),
  ...upgradeTree('Abilities', 'Cell regeneration', {
    Cells: [
      ['storm-new-cell', 'Secondary Updrafts', 'Organize a multicell cluster with new development beside the core.', { newCells: 1 }],
      ['storm-regenerate', 'Regenerating Cells', 'Favor the cluster and use inflow more slowly.', { newCells: 1, endurance: .13 }],
    ],
    Training: [
      ['storm-train', 'Cell Training', 'Focus runoff behind the storm where cells cross the same ground.', { floodPower: .12, floodLife: 10 }],
      ['storm-merge', 'Merging Cells', 'Increase the cluster footprint and boost runoff.', { floodPower: .16, width: 10 }],
    ],
  }, ['storm-complex', 'Long-Lived Cluster', 'Favor multicell organization and sustain a broader cluster.', { newCells: 1, endurance: .18, width: 12 }, 11]),
  ...upgradeTree('Abilities', 'Electrical activity', {
    Charge: [
      ['storm-charge', 'Charge Separation', 'Produce occasional ground strikes as the storm strengthens.', { lightning: .22 }],
      ['storm-flash', 'Frequent Ground Strikes', 'Increase the frequency of ground strikes.', { lightning: .18 }],
    ],
    Grid: [
      ['storm-grid-strike', 'Grid Strikes', 'Increase the chance of a ground strike and prolong local outages.', { lightning: .13, lightningOutage: 14 }],
      ['storm-transformers', 'Transformer Damage', 'Extend outages caused by ground strikes.', { lightningOutage: 20, power: .08 }],
    ],
  }, ['storm-barrage', 'Electrical Barrage', 'Increase ground-strike frequency and extend their outages.', { lightning: .22, lightningOutage: 16 }, 11]),
  ...upgradeTree('Abilities', 'Warning and response', {
    Outages: [
      ['impact-grid', 'Grid Failure', 'Severe wind damage can interrupt local power.', { outageTime: 24, power: .08 }],
      ['storm-grid-cascade', 'Cascading Outages', 'Extend outages and slow the response in affected districts.', { outageTime: 20, broadcast: .13 }],
    ],
    Warnings: [
      ['impact-broadcast', 'Interrupted Alerts', 'Delay warnings by 8 forecast seconds.', { warningDelay: 8 }],
      ['storm-road-blocks', 'Blocked Roads', 'Slow sheltering after warnings are issued.', { gridlock: .15 }],
    ],
  }, ['storm-response', 'Overloaded Response', 'Delay warnings further and slow sheltering in damaged areas.', { warningDelay: 8, gridlock: .14, overload: .09 }, 11]),
]

export const trees: Record<Storm, Upgrade[]> = {
  Tornado: tornadoUpgrades,
  Hurricane: hurricane,
  Blizzard: blizzard,
  Thunderstorm: thunderstorm,
  Derecho: convectionTree('Derecho'),
  Multicell: convectionTree('Multicell'),
  Pulse: convectionTree('Pulse'),
  Squall: convectionTree('Squall'),
  'Storm Cell': convectionTree('Storm Cell'),
  Supercell: convectionTree('Supercell'),
  Lightning: convectionTree('Lightning'),
  Wildfire: wildfire,
  'Dust Storm': dustStorm,
  'Heat Dome': heatDome,
}
