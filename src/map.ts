import { drawWildfire, fireHistoryLayer } from './wildfire'
import { blizzardTrack } from './blizzard'
import { drawSnowfall } from './snow-map'
import { formatDistance } from './units'
import { activeStorm, burstRange, footprint, frontSpeed, leg, routeOptions, stormAbility, stormStats, tornadoRadius, trackPoints, travelRate, type Run } from './sim'
import { bounds, stormColor, theaters, zoneIds, type Storm, type Theater, type ZoneId } from './world'
import { alongTrack, pathFor } from './track'
import { hazardFor } from './hazards'
import { headingToward, isActive, kmPerX, movePoint } from './convection'
import { cycloneTrack, radarSpin } from './cyclone'
import { efColors, tornadoBands, type Swath } from './swath'
import { drawWeather } from './weather-layer'
import { tornadoClimateRegions, tornadoClimateTiers } from './tornado-climate'

const earth = `<image href="${import.meta.env.BASE_URL}blue-marble.jpg" width="3600" height="1800"/>`
const regionalEarth = `${earth}<image href="${import.meta.env.BASE_URL}blue-marble.jpg" x="-3600" width="3600" height="1800"/><image href="${import.meta.env.BASE_URL}blue-marble.jpg" x="3600" width="3600" height="1800"/>`
const satelliteTiles = '<g data-satellite-tiles pointer-events="none" aria-hidden="true"></g>'
const tornadoStartAreas = `<g class="tornado-start-areas" role="img" aria-label="Global tornado formation regions">
  ${[...tornadoClimateRegions].sort((a, b) => a.tier - b.tier).map(({ tier, ring }) => {
    const points = ring.map(([lon, lat]) => `${(lon + 180) * 10},${(90 - lat) * 10}`).join(' ')
    return `<polygon points="${points}" fill="${tornadoClimateTiers[tier].color}" stroke="${tornadoClimateTiers[tier].color}" vector-effect="non-scaling-stroke"/>`
  }).join('')}
</g>`
const stormPath = 'M-66 23C-52-40 2-52 34-34 67-15 48 38 9 35-19 33-26 5-10-8 2-18 20-6 15 7M66-23C52 40-2 52-34 34-67 15-48-38-9-35 19-33 26-5 10 8-2 18-20 6-15-7'
const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : undefined

const worldX = (x: number) => x >= 0 && x <= 3600 ? x : ((x % 3600) + 3600) % 3600

function motion(run: Run, fraction: number, world: boolean) {
  if (run.fire) return { current: { ...run.fire.origin, x: world ? worldX(run.fire.origin.x) : run.fire.origin.x }, wake: '', next: '' }
  if (run.front) {
    const front = run.front
    const speed = frontSpeed(run)
    const current = movePoint(front.point, front.heading, (run.end ? 0 : fraction) * speed)
    const next = [current]
    if (run.cyclone) {
      let projected = { point: current, heading: front.heading }
      for (let step = 0; step < 6; step++) {
        projected = cycloneTrack(run.cyclone, projected.point, projected.heading, 12)
        next.push(projected.point)
      }
    } else if (run.blizzardPattern) {
      let projected = current
      for (let step = 0; step < 8; step++) {
        projected = blizzardTrack(projected, run.blizzardPattern, front.phase, run.time + step * 20, 20, run.effects).point
        next.push(projected)
      }
    } else next.push(movePoint(current, front.heading, speed * 72))
    return { current: { ...current, x: world ? worldX(current.x) : current.x },
      wake: pathFor([...front.path, current], world), next: pathFor(next, world) }
  }
  const points = trackPoints(run)
  const index = run.track.length - 1
  const progress = Math.min(1, (run.progress + fraction * travelRate(run)) / leg)
  const current = alongTrack(points, index, progress)
  const wake: { x: number; y: number }[] = [points[0]]
  for (let segment = 0; segment < index; segment++) {
    for (let i = 1; i <= 9; i++) wake.push(alongTrack(points, segment, i / 9))
  }
  for (let i = 1; i <= 9; i++) wake.push(alongTrack(points, index, progress * i / 9))
  const next = [current]
  for (let i = 1; i <= 12; i++) next.push(alongTrack(points, index, progress + (1 - progress) * i / 12))
  return { current: { ...current, x: world ? worldX(current.x) : current.x }, wake: pathFor(wake, world), next: pathFor(next, world) }
}

