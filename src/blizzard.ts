import type { Place } from './world'
import { movePoint, type MapPoint } from './convection'
import type { Effects } from './upgrades'

export const blizzardPatterns = {
  'Alberta Clipper': { description: 'A fast track with lighter snow and shorter whiteouts.', favorable: 'Cold prairie air', speed: 1.32, growth: .08, snow: -.06, width: 60, heading: 0.18, curve: 0.04 },
  "Nor'easter": { description: 'A broad coastal storm with longer whiteouts.', favorable: 'Cold Atlantic moisture', speed: .87, growth: .14, snow: .13, width: 230, heading: -0.84, curve: 0.3 },
  'Lake-Effect Storm': { description: 'A narrow band that builds snowpack quickly.', favorable: 'Moist lake inflow', speed: .91, growth: .12, snow: .19, width: 42, heading: 0.08, curve: 0.03 },
  'Snow Squall': { description: 'A quick, narrow burst with short whiteouts.', favorable: 'Arctic front', speed: 1.2, growth: .11, snow: .12, width: 35, heading: 0.27, curve: 0.05 },
  'Colorado Low': { description: 'A broad snow shield that builds strength over the plains.', favorable: 'Moist upslope flow', speed: .94, growth: .15, snow: .09, width: 150, heading: -0.36, curve: 0.25 },
  'Sea-Effect Snow': { description: 'Cold air gathers moisture over the sea and fuels a narrow band.', favorable: 'Cold maritime inflow', speed: .96, growth: .12, snow: .14, width: 64, heading: 0.2, curve: 0.06 },
  'Mountain Snowstorm': { description: 'Slow-moving snowfall fed by air rising over terrain.', favorable: 'Mountain lift', speed: .8, growth: .13, snow: .12, width: 82, heading: 0.16, curve: 0.14 },
  'Frontal Snowstorm': { description: 'A steady band that follows a front.', favorable: 'Cold and moist', speed: 1, growth: .11, snow: 0, width: 108, heading: 0.1, curve: 0.14 },
  'Cold-Air Outbreak': { description: 'A marginal start. Warm surroundings limit snowfall.', favorable: 'Cold-air surge', speed: 1.05, growth: .07, snow: -.06, width: 58, heading: 0.35, curve: 0.09 },
} as const

export type BlizzardPattern = keyof typeof blizzardPatterns

export function blizzardOptions([, lat, lon]: Place): readonly BlizzardPattern[] {
  const west = ((lon + 180) % 360 + 360) % 360 - 180
  const inArea = (south: number, north: number, left: number, right: number) =>
    lat >= south && lat <= north && west >= left && west <= right

  if (inArea(46, 58, -123, -103)) return ['Alberta Clipper', 'Frontal Snowstorm']
  if (inArea(41, 49, -93, -74)) return ['Lake-Effect Storm', 'Snow Squall']
  if (inArea(35, 52, -76, -51)) return ["Nor'easter", 'Frontal Snowstorm']
  if (inArea(34, 44, -110, -101)) return ['Colorado Low', 'Mountain Snowstorm']
  if (inArea(36, 47, 135, 148)) return ['Sea-Effect Snow', 'Frontal Snowstorm']
  if (inArea(57, 71, 4, 19) || inArea(45, 63, -138, -122)) return ['Mountain Snowstorm', 'Frontal Snowstorm']
  if (Math.abs(lat) < 29) return ['Cold-Air Outbreak']
  return ['Frontal Snowstorm', 'Snow Squall']
}


export function blizzardHeading(pattern: BlizzardPattern, phase: number, time: number, stability: number) {
  const { heading, curve } = blizzardPatterns[pattern]
  return heading + curve * Math.min(1, time / 540) + .10 * (1 - Math.min(1, stability)) * Math.sin(time / 180 + phase)
}

export function blizzardTrack(point: MapPoint, pattern: BlizzardPattern, phase: number, time: number, seconds: number, effects: Effects) {
  const heading = blizzardHeading(pattern, phase, time + seconds / 2, effects.trackStability)
  return {
    point: movePoint(point, heading, blizzardPatterns[pattern].speed * (1 + effects.spread) * seconds),
    heading: blizzardHeading(pattern, phase, time + seconds, effects.trackStability),
  }
}
