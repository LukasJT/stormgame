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
  coldTolerance: 0, heatTolerance: 0, shelterBreach: 0,
  tornadoRange: 0, tornadoLifetime: 0, satelliteChance: 0, satelliteTrigger: 0,
}
export type Effects = typeof baseEffects

export type Upgrade = {
  id: string; name: string; branch: Branch; cost: number; description: string
  requires?: string; requiresAll?: string[]; group?: string; lane?: string; capstone?: true; effects: Partial<Effects>
}

type UpgradeNode = [id: string, name: string, description: string, effects: Partial<Effects>, cost?: number]

function upgradeTree(branch: Branch, group: string, lanes: Record<string, UpgradeNode[]>, merge?: UpgradeNode): Upgrade[] {
  const tornado = tornadoBranches.some(category => category === branch)
  const prices = tornado ? [4, 7, 11, 15] : [3, 5, 7, 11]
  const upgrades = Object.entries(lanes).flatMap(([lane, nodes]) => nodes.map(([id, name, description, effects, cost], index) => ({
    id, name, description, effects, branch, group, lane,
    cost: cost ?? prices[index], requires: nodes[index - 1]?.[0],
  })))
  if (!merge) return upgrades
  const [id, name, description, effects, cost] = merge
  return [...upgrades, {
    id, name, description, effects, branch, group, cost: cost ?? (tornado ? 12 : 9), capstone: true,
    requiresAll: Object.values(lanes).map(nodes => nodes.at(-1)![0]),
  }]
}

