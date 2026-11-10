import { movePoint, random, worldX, type MapPoint } from './convection'
import type { Effects } from './upgrades'

export type CycloneStage = { time: number; category: string; wind: number; reason: string; location: string }
export type Cyclone = {
  initial: number; turnLatitude: number; hemisphere: number; bias: number
  inlandKm: number; travelKm: number; ocean: boolean; stage: string; environment: string; peakWind: number; radarAngle: number
  history: CycloneStage[]
}

export const latitudeAt = (point: MapPoint) => 90 - point.y / 10
export const longitudeAt = (point: MapPoint) => worldX(point.x) / 10 - 180

export function startCyclone(point: MapPoint, seed: number, ocean: boolean): Cyclone {
  const lat = latitudeAt(point)
  const lon = longitudeAt(point)
  const hemisphere = lat < 0 ? -1 : 1
  const gulf = lat >= 16 && lat < 33 && lon >= -100 && lon < -81
  const bay = lat >= 7 && lat <= 23 && lon >= 78 && lon <= 99
  const eastAustralia = lat < 0 && lat > -27 && lon >= 145 && lon <= 155
  const mozambique = lat < 0 && lat > -30 && lon > 32 && lon < 44
  const bias = (random(seed ^ 0x1B5E461)() - .5) * .32
  const initial = gulf ? -1.70 : bay ? -1.77 : eastAustralia || mozambique ? -2.9 : -2.67
  const turnLatitude = gulf ? 30 : bay ? 26 : 30
  return { initial, turnLatitude, hemisphere, bias, inlandKm: 0, travelKm: 0, ocean, stage: '', environment: '', peakWind: 0, radarAngle: 0, history: [] }
}

export const radarSpin = (cyclone: Cyclone, wind: number) => -cyclone.hemisphere * wind * .095

export function cycloneFlow(cyclone: Cyclone, point: MapPoint) {
  const lat = Math.abs(latitudeAt(point))
  const recurve = Math.max(0, Math.min(1, (lat - cyclone.turnLatitude) / 17))
  return (cyclone.initial * (1 - recurve) - .48 * recurve + cyclone.bias) * cyclone.hemisphere
}

export function cycloneSpeed(point: MapPoint) {
  return 1.65 + Math.min(.75, Math.abs(latitudeAt(point)) / 52)
}

export function cycloneWeather(cyclone: Cyclone, point: MapPoint, effects: Effects, difficulty: number, strength: number) {
  const lat = Math.abs(latitudeAt(point))
  if (!cyclone.ocean) {
    const inland = Math.min(.10, cyclone.inlandKm / 12_000)
    return { name: cyclone.inlandKm >= 420 ? 'Deep inland · dry air and surface friction' : 'Over land · cut off from ocean heat',
      trend: -(.128 + inland + difficulty * .012) * (1 - effects.inlandBuffer) }
  }
  const buffer = 1 - Math.min(.44, effects.coldBuffer)
  if (lat < 5) return { name: 'Weak rotation near the equator', trend: -.14 * buffer }
  if (lat >= 34) return { name: 'Cold water and wind shear', trend: -(.16 + Math.min(.22, (lat - 34) * .014)) * buffer }
  if (lat >= 29) return { name: 'Cooler water and wind shear', trend: (-.042 - difficulty * .024) * buffer }
  const shear = Math.min(.78, Math.max(0, cyclone.travelKm - 850) / 1100)
  const potential = Math.min(100, 43 + effects.seaGain * 220)
  const approach = (potential - strength) * .012
  const growth = Math.min(.075 - difficulty * .012 + effects.seaGain, approach)
  return { name: shear > .27 ? 'Increasing wind shear over warm water' : 'Warm ocean water',
    trend: growth - shear * (1 - Math.min(.28, effects.coldBuffer)) }
}

// Points for the short map projection. The simulation uses the same flow and turning limit.
export function cycloneTrack(cyclone: Cyclone, point: MapPoint, heading: number, seconds: number) {
  const target = cycloneFlow(cyclone, point)
  const turn = Math.atan2(Math.sin(target - heading), Math.cos(target - heading))
  const nextHeading = heading + Math.max(-.006 * seconds, Math.min(.006 * seconds, turn))
  return { point: movePoint(point, nextHeading, cycloneSpeed(point) * seconds), heading: nextHeading }
}

