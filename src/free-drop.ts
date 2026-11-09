import boundaries from './data/country-boundaries.json'
import lakes from './data/major-lakes.json'
import nyc from './data/nyc-shoreline.json'
import { type Place, type Storm, type Theater } from './world'
import { escapeName, loadCities, nearbyCity } from './cities'
import { getRegions, localRegionAt } from './regions'
import { inside } from './geo-polygon'

const radians = Math.PI / 180

function bounded(rings: number[][][]) {
  const xs = rings[0].map(point => point[0])
  const ys = rings[0].map(point => point[1])
  return { rings, west: Math.min(...xs), east: Math.max(...xs), south: Math.min(...ys), north: Math.max(...ys) }
}

function contains(lon: number, lat: number, { west, east, south, north, rings }: ReturnType<typeof bounded>) {
  return lon >= west && lon <= east && lat >= south && lat <= north &&
    inside(lon, lat, rings[0]) && !rings.slice(1).some(ring => inside(lon, lat, ring))
}

const polygons = boundaries.flatMap(({ name, code, polygons }) => polygons.map(rings => ({ name, code, ...bounded(rings) })))
const nycLand = nyc.land.map(bounded)
const nycExtent = nyc.extent.map(bounded)
const njLand = nyc.njLand.map(bounded)
const localCoast = [...nycExtent, ...njLand]
const harborBounds = {
  west: Math.min(...localCoast.map(polygon => polygon.west)),
  east: Math.max(...localCoast.map(polygon => polygon.east)),
  south: Math.min(...localCoast.map(polygon => polygon.south)),
  north: Math.max(...localCoast.map(polygon => polygon.north)),
}

const wrap = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180
const lakePolygons = lakes.map(({ name, rings }) => ({ name, ...bounded(rings) }))

export function lakeAt(lat: number, longitude: number) {
  const lon = wrap(longitude)
  return lakePolygons.find(polygon => contains(lon, lat, polygon))?.name
}

export async function loadLocalities() {
  await Promise.allSettled([loadCities(), getRegions('CA'), getRegions('US')])
}

export async function loadImpactRegions(theater: Theater, origin: 0 | 1) {
  const [, lat, longitude] = theater.places[origin]
  const lon = wrap(longitude)
  // Load nearby countries before impact. Explicit route locations are included for fixed tracks.
  const reach = theater.storm === 'Tornado' ? 470 : theater.storm === 'Hurricane' ? 1800 : 900
  const latitudeReach = reach / 111
  const longitudeReach = Math.min(180, latitudeReach / Math.max(.01, Math.cos(Math.min(89.9, Math.abs(lat) + latitudeReach) * radians)))
  const codes = new Set(theater.places.flatMap(([, , , code]) => code ? [code] : []))
  for (const boundary of polygons) {
    if (!boundary.code || boundary.north < lat - latitudeReach || boundary.south > lat + latitudeReach) continue
    if ([lon, lon + 360, lon - 360].some(center =>
      boundary.east >= center - longitudeReach && boundary.west <= center + longitudeReach)) codes.add(boundary.code)
  }
  await Promise.allSettled([...codes].map(getRegions))
}

export function locate(lat: number, longitude: number) {
  const lon = wrap(longitude)
  if (lon >= harborBounds.west && lon <= harborBounds.east && lat >= harborBounds.south && lat <= harborBounds.north) {
    if (nycLand.some(polygon => contains(lon, lat, polygon))) return { name: 'United States', code: 'US' }
    // The water-inclusive boundary limits where the local shoreline overrides the world map.
    if (nycExtent.some(polygon => contains(lon, lat, polygon))) return { name: 'Open water', code: undefined }
    if (njLand.some(polygon => contains(lon, lat, polygon))) return { name: 'United States', code: 'US' }
  }
  const lake = lakeAt(lat, longitude)
  if (lake) return { name: lake, code: undefined }
  const country = polygons.find(polygon => contains(lon, lat, polygon))
  if (country) return { name: country.name, code: country.code || 'land' }
  if (lat === -90) return { name: 'Antarctica', code: 'AQ' }
  return { name: 'Open water', code: undefined }
}

