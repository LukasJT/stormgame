import type { Place } from './world'
import { headingToward, movePoint, type MapPoint } from './convection'
import type { Effects } from './upgrades'

export const blizzardPatterns = {
  'Alberta Clipper': { description: 'A fast prairie storm with a broad snow shield. Persistence upgrades can carry it through the Great Lakes to the Atlantic.', favorable: 'Cold prairie air', speed: 1.32, growth: .08, snow: -.06, width: 135, heading: 0.18, curve: 0.04 },
  "Nor'easter": { description: 'A broad coastal storm that climbs northeast toward Newfoundland.', favorable: 'Cold Atlantic moisture', speed: 1.22, growth: .14, snow: .13, width: 230, heading: -0.84, curve: 0.3 },
  'Lake-Effect Storm': { description: 'A narrow band that builds snowpack quickly.', favorable: 'Moist lake inflow', speed: .91, growth: .12, snow: .19, width: 42, heading: 0.08, curve: 0.03 },
  'Snow Squall': { description: 'A quick, narrow burst with short whiteouts.', favorable: 'Arctic front', speed: 1.2, growth: .11, snow: .12, width: 35, heading: 0.27, curve: 0.05 },
  'Colorado Low': { description: 'A broad snow shield that builds strength over the plains.', favorable: 'Moist upslope flow', speed: .94, growth: .15, snow: .09, width: 150, heading: -0.36, curve: 0.25 },
  'Sea-Effect Snow': { description: 'Cold air gathers moisture over the sea and fuels a narrow band.', favorable: 'Cold maritime inflow', speed: .96, growth: .12, snow: .14, width: 64, heading: 0.2, curve: 0.06 },
  'Mountain Snowstorm': { description: 'Slow-moving snowfall fed by air rising over terrain.', favorable: 'Mountain lift', speed: .8, growth: .13, snow: .12, width: 82, heading: 0.16, curve: 0.14 },
  'Frontal Snowstorm': { description: 'A steady band that follows a front.', favorable: 'Cold and moist', speed: 1, growth: .11, snow: 0, width: 108, heading: 0.1, curve: 0.14 },
  'Cold-Air Outbreak': { description: 'A marginal start. Warm surroundings limit snowfall.', favorable: 'Cold-air surge', speed: 1.05, growth: .07, snow: -.06, width: 58, heading: 0.35, curve: 0.09 },
} as const

export type BlizzardPattern = keyof typeof blizzardPatterns
export const clipperWidthMultiplier = 2.8
export const blizzardCourses = {
  'max-left': { label: 'Max left', name: 'Max left', degrees: -90 },
  'hard-left': { label: 'Hard left', name: 'Hard left', degrees: -60 },
  'far-left': { label: 'Far left', name: 'Curve farther left', degrees: -36 },
  left: { label: 'Curve left', name: 'Curve left', degrees: -18 },
  natural: { label: 'Natural', name: 'Natural track', degrees: 0 },
  right: { label: 'Curve right', name: 'Curve right', degrees: 18 },
  'far-right': { label: 'Far right', name: 'Curve farther right', degrees: 36 },
} as const
export type BlizzardCourse = keyof typeof blizzardCourses
export type BlizzardSteering = { course: BlizzardCourse; from: number; since: number }

export function blizzardCourseAvailable(course: BlizzardCourse, pattern: BlizzardPattern | null) {
  return pattern === "Nor'easter" || blizzardCourses[course].degrees >= -36
}

const atlanticTrack = [[31, -80], [35, -75.3], [38, -73.9], [40.5, -72.4], [42, -70], [44, -66], [47, -60], [48.7, -56.8], [54, -45]]
const clipperTrack = [[-123, 52.3], [-114, 51], [-108, 49.8], [-101, 48.3], [-95, 47.5], [-91, 47.45],
  [-87, 47.05], [-82, 45.3], [-77, 43.4], [-71, 41.5]]

function trackCoordinate(track: number[][], along: number) {
  const next = track.findIndex(([coordinate], index) => index > 0 && coordinate >= along)
  const end = next < 0 ? track.length - 1 : next
  const [start, from] = track[end - 1]
  const [finish, to] = track[end]
  return from + (to - from) * (along - start) / (finish - start)
}

export function blizzardOptions([, lat, lon]: Place): readonly BlizzardPattern[] {
  const west = ((lon + 180) % 360 + 360) % 360 - 180
  const inArea = (south: number, north: number, left: number, right: number) =>
    lat >= south && lat <= north && west >= left && west <= right

  if (inArea(46, 58, -123, -103)) return ['Alberta Clipper', 'Frontal Snowstorm']
  if (inArea(41, 49, -93, -74)) return ['Lake-Effect Storm', 'Snow Squall']
  if (inArea(35, 52, -76, -51) || (lat >= 31 && lat <= 52 && Math.abs(west - trackCoordinate(atlanticTrack, lat)) <= 3.5)) {
    return ["Nor'easter", 'Frontal Snowstorm']
  }
  if (inArea(34, 44, -110, -101)) return ['Colorado Low', 'Mountain Snowstorm']
  if (inArea(36, 47, 135, 148)) return ['Sea-Effect Snow', 'Frontal Snowstorm']
  if (inArea(57, 71, 4, 19) || inArea(45, 63, -138, -122)) return ['Mountain Snowstorm', 'Frontal Snowstorm']
  if (Math.abs(lat) < 29) return ['Cold-Air Outbreak']
  return ['Frontal Snowstorm', 'Snow Squall']
}


export function blizzardSteeringOffset({ course, from, since }: BlizzardSteering, time: number) {
  const target = blizzardCourses[course].degrees * Math.PI / 180
  return target + (from - target) * Math.exp(-Math.max(0, time - since) / 16)
}

export function blizzardHeading(point: MapPoint, pattern: BlizzardPattern, phase: number, time: number, stability: number) {
  const { heading, curve } = blizzardPatterns[pattern]
  const wobble = .10 * (1 - Math.min(1, stability)) * Math.sin(time / 180 + phase)
  if (pattern === "Nor'easter") {
    const ahead = 90 - point.y / 10 + 2
    return headingToward(point, { x: (trackCoordinate(atlanticTrack, ahead) + 180) * 10, y: (90 - ahead) * 10 }) + wobble
  }
  if (pattern === 'Alberta Clipper') {
    const ahead = point.x / 10 - 180 + 4
    return headingToward(point, { x: (ahead + 180) * 10, y: (90 - trackCoordinate(clipperTrack, ahead)) * 10 }) + wobble
  }
  return heading + curve * Math.min(1, time / 540) + wobble
}

export function blizzardTrack(point: MapPoint, pattern: BlizzardPattern, phase: number, time: number, seconds: number, effects: Effects, steering?: BlizzardSteering) {
  const headingAt = (at: number, position: MapPoint) => blizzardHeading(position, pattern, phase, at, effects.trackStability)
    + (steering ? blizzardSteeringOffset(steering, at) : 0)
  const next = movePoint(point, headingAt(time + seconds / 2, point), blizzardPatterns[pattern].speed * (1 + effects.spread) * seconds)
  return {
    point: next,
    heading: headingAt(time + seconds, next),
  }
}