const tornadoUpgrades = [
  ...upgradeTree('Movement', 'Travel distance', {
    Track: [
      ['tornado-track-feed', 'Track Inflow', 'Extend the maximum travel distance by 50 km.', { tornadoRange: 50 }],
      ['tornado-track-corridor', 'Inflow Corridor', 'Extend maximum travel distance by another 70 km.', { tornadoRange: 70 }],
      ['tornado-track-long', 'Long-Track Circulation', 'Raise the travel limit to 400 km and sustain the speed to reach it.', { tornadoRange: 100 }],
    ],
  }),
  ...upgradeTree('Movement', 'Lifetime', {
    Inflow: [
      ['tornado-life-feed', 'Sustained Updraft', 'Add 20 simulated minutes to the lifetime limit and conserve inflow.', { tornadoLifetime: 80, endurance: .40 }],
      ['tornado-life-balance', 'Steady Inflow', 'Add another 30 simulated minutes and preserve more inflow.', { tornadoLifetime: 120, endurance: .65 }],
      ['tornado-life-anchor', 'Anchored Mesocyclone', 'Raise the lifetime limit to four simulated hours and preserve inflow on long tracks.', { tornadoLifetime: 160, endurance: .97 }],
    ],
  }),
  ...upgradeTree('Movement', 'Track control', {
    Steering: [
      ['tornado-thermal', 'Vorticity Alignment', 'Reduce track wobble and increase forward speed by 15% of base speed.', { trackStability: .28, tornadoSpeed: .15 }],
      ['tornado-organize', 'Streamwise Inflow', 'Steady the track further and slow weakening.', { trackStability: .40, hazardBuffer: .12 }],
      ['tornado-course', 'Mesocyclone Track Control', 'Select a point on the map to set a preferred heading.', { courseControl: 1 }],
    ],
  }),
  ...upgradeTree('Damage', 'Wind and width', {
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
  ...upgradeTree('Damage', 'Rainfall and concealment', {
    'Heavy rainfall': [
      ['tornado-rain-core', 'High-Precipitation Core', 'Heavy rain leaves damaging runoff along the track.', { floodPower: .38 }],
      ['tornado-rain-swath', 'Sustained Downpour', 'Intensify runoff and extend flooding.', { floodPower: .28, floodLife: 16 }],
    ],
    'Rain concealment': [
      ['rain-wrapped', 'Precipitation Curtain', 'Rain hides the funnel from spotters and delays local warnings.', { warningDelay: 12, rainWrap: 1 }],
      ['tornado-rain-screen', 'Dense Rain Screen', 'Further reduce how quickly the funnel draws attention.', { rainWrap: .55 }],
    ],
  }, ['tornado-runoff', 'Rain-Wrapped Deluge', 'Intensify flooding and deepen the rain curtain around the funnel.', { floodPower: .34, floodLife: 24, rainWrap: .35 }]),
  ...upgradeTree('Damage', 'Debris and surface winds', {
    Debris: [
      ['tornado-debris', 'Debris Entrainment', 'Lift debris into the circulation to increase property damage.', { gust: .20 }],
      ['tornado-debris-load', 'High Debris Loading', 'Increase damage from large windborne fragments.', { gust: .30 }],
    ],
    'Near-ground winds': [
      ['tornado-low-jet', 'Near-Ground Jet', 'Increase wind damage to buildings.', { gust: .12 }],
      ['tornado-ground-jet', 'Ground-Level Surge', 'Concentrate damaging winds close to the ground.', { gust: .20 }],
    ],
  }, ['tornado-debris-barrage', 'Ballistic Debris Field', 'Dense debris increases damage and weakens shelter protection in severe winds.', { gust: .45, shelterBreach: .20 }]),
  ...upgradeTree('Damage', 'Hail', {
    Hail: [
      ['tornado-hail', 'Embryo Recirculation', 'Recycle small hailstones to damage roofs and cars.', { hail: .35, hailRadius: 2 }],
      ['tornado-hail-growth', 'Wet Growth Regime', 'Grow larger hailstones across a wider footprint.', { hail: .45, hailRadius: 2 }],
      ['tornado-hail-swath', 'Giant Hail Swath', 'Spread damaging hail farther around the vortex.', { hail: .65, hailRadius: 3 }],
    ],
  }),
  ...upgradeTree('Abilities', 'Temperature resistance', {
    'Heat resistance': [
      ['tornado-mixed-layer', 'Heat Resistance I', 'Reduce hot-air weakening by 25%.', { heatTolerance: .25 }],
      ['tornado-heat-flux', 'Heat Resistance II', 'Block another 25% of base hot-air weakening.', { heatTolerance: .25 }],
    ],
    'Cold resistance': [
      ['tornado-cold-pool', 'Cold Resistance I', 'Reduce cold-air weakening by 25%.', { coldTolerance: .25 }],
      ['tornado-baroclinic', 'Cold Resistance II', 'Block another 25% of base cold-air weakening.', { coldTolerance: .25 }],
    ],
  }, ['tornado-inflow-coupling', 'Temperature Resilience', 'Further resist hot and cold air and preserve the inflow reserve.', { coldTolerance: .22, heatTolerance: .22, endurance: .20 }]),
  ...upgradeTree('Abilities', 'Warning and response resistance', {
    'Warning delays': [
      ['tornado-response', 'Radar Interference I', 'Delay the first local alerts.', { warningDelay: 10 }],
      ['tornado-warning-gaps', 'Radar Interference II', 'Give local spotters and emergency managers less time to respond.', { warningDelay: 12 }],
    ],
    'Radio disruption': [
      ['tornado-grid', 'Radio Disruption I', 'Damaging winds can interrupt broadcasts and slow sheltering.', { outageTime: 45, broadcast: .25 }],
      ['tornado-repeater', 'Radio Disruption II', 'Keep radio repeaters offline longer and slow sheltering further.', { outageTime: 55, broadcast: .20 }],
    ],
  }, ['tornado-warning-overload', 'Response Overload', 'Delay local warnings and slow the move to shelter.', { warningDelay: 12, gridlock: 18 }]),
  ...upgradeTree('Abilities', 'Satellite tornadoes', {
    Satellites: [
      ['tornado-satellite-seed', 'Satellite Rotation', 'Occasionally shed a weaker tornado in a random direction.', { satelliteChance: .24 }],
      ['tornado-satellite-lobes', 'Unstable Rotation Lobes', 'Increase the chance of shedding a satellite tornado.', { satelliteChance: .20 }],
      ['tornado-satellite-shear', 'Outer Vortex Shear', 'Further increase the chance of shedding a satellite tornado.', { satelliteChance: .20 }],
      ['tornado-satellite-split', 'Vortex Split', 'Unlock a manual satellite tornado every 60 real seconds of active play.', { satelliteTrigger: 1 }],
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
      ['polar-lock', 'Polar Lock', 'Sustain the circulation longer as its support runs low.', { endurance: .24 }, 7],
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
      ['snow-lake', 'Lake Inflow', 'Absorb more moisture while crossing a lake.', { lakeMoisture: .25 }, 3],
      ['snow-lake-band', 'Long Lake Fetch', 'Increase lake moisture uptake further.', { lakeMoisture: .32 }, 5],
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
  ...upgradeTree('Formation', 'Wind and fuel moisture', {
    Wind: [
      ['spread', 'Fast Spread', 'Move the fire front 25% faster between zones.', { spread: .25 }],
      ['upslope', 'Upslope Run', 'Increase forward spread as winds carry flames into unburned fuels.', { spread: .18 }],
    ],
    Fuel: [
      ['rain-proof', 'Duff Insulation', 'Shield burning fuel from rain and slow weakening in wet conditions.', { hazardBuffer: .38 }, 4],
      ['dry-fuels', 'Dry Fuel Beds', 'Grow faster when fuels dry out.', { hazardGain: .055 }],
    ],
  }, ['deep-roots', 'Deep Fuel Reserve', 'Use available fuel more slowly and sustain burns behind the front.', { endurance: .23, persistence: 35 }]),
  ...upgradeTree('Impact', 'Spot fires and crown fire', {
    Embers: [
      ['embers', 'Long-Range Embers', 'Generate embers faster and strengthen spot fires.', { chargeGain: .22, burstPower: .22 }],
      ['ember-loft', 'Lofted Firebrands', 'Keep spot fires active longer after the main front moves away.', { burst: 17 }],
    ],
    'Crown fire': [
      ['crown', 'Crown Fire', 'Increase damage and reach a neighboring zone.', { hazardDamage: .24, fringe: 1, width: 7 }],
      ['smolder', 'Smoldering Fuels', 'Keep burned zones active for 55 more seconds.', { persistence: 55 }],
    ],
  }, ['ember-storm', 'Ember Storm', 'Strengthen spot fires and keep them active longer.', { burst: 15, burstPower: .35 }]),
  ...upgradeTree('Disruption', 'Evacuation and smoke', {
    Response: [
      ['evacuation', 'Delayed Evacuation', 'Delay evacuation orders in newly threatened areas.', { warningDelay: 15 }],
      ['smoke-roads', 'Smoke-Choked Roads', 'Slow travel to shelter as smoke reduces visibility.', { gridlock: 26 }],
      ['response', 'Overwhelmed Response', 'Increase exposure in districts where property damage has disrupted response.', { overload: .23 }],
    ],
  }),
]

const flooding = [
  ...upgradeTree('Formation', 'Runoff and retention', {
    Runoff: [
      ['favorable', 'Saturated Soil', 'Build flood strength faster when rain falls on saturated ground.', { hazardGain: .055 }],
      ['reserve', 'Tributary Inflow', 'Replenish runoff faster between overtopping events.', { chargeGain: .27 }],
    ],
    Retention: [
      ['persistence', 'Floodplain Storage', 'Lose less strength as local water begins to drain.', { hazardBuffer: .29 }],
      ['drainage', 'Slow Drainage', 'Keep standing water damaging for another 50 seconds behind the flood front.', { persistence: 50 }],
    ],
  }, ['hazard-endurance', 'Backwater Flooding', 'Preserve watershed support and keep low-lying districts flooded longer.', { endurance: .21, persistence: 25 }]),
  ...upgradeTree('Impact', 'Water depth and levees', {
    'Flood depth': [
      ['impact', 'Deeper Water', 'Increase the ongoing impact of floodwater.', { hazardDamage: .24 }],
      ['footprint', 'Floodplain Spill', 'Widen the flood and expose an adjacent zone.', { fringe: 1, width: 12 }],
    ],
    Levees: [
      ['mastery', 'Levee Overtopping', 'Increase the damage of overtopping events.', { burstPower: .30 }],
      ['bank-erosion', 'Bank Erosion', 'Keep overtopped areas under water longer.', { burst: 19 }],
    ],
  }, ['hazard-dominance', 'Breach Cascade', 'Increase overtopping damage and send floodwater into another neighboring zone.', { burstPower: .28, burst: 14, abilityReach: 1 }]),
  ...upgradeTree('Disruption', 'Warnings and washed-out roads', {
    Response: [
      ['response', 'Rapid Rise', 'Shorten the time between detection and impact by delaying local warnings.', { warningDelay: 14 }],
      ['grid', 'Washed-Out Roads', 'Increase the time residents need to reach shelter.', { gridlock: 30 }],
      ['flood-substations', 'Submerged Substations', 'Flood damage interrupts local power and slows sheltering.', { outageTime: 55, broadcast: .23, power: .11 }],
    ],
  }),
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

export const trees: Record<Storm, Upgrade[]> = {
  Tornado: tornadoUpgrades,
  Hurricane: hurricane,
  Blizzard: blizzard,
  Thunderstorm: convectionTree('Thunderstorm'),
  Derecho: convectionTree('Derecho'),
  Multicell: convectionTree('Multicell'),
  Pulse: convectionTree('Pulse'),
  Squall: convectionTree('Squall'),
  'Storm Cell': convectionTree('Storm Cell'),
  Supercell: convectionTree('Supercell'),
  Lightning: convectionTree('Lightning'),
  Wildfire: wildfire,
  Flooding: flooding,
  'Dust Storm': dustStorm,
  'Heat Dome': heatDome,
}
