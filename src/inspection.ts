import boundaries from './data/country-boundaries.json'
import population from './data/tornado-population.json'
import { locate } from './free-drop'
import { inside } from './geo-polygon'
import type { Region } from './regions'
import { impactAreas, type Run } from './sim'
import { project } from './world'

export type Inspection = { code: string; regionId: string | null; regions: Region[] | null; error: boolean }
const national = new Map(population.WORLD_COUNTRIES.map(row => [row.iso, row.pop]))
national.set('US', 331449281)
national.set('CA', 36991981)

export const countries = boundaries
  .filter(country => /^[A-Z]{2}$/.test(country.code))
  .sort((a, b) => a.name.localeCompare(b.name))

const outlineCache = new WeakMap<Inspection, { regions: Region[] | null; regionId: string | null; html: string }>()

export const countryAt = (x: number, y: number) => locate(90 - y / 10, x / 10 - 180).code

export function inspectedTotals(selection: Inspection, run: Run | null) {
  const country = countries.find(item => item.code === selection.code)
  const region = selection.regions?.find(item => item.id === selection.regionId)
  let deaths = 0
  let injured = 0
  if (run) {
    for (const { zone, site, country } of impactAreas(run)) {
      if ((country ?? countryAt(zone.x, zone.y)) !== selection.code) continue
      if (region && !region.polygons.some(([outer, ...holes]) =>
        inside(zone.x, zone.y, outer) && !holes.some(hole => inside(zone.x, zone.y, hole)))) continue
      deaths += site.deaths
      injured += site.injured
    }
  }
  return { name: region?.name ?? country?.name ?? selection.code, population: region ? region.pop : national.get(selection.code) ?? country?.pop, deaths, injured }
}

function outlines(polygons: number[][][][], projected: boolean) {
  return polygons.flatMap(polygon => polygon.map(ring => {
    const line = ring.map(([lon, lat], i) => {
      const { x, y } = projected ? { x: lon, y: lat } : project(lat, lon)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    }).join('')
    return line + 'Z'
  })).join('')
}

export function drawInspection(selection: Inspection) {
  const previous = outlineCache.get(selection)
  if (previous && previous.regions === selection.regions && previous.regionId === selection.regionId) return previous.html
  const country = countries.find(item => item.code === selection.code)
  if (!country) return ''
  const html = `<g class="inspection-shapes" fill-rule="evenodd">
    <path class="country-outline" d="${outlines(country.polygons, false)}" vector-effect="non-scaling-stroke"/>
    ${selection.regions?.map(region => `<path class="admin-outline ${region.id === selection.regionId ? 'active' : ''}" d="${outlines(region.polygons, true)}" data-region="${region.id}" vector-effect="non-scaling-stroke"><title>${region.name}</title></path>`).join('') ?? ''}
  </g>`
  outlineCache.set(selection, { regions: selection.regions, regionId: selection.regionId, html })
  return html
}
