import { distanceKm, kmPerX, landAt, random, worldX, type MapPoint } from './convection'
import type { Effects } from './upgrades'
import history from './data/wildfire-history.json'

export const fireHistoryColors = ['#d8a468', '#ee8c40', '#ec6537', '#c83c3c'] as const
export const fireHistoryLabels = ['Rare', 'Occasional', 'Recurring', 'Frequent'] as const
const gridWidth = 1440
const gridHeight = 720
const historyGrid = new Uint8Array(gridWidth * gridHeight)
let index = 0
for (const byte of atob(history.grid)) {
  const packed = byte.charCodeAt(0)
  const next = index + (packed & 31) + 1
  historyGrid.fill(packed >> 5, index, next)
  index = next
}
const gridStep = 2.5

export function fireHistoryAt(point: MapPoint) {
  const row = Math.max(0, Math.min(gridHeight - 1, Math.floor(point.y / gridStep)))
  const column = Math.floor(worldX(point.x) / gridStep)
  return historyGrid[row * gridWidth + column] || 0
}

export function canIgnite(point: MapPoint) {
  return fireHistoryAt(point) > 0 && !!landAt(point).code
}

let historyLayer = ''
export function fireHistoryLayer() {
  if (historyLayer) return historyLayer
  const paths = fireHistoryColors.map(() => [] as string[])
  for (let row = 0; row < gridHeight; row++) {
    const offset = row * gridWidth
    for (let column = 0; column < gridWidth;) {
      const tier = historyGrid[offset + column]
      const start = column++
      while (column < gridWidth && historyGrid[offset + column] === tier) column++
      if (tier) paths[tier - 1].push(`M${start * gridStep} ${row * gridStep}h${(column - start) * gridStep}v${gridStep}H${start * gridStep}z`)
    }
  }
  historyLayer = `<g class="fire-history" role="img" aria-label="Historical wildfire frequency">${paths.map((path, index) =>
    `<path fill="${fireHistoryColors[index]}" d="${path.join('')}"/>`).join('')}</g>`
  return historyLayer
}

export const fireColors = {
  'Starting or cooling': '#f3c94d',
  Burning: '#f48031',
  'Intense fire': '#ec413b',
  Contained: '#45ac70',
  'Burned out': '#11141b',
}
type FireStatus = keyof typeof fireColors
type Hex = { q: number; r: number }
export type FireCell = Hex & {
  point: MapPoint; history: number; heat: number; fuel: number; line: number
  status: FireStatus; burned: number
}
export type Wildfire = {
  origin: MapPoint; seed: number; wind: number; cells: Map<string, FireCell>; pressure: Map<string, Hex & { amount: number }>
  responseAt: number | null; aircraft: boolean; spotfires: number; areaKm2: number; active: number; containment: number
}

const hexRadius = 2.5
const cellArea = Math.sqrt(3) * 1.5 * hexRadius ** 2
const neighbors = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]] as const
const key = (q: number, r: number) => `${q},${r}`
const bound = (value: number) => Math.max(0, Math.min(1, value))

function hexPoint(fire: Wildfire, { q, r }: Hex) {
  return {
    x: fire.origin.x + Math.sqrt(3) * hexRadius * (q + r / 2) / kmPerX(fire.origin.y),
    y: fire.origin.y + 1.5 * hexRadius * r / 11.1,
  }
}

function ignite(fire: Wildfire, q: number, r: number, heat: number) {
  const id = key(q, r)
  if (fire.cells.has(id)) return false
  const point = hexPoint(fire, { q, r })
  if (!canIgnite(point)) return false
  const history = fireHistoryAt(point)
  fire.cells.set(id, { q, r, point, history, heat, fuel: .61 + history * .09, line: 0, status: 'Starting or cooling', burned: 0 })
  fire.active++
  return true
}

export function startWildfire(origin: MapPoint, seed: number): Wildfire {
  const fire: Wildfire = { origin, seed, wind: Math.floor(random(seed ^ 0x4ce73d)() * 6), cells: new Map(), pressure: new Map(),
    responseAt: null, aircraft: false, spotfires: 0, areaKm2: 0, active: 0, containment: 0 }
  ignite(fire, 0, 0, .18 + fireHistoryAt(origin) * .06)
  return fire
}

const live = (cell: FireCell) => cell.status !== 'Contained' && cell.status !== 'Burned out'

function hotCells(fire: Wildfire) {
  return [...fire.cells.values()].filter(cell => live(cell) && cell.heat >= .25).sort((a, b) => b.heat - a.heat)
}

export function emberTargets(fire: Wildfire, effects: Effects) {
  const targets = new Map<string, Hex & { point: MapPoint }>()
  const reach = 2 + Math.floor(effects.fireSpot)
  for (const cell of hotCells(fire).slice(0, 12)) {
    for (const direction of [fire.wind, (fire.wind + 1) % 6, (fire.wind + 5) % 6]) {
      const [dq, dr] = neighbors[direction]
      for (let distance = reach; distance >= 2; distance--) {
        const q = cell.q + dq * distance
        const r = cell.r + dr * distance
        const id = key(q, r)
        if (fire.cells.has(id) || targets.has(id)) continue
        const point = hexPoint(fire, { q, r })
        if (canIgnite(point)) targets.set(id, { q, r, point })
        if (targets.size >= 48) return [...targets.values()]
      }
    }
  }
  return [...targets.values()]
}