export function paintMotion(map: HTMLElement, run: Run, fraction: number) {
  const marker = map.querySelector('[data-storm-position]')
  if (!marker) return
  const view = motion(run, fraction, !!map.querySelector('.world-atlas'))
  const position = `translate(${view.current.x} ${view.current.y})`
  marker.setAttribute('transform', position)
  const weather = map.querySelector('[data-weather-position]')
  weather?.setAttribute('transform', position)
  if (run.cyclone && weather) {
    const angle = reducedMotion?.matches ? 0
      : run.cyclone.radarAngle + fraction * radarSpin(run.cyclone, stormStats(run).windMph)
    weather.querySelector('[data-weather-rotation]')?.setAttribute('transform', `rotate(${angle})`)
  }
  if (weather?.getAttribute('data-weather-kind') === 'hook' && !reducedMotion?.matches) {
    weather.querySelector('[data-radar-now]')?.setAttribute('opacity', (1 - fraction).toFixed(2))
    weather.querySelector('[data-radar-next]')?.setAttribute('opacity', fraction.toFixed(2))
  }
  map.querySelector('[data-storm-wake]')?.setAttribute('d', view.wake)
  map.querySelector('[data-storm-next]')?.setAttribute('d', view.next)
}

type Targeting = 'drop' | 'burst' | null
const atlasStyle = (run: Run) => run.cyclone ? 'cyclone-atlas' : run.theater.storm === 'Tornado' ? 'tornado-atlas' : run.front ? 'convective-atlas' : ''

export function drawWorld(storm: Storm, run: Run | null, pending: Run | null, inspection = '', inspecting = false, targeting: Targeting = null, selectedFunnel: number | null = null) {
  const color = stormColor(run ? activeStorm(run) : storm)
  const start = pending?.zones[pending.origin]
  const markers = run ? '' : storm === 'Wildfire' ? fireHistoryLayer() : storm === 'Tornado' ? tornadoStartAreas : theaters.filter(theater => theater.storm === storm).map(theater => {
    const { left, top, width, height } = bounds(theater)
    const cx = left + width / 2
    const cy = top + height / 2
    const target = inspecting ? '' : `data-theater="${theater.id}" role="button" tabindex="0" aria-label="${theater.name} starting region"`
    const leftLabel = cx > 3000 || ['gulf', 'ontario', 'bengal', 'alberta'].includes(theater.id)
    const shift = leftLabel ? -9 : 9
    return `<g class="world-region">
      <rect class="weather-area" x="${left}" y="${top}" width="${width}" height="${height}" rx="13"/>
      <g transform="translate(${cx} ${cy})" ${target}>
        <g data-camera-scaled="screen"><circle class="world-hit" r="8"/><circle class="weather-pin" r="4"/>
        <text data-start-label="${cx},${cy}" x="${shift}" y="4" text-anchor="${leftLabel ? 'end' : 'start'}">${theater.name}</text></g>
      </g>
    </g>`
  }).join('')
  const alternate = pending && !pending.theater.custom ? (pending.origin === 0 ? 1 : 0) : null
  const choices = inspecting ? '' : run && !run.end
    ? routeOptions(run).map(id => worldChoice(run, id, false)).join('')
    : pending && alternate !== null ? worldChoice(pending, alternate, true) : ''
  return `<svg class="atlas world-atlas ${run ? atlasStyle(run) : 'can-drop'}" viewBox="0 0 3600 1800" role="group" aria-label="World satellite map" style="--storm-color:${color}">
    ${earth}
    ${satelliteTiles}
    <rect class="map-tone" width="3600" height="1800" fill="#115377" opacity=".55" pointer-events="none"/>
    ${markers}
    ${inspection}
    ${run ? drawWildfire(run.fire, true) + drawSnowfall(run, true) + drawWeather(run) : ''}
    ${pending?.snow ? `<path class="snow-preview-band" d="${motion(pending, 0, true).next}" stroke-width="${stormStats(pending).widthKm / 11.1}"/>
      <path class="projected" d="${motion(pending, 0, true).next}" data-snow-preview vector-effect="non-scaling-stroke"/>` : ''}
    <g class="city-layer" data-city-layer aria-hidden="true"></g>
    ${run ? '<path class="wake" data-storm-wake vector-effect="non-scaling-stroke" pointer-events="none"/>' : ''}
    ${run && !run.end ? '<path class="projected" data-storm-next vector-effect="non-scaling-stroke" pointer-events="none"/>' : ''}
    ${run ? drawPulses(run, true) + drawFrontFeatures(run, true, targeting, selectedFunnel) : ''}
    ${start ? `<g class="start-marker" transform="translate(${worldX(start.x)} ${start.y})" pointer-events="none" role="img" aria-label="Temporary starting marker">
      <g data-camera-scaled="screen"><circle r="10"/><path d="M-15 0h8m14 0h8M0-15v8m0 14v8"/><circle class="start-dot" r="3"/></g>
    </g>` : ''}
    ${run && !run.fire ? `<g data-storm-position pointer-events="none">
      <g class="world-storm-marker" data-camera-scaled="screen"><circle r="8"/><circle r="3"/></g>
    </g>` : ''}
    ${choices}
  </svg>`
}

