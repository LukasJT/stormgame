type Ability = {
  name: string; resource: string; cost: number; seconds: number; damage: number
  reach?: number; tornado?: true
}

type Hazard = {
  color: string; description: string; group: 'storm' | 'ground'
  icon: 'bolt' | 'wind' | 'rain' | 'fire' | 'heat'
  weather: [favorable: string, mixed: string, adverse: string]
  width: number; wind: number; speed: number; growth: number; recharge: number
  passive: number; fringe?: number; trail?: number; warning?: string
  ability: Ability
}

const convective: Hazard['weather'] = ['Unstable air', 'Mixed inflow', 'Stable air']
const tornadoDrop: Ability = { name: 'Drop tornado', resource: 'rotation', cost: 22, seconds: 44, damage: .0048, tornado: true }

export const hazards = {
  Thunderstorm: {
    color: '#b7a5ff', icon: 'bolt', group: 'storm', description: 'Build a developing cell into a supercell, squall line, or multicell cluster and drop tornadoes along its track.',
    weather: convective, width: 70, wind: 115, speed: 1, growth: .12, recharge: .9, passive: .0015,
    ability: tornadoDrop,
  },
  Derecho: {
    color: '#c7dd81', icon: 'wind', group: 'storm', description: 'Sweep a broad, fast-moving front of straight-line wind.',
    weather: convective, width: 300, wind: 140, speed: 1.35, growth: .095, recharge: .45, passive: .0022, fringe: 2,
    ability: { name: 'Drive wind front', resource: 'outflow', cost: 32, seconds: 26, damage: .0044, reach: 2 },
  },
  Multicell: {
    color: '#99c0ff', icon: 'rain', group: 'storm', description: 'Build new cells beside the parent storm and keep both active.',
    weather: convective, width: 125, wind: 95, speed: .95, growth: .15, recharge: .55, passive: .0013, fringe: 1,
    ability: { name: 'Seed new cells', resource: 'inflow', cost: 28, seconds: 42, damage: .003, reach: 2 },
  },
  Pulse: {
    color: '#f3b8f2', icon: 'bolt', group: 'storm', description: 'Release brief, intense downbursts from an isolated storm.',
    weather: convective, width: 38, wind: 105, speed: 1.05, growth: .16, recharge: .8, passive: .0004,
    ability: { name: 'Release downburst', resource: 'updraft', cost: 24, seconds: 10, damage: .009 },
  },
  Squall: {
    color: '#8be4d6', icon: 'wind', group: 'storm', description: 'Push a narrow line of damaging wind and rain ahead of you.',
    weather: convective, width: 160, wind: 108, speed: 1.18, growth: .115, recharge: .5, passive: .0017, fringe: 1,
    ability: { name: 'Push squall line', resource: 'outflow', cost: 27, seconds: 27, damage: .0046, reach: 1 },
  },
  'Storm Cell': {
    color: '#91d5ff', icon: 'rain', group: 'storm', description: 'Concentrate heavy rain and hail in a single cell.',
    weather: convective, width: 30, wind: 82, speed: .88, growth: .15, recharge: .6, passive: .0013,
    ability: { name: 'Unload hail', resource: 'updraft', cost: 24, seconds: 22, damage: .0043 },
  },
  Supercell: {
    color: '#f49bbc', icon: 'bolt', group: 'storm', description: 'Sustain a rotating updraft and spawn longer-lived tornadoes.',
    weather: ['Strong wind shear', 'Mixed inflow', 'Weak wind shear'], width: 85, wind: 125, speed: .92, growth: .15, recharge: .78, passive: .0019,
    ability: { ...tornadoDrop, cost: 26, seconds: 56, damage: .006 },
  },
  Lightning: {
    color: '#f9e47e', icon: 'bolt', group: 'storm', description: 'Build electrical charge and discharge a concentrated strike barrage.',
    weather: ['Strong charge separation', 'Scattered convection', 'Weak updrafts'], width: 45, wind: 75, speed: 1.1, growth: .13, recharge: 1, passive: .00015,
    ability: { name: 'Discharge lightning', resource: 'charge', cost: 20, seconds: 4, damage: .022 },
  },
  Wildfire: {
    color: '#ff9a60', icon: 'fire', group: 'ground', description: 'Ignite a fire, drive its spread, and keep earlier burn zones active.',
    weather: ['Dry fuels and wind', 'Mixed fuel moisture', 'Rain and wet fuels'], width: 18, wind: 60, speed: .8, growth: .15, recharge: .55, passive: .003, trail: 70, warning: 'evacuation order',
    ability: { name: 'Send embers', resource: 'embers', cost: 25, seconds: 40, damage: .0033, reach: 2 },
  },
  Flooding: {
    color: '#63d8ff', icon: 'rain', group: 'ground', description: 'Build runoff, overtop downstream banks, and leave standing water.',
    weather: ['Saturated ground', 'Steady runoff', 'Draining ground'], width: 38, wind: 65, speed: .85, growth: .14, recharge: .65, passive: .0023, trail: 62, warning: 'flood warning',
    ability: { name: 'Overtop banks', resource: 'runoff', cost: 27, seconds: 43, damage: .0047, reach: 1 },
  },
  'Dust Storm': {
    color: '#eec388', icon: 'wind', group: 'ground', description: 'Pick up dust and send a low-visibility wall into nearby areas.',
    weather: ['Dry, loose soil', 'Patchy dust', 'Damp ground'], width: 170, wind: 100, speed: 1.15, growth: .13, recharge: .65, passive: .0013, fringe: 1,
    ability: { name: 'Send dust wall', resource: 'dust load', cost: 25, seconds: 30, damage: .0038, reach: 2 },
  },
  'Heat Dome': {
    color: '#ffaf77', icon: 'heat', group: 'ground', description: 'Trap heat for longer and keep nearby regions hot into the night.',
    weather: ['Stagnant high pressure', 'Limited overnight cooling', 'Cool front'], width: 420, wind: 25, speed: .62, growth: .15, recharge: .4, passive: .0019, fringe: 2, warning: 'heat alert',
    ability: { name: 'Trap overnight heat', resource: 'heat reserve', cost: 30, seconds: 75, damage: .0028, reach: 2 },
  },
} as const satisfies Record<string, Hazard>

export type NewHazard = keyof typeof hazards
export const hazardNames = Object.keys(hazards) as NewHazard[]

export type ThunderstormType = {
  [Name in NewHazard]: typeof hazards[Name]['group'] extends 'storm' ? Name : never
}[NewHazard]

export const thunderstormTypes = hazardNames.filter((name): name is ThunderstormType => hazards[name].group === 'storm')

export function hazardFor(name: string): Hazard | undefined {
  return Object.hasOwn(hazards, name) ? hazards[name as NewHazard] : undefined
}