export function spotFire(fire: Wildfire, effects: Effects, time: number, target?: MapPoint) {
  if (target) {
    if (effects.fireSpot < 2) return false
    const nearest = emberTargets(fire, effects).sort((a, b) => distanceKm(a.point, target) - distanceKm(b.point, target))[0]
    if (!nearest || distanceKm(nearest.point, target) > hexRadius ||
      !ignite(fire, nearest.q, nearest.r, .22 + effects.burstPower * .22)) return false
    fire.spotfires++
    return true
  }
  const source = hotCells(fire)
  const reach = 2 + Math.floor(effects.fireSpot)
  const roll = random(fire.seed ^ Math.imul(time + 1, 18329))
  const directions = [fire.wind, (fire.wind + (roll() < .5 ? 1 : 5)) % 6]
  for (const cell of source) for (const direction of directions) {
    const [dq, dr] = neighbors[direction]
    for (let distance = reach; distance >= 2; distance--) {
      if (ignite(fire, cell.q + dq * distance, cell.r + dr * distance, .22 + effects.burstPower * .22)) {
        fire.spotfires++
        return true
      }
    }
  }
  return false
}

export function advanceWildfire(fire: Wildfire, effects: Effects, time: number, resistance: number) {
  const roll = random(fire.seed ^ Math.imul(Math.floor(time / 80), 13337))
  const dry = Math.max(.25, .76 + roll() * .36 - Math.max(0, time - 820) / 520)
  const active = [...fire.cells.values()].filter(live)
  const age = fire.responseAt === null ? 0 : time - fire.responseAt
  const airPass = fire.aircraft && time % 24 === 0
  const aircraftTarget = airPass ? active.reduce<FireCell | undefined>((peak, cell) => !peak || cell.heat > peak.heat ? cell : peak, undefined) : undefined
  for (const [id, edge] of fire.pressure) {
    edge.amount *= .88
    if (edge.amount < .045) fire.pressure.delete(id)
  }
  for (const cell of active) {
    const heatGain = (.023 + cell.history * .010 + effects.hazardGain) * dry
    const burn = Math.min(cell.fuel, (.008 + cell.heat * .036) / (1 + effects.endurance))
    cell.fuel -= burn
    cell.burned += burn
    fire.areaKm2 += burn * cellArea / (.61 + cell.history * .09)
    if (fire.responseAt !== null) {
      const crews = Math.min(.05, .007 + age * .00011) * resistance
      const perimeterLoad = Math.max(1, active.length ** .28)
      cell.line = bound(cell.line + crews / perimeterLoad * Math.max(.22, 1 - effects.fireLine - cell.heat * .48)
        + (cell === aircraftTarget ? .085 * Math.max(.22, 1 - effects.fireAir) : 0))
    }
    cell.heat = bound(cell.heat + heatGain - Math.max(0, 1 - dry) * .09 * (1 - effects.hazardBuffer) - cell.line * .17 - Math.max(0, .30 - cell.fuel) * .46)
    cell.status = cell.fuel < .035 ? 'Burned out'
      : (cell.line >= .60 && cell.heat < .15) || (cell.line >= .22 && cell.heat < .04) ? 'Contained'
      : cell.heat <= .005 ? 'Burned out'
      : cell.heat >= .73 ? 'Intense fire' : cell.heat >= .34 ? 'Burning' : 'Starting or cooling'
    if (!live(cell) || cell.heat < .30) continue
    for (const [direction, [dq, dr]] of neighbors.entries()) {
      const q = cell.q + dq
      const r = cell.r + dr
      const id = key(q, r)
      if (fire.cells.has(id)) continue
      const downwind = Math.cos((direction - fire.wind) * Math.PI / 3)
      const edge = fire.pressure.get(id) ?? { q, r, amount: 0 }
      edge.amount += cell.heat * (1 - cell.line) * (.24 + downwind * .13) * dry * (1 + effects.spread)
      fire.pressure.set(id, edge)
    }
  }
  const available = [...fire.pressure.entries()].filter(([, edge]) => edge.amount >= .78)
    .sort(([, a], [, b]) => b.amount - a.amount)
  let starts = 0
  for (const [id, edge] of available) {
    fire.pressure.delete(id)
    if (ignite(fire, edge.q, edge.r, .21)) starts++
    if (starts >= 3 + Math.floor(effects.fringe)) break
  }
  if (effects.fireSpot && time % 36 === 0 && active.some(cell => cell.heat >= .73)) spotFire(fire, effects, time)
  const cells = [...fire.cells.values()]
  const remaining = cells.filter(live)
  fire.active = remaining.length
  fire.containment = cells.length ? cells.reduce((total, cell) => total + (cell.status === 'Contained' ? 1 : cell.line), 0) / cells.length : 0
  return remaining
}

export function drawWildfire(fire: Wildfire | null, world: boolean) {
  if (!fire) return ''
  const layers = new Map<FireStatus, string[]>()
  const dx = hexRadius / kmPerX(fire.origin.y)
  const dy = hexRadius / 11.1
  for (const cell of fire.cells.values()) {
    const x = world ? worldX(cell.point.x) : cell.point.x
    const path = Array.from({ length: 6 }, (_, index) => {
      const angle = (index * 60 + 30) * Math.PI / 180
      return `${index ? 'L' : 'M'}${(x + dx * Math.cos(angle)).toFixed(3)} ${(cell.point.y + dy * Math.sin(angle)).toFixed(3)}`
    }).join('') + 'Z'
    if (!layers.has(cell.status)) layers.set(cell.status, [])
    layers.get(cell.status)!.push(path)
  }
  return `<g class="fire-perimeter" role="img" aria-label="Wildfire perimeter">${[...layers].map(([status, paths]) =>
    `<path fill="${fireColors[status]}" data-fire-state="${status}" d="${paths.join('')}" vector-effect="non-scaling-stroke"/>`).join('')}</g>`
}