function worldChoice(run: Run, id: ZoneId, starting: boolean) {
  const zone = run.zones[id]
  const label = starting ? `Start at ${zone.name}` : `Route to ${zone.name}`
  return `<g class="world-choice ${starting ? 'start-choice' : ''}" data-zone="${id}" role="button" tabindex="0" aria-label="${label}" transform="translate(${worldX(zone.x)} ${zone.y})">
    <title>${label}</title>
    <g data-camera-scaled="screen"><circle class="world-hit" r="11"/><circle class="choice-pin" r="4.5"/><text x="9" y="-5">${zone.name}</text></g>
  </g>`
}

function drawPulses(run: Run, world: boolean) {
  if (run.end) return ''
  return run.pulses.map(pulse => {
    const zone = run.zones[pulse.zone]
    const marker = pulse.kind === 'ability' ? '<path d="M0-5V5M-5 0H5"/>' : '<circle r="3"/>'
    return `<g class="hazard-pulse" transform="translate(${world ? worldX(zone.x) : zone.x} ${zone.y})" role="img" aria-label="Active impact at ${zone.name}" pointer-events="none"><g data-camera-scaled="screen"><circle r="12"/>${marker}</g></g>`
  }).join('')
}

function drawSwath(swath: Swath[], world: boolean) {
  const bands = efColors.map(() => new Map<string, string[]>())
  const scour = new Map<string, string[]>()
  const append = (paths: Map<string, string[]>, width: number, path: string) => {
    const key = width.toFixed(5)
    const group = paths.get(key)
    if (group) group.push(path)
    else paths.set(key, [path])
  }
  for (const segment of swath) {
    const first = segment.points[0]
    const last = segment.points.at(-1)!
    const heading = headingToward(first, last)
    const scale = Math.hypot(Math.sin(heading) / kmPerX(first.y), Math.cos(heading) / 11.1)
    const path = pathFor(segment.points, world, 4)
    for (const band of tornadoBands(segment.wind, segment.width)) append(bands[band.ef], band.width * scale, path)
    if (segment.scour) append(scour, segment.width * scale * .23, path)
  }
  const marks = (paths: Map<string, string[]>, color: string, ef?: number) => [...paths].map(([width, path]) =>
    `<path ${ef === undefined ? 'class="ground-scour"' : `data-ef="${ef}"`} d="${path.join(' ')}" stroke="${color}" stroke-width="${width}"/>`).join('')
  return `<g class="tornado-swath" pointer-events="none">${bands.map((paths, ef) => marks(paths, efColors[ef], ef)).join('')}${marks(scour, '#26170d')}</g>`
}

