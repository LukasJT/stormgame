import type { Place } from './world'

export const blizzardPatterns = {
  'Alberta Clipper': { description: 'A fast track with lighter snow and shorter whiteouts.', favorable: 'Cold prairie air', speed: 1.32, growth: .08, snow: -.06, width: -20, whiteout: -8 },
  "Nor'easter": { description: 'A broad coastal storm with longer whiteouts.', favorable: 'Cold Atlantic moisture', speed: .87, growth: .14, snow: .13, width: 65, whiteout: 14 },
  'Lake-Effect Storm': { description: 'A narrow band that builds snowpack quickly.', favorable: 'Moist lake inflow', speed: .91, growth: .12, snow: .19, width: -55, whiteout: 8 },
  'Snow Squall': { description: 'A quick, narrow burst with short whiteouts.', favorable: 'Arctic front', speed: 1.2, growth: .11, snow: .12, width: -75, whiteout: -14 },
  'Colorado Low': { description: 'A broad snow shield that builds strength over the plains.', favorable: 'Moist upslope flow', speed: .94, growth: .15, snow: .09, width: 45, whiteout: 8 },
  'Sea-Effect Snow': { description: 'Cold air gathers moisture over the sea and fuels a narrow band.', favorable: 'Cold maritime inflow', speed: .96, growth: .12, snow: .14, width: -35, whiteout: 6 },
  'Mountain Snowstorm': { description: 'Slow-moving snowfall fed by air rising over terrain.', favorable: 'Mountain lift', speed: .8, growth: .13, snow: .12, width: -10, whiteout: 10 },
  'Frontal Snowstorm': { description: 'A steady band that follows a front.', favorable: 'Cold and moist', speed: 1, growth: .11, snow: 0, width: 0, whiteout: 0 },
  'Cold-Air Outbreak': { description: 'A marginal start. Warm surroundings limit snowfall.', favorable: 'Cold-air surge', speed: 1.05, growth: .07, snow: -.06, width: -25, whiteout: -9 },
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
