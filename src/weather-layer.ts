import type { BlizzardPattern } from './blizzard'
import { activeStorm, position, stormStats, type Run } from './sim'
import { tornadoRadar } from './tornado-radar'

type Echo = { file: string; ratio: number; label: string; angle?: number }
const cell: Echo = { file: 'cell', ratio: .92, label: 'Convective reflectivity' }
const bow: Echo = { file: 'bow', ratio: 1.18, label: 'Bowing squall line', angle: -18 }
const lake: Echo = { file: 'lake-band', ratio: .37, label: 'Narrow lake-effect snow band', angle: -22 }
const squall: Echo = { file: 'snow-squall', ratio: .65, label: 'Narrow snow squall', angle: 24 }
const coast: Echo = { file: 'noreaster', ratio: 1.03, label: 'Coastal snow shield', angle: -12 }
const snow: Record<BlizzardPattern, Echo> = {
  'Alberta Clipper': { ...squall, ratio: .46, angle: -12, label: 'Compact clipper snow band' },
  "Nor'easter": coast,
  'Lake-Effect Storm': lake,
  'Snow Squall': squall,
  'Colorado Low': { ...coast, ratio: .81, angle: 58, label: 'Broad plains snow shield' },
  'Sea-Effect Snow': { ...lake, angle: 32, label: 'Sea-effect snow bands' },
  'Mountain Snowstorm': { ...lake, ratio: .62, angle: 55, label: 'Terrain-aligned snow band' },
  'Frontal Snowstorm': { ...squall, ratio: .48, angle: -34, label: 'Frontal snow band' },
  'Cold-Air Outbreak': { ...lake, ratio: .72, angle: 10, label: 'Scattered cold-air snow showers' },
}

const stormEchoes: Partial<Record<ReturnType<typeof activeStorm>, Echo>> = {
  Derecho: { ...bow, label: 'Derecho bow echo' },
  Squall: { ...bow, ratio: 1.65, label: 'Linear squall echo' },
  Multicell: { ...cell, label: 'Cluster of convective cells' },
  Pulse: { ...cell, label: 'Compact pulse cell' },
  'Storm Cell': cell,
  Lightning: { ...cell, label: 'Electrified storm cell' },
  Flooding: { ...bow, ratio: .67, label: 'Heavy rain bands and runoff' },
}

function image(echo: Echo) {
  return `<image href="${import.meta.env.BASE_URL}weather/${echo.file}.png" x="-.5" y="${-echo.ratio / 2}" width="1" height="${echo.ratio}" preserveAspectRatio="none"/>`
}

const modeled = {
  Wildfire: { label: 'Smoke plume and hotspots', color: '#c0a197',
    shapes: '<ellipse cx=".22" cy="-.02" rx=".43" ry=".20"/><ellipse cx=".42" cy="-.09" rx=".33" ry=".16"/><circle class="weather-hotspot" r=".06"/><circle class="weather-hotspot" cx="-.09" cy=".045" r=".034"/>' },
  'Dust Storm': { label: 'Dust wall and trailing plume', color: '#e8b579',
    shapes: '<ellipse cx="-.16" rx=".47" ry=".26"/><ellipse cx=".11" rx=".26" ry=".35"/><ellipse cx=".09" rx=".14" ry=".31"/>' },
  'Heat Dome': { label: 'Surface heat field', color: '#ed7551',
    shapes: '<ellipse rx=".52" ry=".39"/><ellipse rx=".34" ry=".27"/><ellipse rx=".2" ry=".16"/>' },
}

export function drawWeather(run: Run) {
  if (run.end) return ''
  const storm = activeStorm(run)
  if (storm === 'Tornado') return ''
  const stats = stormStats(run)
  const tornadic = storm === 'Thunderstorm' || storm === 'Supercell'
  const echo = run.cyclone ? { file: 'cyclone', ratio: 1, label: 'Tropical cyclone radar' }
    : run.blizzardPattern ? snow[run.blizzardPattern] : stormEchoes[storm]
  const physical = storm === 'Wildfire' || storm === 'Dust Storm' || storm === 'Heat Dome' ? modeled[storm] : undefined
  if (!echo && !physical && !tornadic) return ''
  const strength = run.strength / 100
  const diameter = run.cyclone ? stats.widthKm * 1.65 : stats.widthKm * 1.35
  const heading = run.front?.heading ?? Math.atan2(run.zones[run.to].y - run.zones[run.at].y, run.zones[run.to].x - run.zones[run.at].x)
  const angle = run.cyclone ? run.cyclone.radarAngle : tornadic || physical ? heading * 180 / Math.PI : echo?.angle ?? 0
  const brightness = Math.min(.91, .37 + strength * .49 + (run.whiteout ? .18 : 0))
  const imageLayers = echo ? `${storm === 'Multicell' ? `<g transform="translate(.34 -.14) scale(.72)" opacity=".72">${image(echo)}</g>` : ''}
    ${image(echo)}${storm === 'Lightning' ? '<circle class="weather-electric" r=".12"/>' : ''}` : ''
  const reflectivity = tornadic ? `<g transform="scale(.5)"><g data-radar-now>${tornadoRadar(run.time, strength, stats.windMph, run.front!.phase)}</g>
    <g data-radar-next opacity="0">${tornadoRadar(run.time + 1, strength, stats.windMph, run.front!.phase)}</g></g>` : ''
  return `<g class="weather-layer" data-weather-position data-weather-kind="${tornadic ? 'hook' : echo?.file ?? storm}" role="img" aria-label="${tornadic ? 'Simulated storm reflectivity' : echo?.label ?? physical?.label}" pointer-events="none" opacity="${brightness}">
    <g data-weather-scale="${diameter}" data-weather-y="${position(run).y}">
      <g data-weather-rotation transform="rotate(${angle})">${tornadic ? reflectivity : echo ? imageLayers : `<defs><radialGradient id="weather-density"><stop stop-color="${physical!.color}" stop-opacity=".93"/><stop offset=".66" stop-color="${physical!.color}" stop-opacity=".52"/><stop offset="1" stop-color="${physical!.color}" stop-opacity="0"/></radialGradient></defs>
        <g fill="url(#weather-density)">${physical!.shapes}</g>`}</g>
    </g>
  </g>`
}