function drawFrontFeatures(run: Run, world: boolean, targeting: Targeting, selectedFunnel: number | null) {
  const front = run.front
  if (!front) return ''
  const longitude = (x: number) => world ? worldX(x) : x
  const near = (x: number) => world ? worldX(x) : x + Math.round((front.point.x - x) / 3600) * 3600
  const radius = targeting === 'burst' ? burstRange(run) : tornadoRadius(run)
  const showArea = targeting || (!world && !run.end && stormAbility(run)?.tornado)
  const area = showArea ? `<ellipse class="drop-area ${targeting ? 'aiming' : ''}" ${targeting === 'burst' ? 'data-burst-area' : 'data-drop-area'} cx="${longitude(front.point.x)}" cy="${front.point.y}" rx="${radius / kmPerX(front.point.y)}" ry="${radius / 11.1}" role="img" aria-label="${targeting === 'burst' ? 'Active ability range' : 'Possible tornado touchdown area'}" vector-effect="non-scaling-stroke"/>` : ''
  const water = [...front.floods.keys()].map(({ zone }) =>
    `<circle class="storm-flood" cx="${near(zone.x)}" cy="${zone.y}" r=".5"/>`).join('')
  const funnels = front.funnels.map(funnel => {
    const active = !run.end && isActive(funnel, run.time)
    const label = `${run.tornado ? 'Satellite tornado' : 'Tornado'} ${funnel.id}, EF${funnel.ef}`
    return `<path class="funnel-track ${active ? 'active' : ''}" data-funnel-track="${funnel.id}" d="${pathFor([...funnel.path, funnel.point], world)}" vector-effect="non-scaling-stroke"/>
      ${drawSwath(funnel.swath, world)}
      ${active ? `<g class="funnel-pin ${selectedFunnel === funnel.id ? 'selected' : ''}" ${run.tornado ? 'role="img"' : `data-funnel="${funnel.id}" data-key="funnel-${funnel.id}" role="button" tabindex="0"`} aria-label="${label}" transform="translate(${longitude(funnel.point.x)} ${funnel.point.y})">
        <title>${label} · ${formatDistance(funnel.width)} wide</title>
        <g data-camera-scaled="screen"><circle class="funnel-hit" r="13"/><circle r="8"/><path d="M-5-4H5M-4-1H3M-2 2H2M-1 5H1"/>${world ? '' : `<text x="11" y="4">EF${funnel.ef}</text>`}</g>
      </g>` : ''}`
  }).join('')
  return water + area + drawSwath(front.swath, world) + funnels
}

