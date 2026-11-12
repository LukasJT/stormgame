import { locate } from './free-drop'
import type { Effects } from './upgrades'
import { efWind, windBand } from './impact'
import type { Swath } from './swath'

export type MapPoint = { x: number; y: number }

export type Funnel = {
  id: number; ef: number; peakEF: number; wind: number; width: number; peakWidth: number; start: number; life: number
  point: MapPoint; path: MapPoint[]; swath: Swath[]; heading: number; naturalHeading: number; preference: number | null
  speed: number; phase: number; groundKm: number; damage: number; reachedEF: number
}

export type ConvectiveTrack = {
  point: MapPoint; path: MapPoint[]; heading: number; preference: number | null; funnels: Funnel[]
  phase: number; naturalHeading: number
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max))
const turn = (from: number, to: number, rate: number) =>
  from + clamp(Math.atan2(Math.sin(to - from), Math.cos(to - from)), -rate, rate)
const rad = Math.PI / 180

export const worldX = (x: number) => ((x % 3600) + 3600) % 3600
export const kmPerX = (y: number) => 11.1 * Math.max(.15, Math.cos((90 - y / 10) * rad))

export function random(seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let n = Math.imul(seed ^ seed >>> 15, seed | 1)
    n ^= n + Math.imul(n ^ n >>> 7, n | 61)
    return ((n ^ n >>> 14) >>> 0) / 4294967296
  }
}

export function movePoint(point: MapPoint, bearing: number, km: number): MapPoint {
  return {
    x: point.x + Math.cos(bearing) * km / kmPerX(point.y),
    y: clamp(point.y + Math.sin(bearing) * km / 11.1, .01, 1799.99),
  }
}

function offset(from: MapPoint, to: MapPoint) {
  return {
    x: (to.x - from.x - Math.round((to.x - from.x) / 3600) * 3600) * kmPerX(from.y),
    y: (to.y - from.y) * 11.1,
  }
}

export function distanceKm(from: MapPoint, to: MapPoint) {
  const delta = offset(from, to)
  return Math.hypot(delta.x, delta.y)
}

export function headingToward(from: MapPoint, to: MapPoint) {
  const delta = offset(from, to)
  return Math.atan2(delta.y, delta.x)
}

export function directionName(heading: number) {
  const dirs = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']
  return dirs[((Math.round(heading / (Math.PI / 4)) % 8) + 8) % 8]
}

export function landAt(point: MapPoint) {
  return locate(90 - point.y / 10, point.x / 10 - 180)
}

const tornadoHeading = (roll: number) => -Math.PI / 4 + (roll - .5) * Math.PI / 4

export function makeConvectiveTrack(point: MapPoint, seed: number, tornado = false): ConvectiveTrack {
  const phase = random(seed)() * Math.PI * 2
  const naturalHeading = tornado ? tornadoHeading(phase / (Math.PI * 2)) : .28
  return { point, path: [point], heading: naturalHeading, naturalHeading, preference: null, funnels: [], phase }
}

export function advanceFront(front: ConvectiveTrack, speed: number, time: number, stability: number) {
  // Predominant east to southeast drift. The slower turn keeps the track continuous.
  const flow = front.naturalHeading + (1 - stability) * (Math.sin(time / 104 + front.phase) * .24 + Math.sin(time / 243 + front.phase) * .13)
  front.heading = turn(front.heading, front.preference ?? flow, .017)
  front.point = movePoint(front.point, front.heading, speed)
  if (time % 5 === 0) front.path.push(front.point)
}

export function dropRadius(widthKm: number) {
  return Math.max(20, widthKm * .66)
}

export function isActive(funnel: Funnel, time: number) {
  return time - funnel.start < funnel.life
}

export function createFunnel(front: ConvectiveTrack, seed: number, time: number, radius: number, effects: Effects,
  strength: number, lifetime: number, preferred?: MapPoint, maxEf = 5) {
  const id = front.funnels.length + 1
  const roll = random(seed ^ Math.imul(id, 0x9E3779B1) ^ Math.imul(time, 0x85EBCA6B))
  let point: MapPoint | undefined
  if (preferred) {
    if (!effects.precisionDrop || distanceKm(front.point, preferred) > radius || !landAt(preferred).code) return
    const delta = preferred.x - front.point.x
    point = { x: preferred.x - Math.round(delta / 3600) * 3600, y: preferred.y }
  } else {
    for (let i = 0; i < 28; i++) {
      const sample = movePoint(front.point, roll() * 2 * Math.PI, Math.sqrt(roll()) * radius)
      if (landAt(sample).code) {
        point = sample
        break
      }
    }
  }
  if (!point) return
  const severity = roll() + effects.tornadoIntensity + Math.max(0, strength - 55) * .00045 - Math.max(0, 36 - strength) * .007
  const rolled = [.41, .68, .85, .95, .997].filter(threshold => severity >= threshold).length
  const peakEF = Math.min(rolled, maxEf, strength < 30 ? (effects.tornadoIntensity ? 2 : 0) : 5)
  const peakWidth = Math.min(4.2, (.045 + roll() ** 1.9 * (.50 + peakEF * .22)) * (1 + effects.tornadoWidth))
  const life = Math.round((.48 + roll() * .92) * lifetime + effects.tornadoLife)
  const heading = tornadoHeading(roll())
  const funnel: Funnel = { id, ef: 0, peakEF, wind: 65, width: peakWidth * .22, peakWidth, start: time, life, point, path: [point], swath: [], heading, naturalHeading: heading, preference: null,
    speed: .22 + roll() * .41, phase: roll() * Math.PI * 2, groundKm: 0, damage: 0, reachedEF: 0 }
  front.funnels.push(funnel)
  return funnel
}

export function advanceFunnel(funnel: Funnel, time: number) {
  const age = time - funnel.start
  const wobble = Math.sin(age / 6 + funnel.phase) * .17 + Math.sin(age / 15 + funnel.phase) * .09
  const heading = funnel.preference === null ? funnel.naturalHeading + wobble : funnel.preference + wobble * .32
  funnel.heading = turn(funnel.heading, heading, .046)
  funnel.point = movePoint(funnel.point, funnel.heading, funnel.speed)
  const growth = clamp((age - 6) / (funnel.life * .58), 0, 1)
  funnel.wind = 65 + (efWind[funnel.peakEF] - 65) * growth
  funnel.ef = windBand(funnel.wind)
  funnel.width = funnel.peakWidth * (.22 + .78 * growth)
  if (age % 2 === 0 || !isActive(funnel, time)) funnel.path.push(funnel.point)
}
