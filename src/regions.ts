import regionIndex from './data/region-index.json'
import { inside } from './geo-polygon'

export type Region = { id: string; name: string; pop: number | null; polygons: number[][][][] }
const pending = new Map<string, Promise<Region[]>>()
const localBoundaries = new Map<string, { name: string; west: number; east: number; north: number; south: number; polygon: number[][][] }[]>()

export function getRegions(code: string): Promise<Region[]> {
  if (!(code in regionIndex)) return Promise.resolve([])
  const cached = pending.get(code)
  if (cached) return cached
  const request = fetch(`${import.meta.env.BASE_URL}regions/${code}.json`).then(async response => {
    if (!response.ok) throw Error('Regional map data could not be loaded.')
    const regions: Region[] = await response.json()
    if (code === 'CA' || code === 'US') localBoundaries.set(code, regions.flatMap(({ name, polygons }) =>
      polygons.map(polygon => {
        const xs = polygon[0].map(([x]) => x)
        const ys = polygon[0].map(([, y]) => y)
        return { name, polygon, west: Math.min(...xs), east: Math.max(...xs), north: Math.min(...ys), south: Math.max(...ys) }
      })))
    return regions
  }).catch(error => {
    pending.delete(code)
    throw error
  })
  pending.set(code, request)
  return request
}

export function localRegionAt(code: string, x: number, y: number) {
  return localBoundaries.get(code)?.find(({ west, east, north, south, polygon: [outer, ...holes] }) =>
    x >= west && x <= east && y >= north && y <= south &&
    inside(x, y, outer) && !holes.some(hole => inside(x, y, hole)))?.name
}
