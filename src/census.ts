import canadianCentroids from './data/canada-census-centroids.json'
import countyCentroids from './data/us-county-centroids.json'
import divisions from './data/gta-census-divisions.json'
import { inside } from './geo-polygon'

const gta = Object.entries(divisions).flatMap(([id, polygons]) => polygons.map(([outer, ...holes]) => {
  const longitudes = outer.map(([longitude]) => longitude)
  const latitudes = outer.map(([, latitude]) => latitude)
  return {
    id, outer, holes,
    west: Math.min(...longitudes), east: Math.max(...longitudes),
    south: Math.min(...latitudes), north: Math.max(...latitudes),
  }
}))

export function gtaCensusDivision(latitude: number, longitude: number) {
  return gta.find(({ west, east, south, north, outer, holes }) =>
    longitude >= west && longitude <= east && latitude >= south && latitude <= north &&
    inside(longitude, latitude, outer) && !holes.some(hole => inside(longitude, latitude, hole)))?.id
}

type CensusRow = [name: string, latitude: number, longitude: number, population: number, area: number, density: number, housingDensity: number]

const centroids = {
  CA: canadianCentroids as CensusRow[],
  US: countyCentroids as CensusRow[],
}

const nearestCache = new Map<string, CensusRow | undefined>()

export function nearbyCensus(code: 'CA' | 'US', latitude: number, longitude: number) {
  // Cache the centroid approximation at roughly one-kilometer resolution.
  const lat = Math.round(latitude * 100) / 100
  const lon = Math.round(longitude * 100) / 100
  const key = `${code},${lat},${lon}`
  if (nearestCache.has(key)) return nearestCache.get(key)
  const scale = 111.2 * Math.cos(lat * Math.PI / 180)
  let nearest: CensusRow | undefined
  let distance = Infinity
  for (const row of centroids[code]) {
    const [, rowLat, rowLon, population, area, density] = row
    if (!population || !area || !density) continue
    const delta = Math.abs(lon - rowLon)
    const km = Math.hypot((lat - rowLat) * 111.2, Math.min(delta, 360 - delta) * scale)
    // Leave remote gaps to the regional or national estimate.
    if (km >= distance || km > Math.max(25, Math.sqrt(area * 2.59 / Math.PI) * 2)) continue
    nearest = row
    distance = km
  }
  if (nearestCache.size >= 16_384) nearestCache.clear()
  nearestCache.set(key, nearest)
  return nearest
}