function step(lat: number, lon: number, distance: number, bearing: number) {
  if (Math.abs(lat) === 90) {
    return { lat: Math.sign(lat) * (90 - distance), lon: lon + wrap(lat > 0 ? 180 - bearing : bearing) }
  }
  const origin = lat * radians
  const delta = distance * radians
  const angle = bearing * radians
  // Keep the longitude in the origin's world copy so tracks cross the dateline continuously.
  const endLat = Math.asin(Math.sin(origin) * Math.cos(delta) + Math.cos(origin) * Math.sin(delta) * Math.cos(angle))
  const endLon = lon + Math.atan2(Math.sin(angle) * Math.sin(delta) * Math.cos(origin), Math.cos(delta) - Math.sin(origin) * Math.sin(endLat)) / radians
  return { lat: endLat / radians, lon: endLon }
}

export function coordinates(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(2)}°${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon).toFixed(2)}°${lon < 0 ? 'W' : 'E'}`
}

export function localityAt(lat: number, longitude: number, country = locate(lat, longitude)): { name: string; code?: string; reference: string; city?: string; cityName?: string } {
  if (!country.code) return { ...country, reference: country.name === 'Open water' ? 'over open water' : `over ${escapeName(country.name)}` }
  const lon = wrap(longitude)
  const region = localRegionAt(country.code, (lon + 180) * 10, (90 - lat) * 10)
  const city = nearbyCity(lat, lon, country.code, region)
  if (city) {
    const label = escapeName(`${city.name}, ${region ?? city.region ?? country.name}`)
    const near = city.distance >= 10
    return { ...country, city: label, cityName: escapeName(city.name), name: near ? `Near ${label}` : label, reference: `${near ? 'near' : 'in'} ${label}` }
  }
  const label = escapeName(region ?? country.name)
  const point = coordinates(lat, lon)
  return { ...country, name: `${label} · ${point}`, reference: `in ${label} (${point})` }
}

export function makeHurricaneDrop(lat: number, lon: number): Theater {
  return makeDrop('Hurricane', lat, lon)
}

export function makeDrop(storm: Storm, lat: number, lon: number): Theater {
  const origin = localityAt(lat, lon)
  const distances = storm === 'Wildfire' || storm === 'Tornado' ? [.14, .32, .7] : [.65, 1.7, 3.5]
  const bearings = [0, 1, 2, 3, 4, 5, 6, 7]
  const candidates = (storm === 'Hurricane' ? [1.7, 3.5, 5.2] : distances).flatMap(distance => bearings.map(index => {
    const point = step(lat, lon, distance, index * 45)
    return { ...point, ...locate(point.lat, point.lon), bearing: index }
  }))
  const first = candidates.find(candidate => storm === 'Hurricane' ? !!candidate.code !== !!origin.code : !!candidate.code) ?? candidates[2]
  const nearby = candidates.slice(0, 8).filter(candidate => candidate.bearing !== first.bearing)
  const others = storm === 'Hurricane' ? nearby : [...nearby.filter(candidate => candidate.code), ...nearby.filter(candidate => !candidate.code)]
  const route = [others[1], first, others[3], others[5]].map(point => ({ ...point, ...localityAt(point.lat, point.lon, point) }))
  const toPlace = (point: typeof route[number]): Place => {
    const duplicate = route.some(other => other !== point && other.name === point.name)
    return [duplicate ? `${point.name} · ${coordinates(point.lat, wrap(point.lon))}` : point.name, point.lat, point.lon, point.code]
  }
  return {
    id: `drop-${storm}-${lat}-${lon}`, name: `Custom ${storm.toLowerCase()}`, storm, custom: true,
    places: [
      [origin.name, lat, lon, origin.code],
      toPlace(route[0]), toPlace(route[1]), toPlace(route[2]), toPlace(route[3]),
    ],
  }
}
