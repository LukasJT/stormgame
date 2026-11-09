type City = { name: string; x: number; y: number; population: number; region?: string | null }
let cities: City[] = []
let loading: Promise<void> | undefined
const byCountry = new Map<string, City[]>()

export function loadCities() {
  return loading ??= import('./data/cities.json').then(({ default: data }) => {
    cities = (data as [name: string, lon: number, lat: number, population: number, code: string | null, region?: string | null][])
      .map(([name, lon, lat, population, code, region]) => {
        const city = { name, x: (lon + 180) * 10, y: (90 - lat) * 10, population, region }
        if (code) {
          const entries = byCountry.get(code) ?? []
          entries.push(city)
          byCountry.set(code, entries)
        }
        return city
      })
  }).catch(() => {
    // The map remains usable if labels could not load.
    loading = undefined
  })
}

export const escapeName = (name: string) => name.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const plain = (name: string) => name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function nearbyCity(lat: number, lon: number, code: string, region?: string) {
  const x = (lon + 180) * 10
  const y = (90 - lat) * 10
  const scale = 11.12 * Math.cos(lat * Math.PI / 180)
  const regionKey = region && plain(region)
  let nearest: City | undefined
  let distance = 55
  for (const city of byCountry.get(code) ?? []) {
    if ((regionKey && (!city.region || plain(city.region) !== regionKey)) || Math.abs(city.y - y) * 11.12 > distance) continue
    const dx = city.x - x
    const km = Math.hypot((dx - Math.round(dx / 3600) * 3600) * scale, (city.y - y) * 11.12)
    if (km < distance) {
      nearest = city
      distance = km
    }
  }
  return nearest ? { ...nearest, distance } : undefined
}

export function affectedCities(x: number, y: number, code: string, radiusKm: number) {
  const scale = 11.12 * Math.cos((90 - y / 10) * Math.PI / 180)
  return (byCountry.get(code) ?? []).filter(city => {
    const reach = radiusKm + Math.max(.75, Math.min(12, Math.sqrt(city.population) * .009))
    const dy = (city.y - y) * 11.12
    if (Math.abs(dy) > reach) return false
    const dx = city.x - x
    return Math.hypot((dx - Math.round(dx / 3600) * 3600) * scale, dy) <= reach
  }).map(city => escapeName(city.region ? `${city.name}, ${city.region}` : city.name))
}

export function drawCities(svg: SVGSVGElement, box: { x: number; y: number; width: number; height: number }, pixels: number) {
  const layer = svg.querySelector('[data-city-layer]')
  if (!layer) return
  const scale = box.width / pixels
  const minimum = box.width > 2200 ? 4_000_000 : box.width > 900 ? 750_000
    : box.width > 300 ? 180_000 : box.width > 100 ? 40_000 : box.width > 35 ? 8_000 : 0
  const right = box.x + box.width
  const bottom = box.y + box.height
  const mapCopy = Math.round((box.x + box.width / 2 - 1800) / 3600)
  const labels: string[] = []
  const placed: { x: number; y: number; width: number }[] = []
  if (!svg.hasAttribute('data-precise')) {
    for (const label of svg.querySelectorAll('[data-start-label]')) {
      const [x, y] = label.getAttribute('data-start-label')!.split(',').map(Number)
      const width = (label.textContent?.length ?? 0) * 6 + 12
      placed.push({ x: (x - box.x) / scale - (label.getAttribute('text-anchor') === 'end' ? width : 0), y: (y - box.y) / scale, width })
    }
  }
  for (const city of cities) {
    if (city.population < minimum || labels.length >= 130) break
    if (city.y <= box.y || city.y >= bottom) continue
    let longitude = city.x + mapCopy * 3600
    if (longitude < box.x && longitude + 3600 < right) longitude += 3600
    else if (longitude > right && longitude - 3600 > box.x) longitude -= 3600
    if (longitude <= box.x || longitude >= right) continue
    const x = (longitude - box.x) / scale
    const y = (city.y - box.y) / scale
    const width = city.name.length * 6.2 + 9
    const labelLeft = x + width < pixels - 3 ? x : x - width
    if (labelLeft < 3 || placed.some(item => Math.abs(item.y - y) < 15 && item.x < labelLeft + width + 5 && labelLeft < item.x + item.width + 5)) continue
    placed.push({ x: labelLeft, y, width })
    labels.push(`<g data-city transform="translate(${longitude} ${city.y}) scale(${scale})"><circle r="${city.population >= 4_000_000 ? 2.2 : 1.6}"/><text x="${labelLeft === x ? 5 : -5}" y="3" text-anchor="${labelLeft === x ? 'start' : 'end'}">${escapeName(city.name)}</text></g>`)
  }
  layer.innerHTML = labels.join('')
}