export function drawRegion(theater: Theater, run: Run, inspected: ZoneId | null, targeting: Targeting = null, selectedFunnel: number | null = null) {
  const { left, top, width, height } = run.fire
    ? { left: run.fire.origin.x - 6, top: run.fire.origin.y - 4.5, width: 12, height: 9 }
    : run.front
    ? run.cyclone ? { left: run.front.point.x - 52, top: run.front.point.y - 38, width: 104, height: 76 }
      : { left: run.front.point.x - 17, top: run.front.point.y - 13, width: 34, height: 26 }
    : bounds(theater)
  const storm = activeStorm(run)
  const color = stormColor(storm)
  const scale = Math.max(width, height) / 540
  const view = motion(run, 0, false)
  const route = run.end ? [] : routeOptions(run)
  const pin = 7 * scale
  const stormSize = (18 + run.strength / 5) * scale
  const nodes = run.front ? '' : zoneIds.map(id => {
    const z = run.zones[id]
    const canRoute = route.includes(id)
    const warn = run.sites[id].warnedAt !== null
    const damaged = run.sites[id].loss > 0
    const fringe = footprint(run, run.to).slice(1).includes(id)
    const label = canRoute ? `Route to ${z.name}` : `${z.name} details`
    const alignLeft = (z.x - left) / width > 0.68
    return `<g class="marker ${canRoute ? 'route-pin' : ''} ${warn ? 'warning' : ''} ${damaged ? 'damaged' : ''} ${inspected === id ? 'selected' : ''}" transform="translate(${z.x} ${z.y}) scale(${scale})" data-zone="${id}" role="button" tabindex="0" aria-label="${label}">
      <g data-camera-scaled>
        <circle class="hit" r="22"/>
        ${fringe ? '<circle class="fringe" r="19"/>' : ''}
        <circle class="locator" r="10"/><circle class="pin" r="4"/>
        <text x="${alignLeft ? -10 : 12}" y="${alignLeft ? -13 : id === 2 ? 17 : 4}" text-anchor="${alignLeft ? 'end' : 'start'}">${z.name}</text>
      </g>
    </g>`
  }).join('')
  const symbol = storm === 'Tornado'
    ? '<g class="world-storm-marker" data-camera-scaled="screen"><circle r="5.5"/><circle r="2"/></g>'
    : storm === 'Hurricane'
    ? `<path class="storm" d="${stormPath}" transform="scale(.62)"/>`
    : storm === 'Blizzard' ? '<path class="storm" d="M0-31v62M-26-16l52 32M-26 16l52-32M-8-23l8 7 8-7M-8 23l8-7 8 7"/>'
        : hazardSymbol(storm)
  return `<svg class="atlas regional-atlas ${atlasStyle(run)}" viewBox="${left} ${top} ${width} ${height}" role="group" aria-label="Satellite map of ${theater.name}" style="--storm-color:${color}">
    <defs><radialGradient id="impact"><stop stop-color="#f0473a" stop-opacity=".76"/><stop offset="1" stop-color="#c62925" stop-opacity="0"/></radialGradient></defs>
    ${regionalEarth}
    ${satelliteTiles}
    <rect class="map-tone" x="-3600" width="10800" height="1800" fill="#164561" opacity=".36" pointer-events="none"/>
    ${drawWildfire(run.fire, false)}${drawSnowfall(run, false)}${drawWeather(run)}
    <g class="city-layer" data-city-layer aria-hidden="true"></g>
    ${zoneIds.filter(id => run.sites[id].loss > 0).map(id => `<circle cx="${run.zones[id].x}" cy="${run.zones[id].y}" r="${pin * 5}" fill="url(#impact)" pointer-events="none"/>`).join('')}
    <path data-storm-wake d="${view.wake}" class="wake" vector-effect="non-scaling-stroke"/>
    ${run.end ? '' : `<path data-storm-next d="${view.next}" class="projected" vector-effect="non-scaling-stroke"/>`}
    ${run.fire ? '' : `<g data-storm-position transform="translate(${view.current.x} ${view.current.y})" pointer-events="none">
      <ellipse class="wind-ring" rx="${stormStats(run).widthKm / 22.2 / Math.max(.2, Math.cos((90 - view.current.y / 10) * Math.PI / 180))}" ry="${stormStats(run).widthKm / 22.2}" vector-effect="non-scaling-stroke"/>
      ${storm === 'Tornado' ? symbol
        : `<g transform="scale(${stormSize / 45})">${symbol}</g>`}
    </g>`}
    ${drawPulses(run, false)}
    ${nodes}
    ${drawFrontFeatures(run, false, targeting, selectedFunnel)}
  </svg>`
}

function hazardSymbol(storm: Storm) {
  const paths = {
    bolt: 'M5-28-20 4H-4L-9 28 20-6H4Z',
    rain: 'M-23-3a9 9 0 1 1 4-17 17 17 0 0 1 32-2 11 11 0 1 1 5 20M-14 6l-5 12M0 4l-5 17M14 6l-5 12',
    wind: 'M-29-12H12q15 0 12-10M-29 0H25q12 0 10-8M-27 12H12q10 0 9 10',
    fire: 'M3-28c3 17 23 17 20 35-4 26-46 24-46 1 0-10 8-15 10-23 0 6 4 9 8 11-2-9 5-15 8-24Z',
    heat: 'M0-12a12 12 0 1 0 .01 0ZM0-28v7M0 21v7M-28 0h7M21 0h7M-20-20l5 5M15 15l5 5M-20 20l5-5M15-15l5-5',
  }
  return `<path class="storm" d="${paths[hazardFor(storm)!.icon]}"/>`
}
