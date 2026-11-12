import regionIndex from './data/region-index.json'
import { inside } from './geo-polygon'

export type Region = { id: string; name: string; pop: number | null; polygons: number[][][][] }
const pending = new Map<string, Promise<Region[]>>()
type RegionExposure = { id: string; name: string; pop: number; d: number }
const localBoundaries = new Map<string, { name: string; exposure?: RegionExposure; west: number; east: number; north: number; south: number; polygon: number[][][] }[]>()
let scope: ReadonlySet<string> | undefined

export function withRegionScope<T>(countries: ReadonlySet<string> | undefined, action: () => T): T {
  const previous = scope
  scope = countries
  try { return action() } finally { scope = previous }
}

// The region files store longitude and latitude multiplied by ten in map coordinates.
function ringArea(ring: number[][]) {
  const radians = Math.PI / 180
  let sum = 0
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = ring[i]
    const [nextX, nextY] = ring[(i + 1) % ring.length]
    const delta = ((nextX - x + 5400) % 3600 - 1800) / 10 * radians
    sum += delta * (Math.cos(y / 10 * radians) + Math.cos(nextY / 10 * radians))
  }
  return Math.abs(sum) * 3958.76 ** 2 / 2
}

export function getRegions(code: string): Promise<Region[]> {
  if (!(code in regionIndex)) return Promise.resolve([])
  const cached = pending.get(code)
  if (cached) return cached
  const request = fetch(`${import.meta.env.BASE_URL}regions/${code}.json`).then(async response => {
    if (!response.ok) throw Error('Regional map data could not be loaded.')
    const regions: Region[] = await response.json()
    localBoundaries.set(code, regions.flatMap(({ id, name, pop, polygons }) => {
      const landArea = polygons.reduce((total, [outer, ...holes]) =>
        total + ringArea(outer) - holes.reduce((area, hole) => area + ringArea(hole), 0), 0)
      const exposure = pop && landArea > 0 ? { id, name, pop, d: pop / landArea } : undefined
      return polygons.map(polygon => {
        const xs = polygon[0].map(([x]) => x)
        const ys = polygon[0].map(([, y]) => y)
        return { name, exposure, polygon, west: Math.min(...xs), east: Math.max(...xs), north: Math.min(...ys), south: Math.max(...ys) }
      })
    }))
    return regions
  }).catch(error => {
    pending.delete(code)
    throw error
  })
  pending.set(code, request)
  return request
}

function boundaryAt(code: string, x: number, y: number) {
  if (scope && !scope.has(code)) return
  return localBoundaries.get(code)?.find(({ west, east, north, south, polygon: [outer, ...holes] }) =>
    x >= west && x <= east && y >= north && y <= south &&
    inside(x, y, outer) && !holes.some(hole => inside(x, y, hole)))
}

export function localRegionAt(code: string, x: number, y: number) {
  return boundaryAt(code, x, y)?.name
}

export function regionExposureAt(code: string, x: number, y: number) {
  return boundaryAt(code, x, y)?.exposure
}
