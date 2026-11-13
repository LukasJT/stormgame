import { blizzardCourses, blizzardPatterns, type BlizzardCourse, type BlizzardPattern } from './blizzard'
import { campaign, difficulties, earnedStars, type CampaignEvent } from './campaign'
import type { MapPoint } from './convection'
import { affectedCities } from './cities'
import { cycloneTickSeconds } from './cyclone'
import { loadImpactRegions, loadLocalities, makeDrop } from './free-drop'
import { withRegionScope } from './regions'
import { buyUpgrade, chooseBlizzardPattern, collectWeatherPickup, impactAreas, nameHurricane, removeUpgrade, setBlizzardCourse,
  setCourse, startRun, steer, tick, totals, triggerSatellite, useAbility, type Difficulty, type Run, type ZoneId } from './sim'
import { tornadoTickSeconds } from './tornado-report'
import { theaters } from './world'

export const rulesVersion = '2026-11-balance-4'
export const datasetVersion = 'stormwake-population-2026-11'
export const maxReplayTicks = 5400
export const maxReplayCommands = 1800
export type Placement = { event: CampaignEvent; difficulty: Difficulty; lat: number; lon: number; theaterId?: string; origin: 0 | 1 }
export type Ticket = { id: string; token: string; seed: number; issuedAt: number }
export type Command = { tick: number; action: string; value?: string | number; point?: MapPoint; funnel?: number }
export type Replay = { placement: Placement; seed: number; startedAt: number; name?: string; pattern?: BlizzardPattern; ticks: number; commands: Command[] }

export function validPlacement(value: unknown): value is Placement {
  if (!value || typeof value !== 'object') return false
  const p = value as Placement
  if (!campaign.includes(p.event) || !difficulties.includes(p.difficulty) || !Number.isFinite(p.lat) ||
    Math.abs(p.lat) > 90 || !Number.isFinite(p.lon) || Math.abs(p.lon) > 180 || (p.origin !== 0 && p.origin !== 1)) return false
  if (p.theaterId === undefined) return p.origin === 0
  const theater = theaters.find(item => item.id === p.theaterId && item.storm === p.event)
  return !!theater && p.lat === theater.places[p.origin][1] && p.lon === theater.places[p.origin][2]
}

export async function prepareForecast(placement: Placement) {
  await loadLocalities()
  const theater = theaters.find(item => item.id === placement.theaterId && item.storm === placement.event)
    ?? makeDrop(placement.event, placement.lat, placement.lon)
  return { theater, ...await loadImpactRegions(theater, placement.origin) }
}

export function createForecast(placement: Placement, prepared: Awaited<ReturnType<typeof prepareForecast>>,
  seed: number, startedAt: number, name?: string, pattern?: BlizzardPattern, sandbox = false) {
  return withRegionScope(prepared.countries, () => {
    const run = startRun(prepared.theater, placement.origin, placement.difficulty, seed, sandbox)
    run.exposureCountries = prepared.countries
    if (run.cyclone) {
      if (!name || !nameHurricane(run, name)) throw Error('Invalid hurricane name.')
      run.cyclone.startedAt = startedAt
    }
    if (run.tornado) run.tornado.startedAt = startedAt
    if (pattern && !chooseBlizzardPattern(run, pattern)) throw Error('Invalid blizzard pattern.')
    return run
  })
}

function validPoint(point: MapPoint) {
  return Number.isFinite(point.x) && Math.abs(point.x) < 36_000 && Number.isFinite(point.y) && point.y >= 0 && point.y <= 1800
}

export function applyCommand(run: Run, command: Command) {
  if (!command || run.end || command.tick !== run.time || (command.point && !validPoint(command.point))) return false
  return withRegionScope(run.exposureCountries, () => {
    const { value, point, funnel } = command
    switch (command.action) {
      case 'buy': return typeof value === 'string' && buyUpgrade(run, value)
      case 'remove': return typeof value === 'string' && removeUpgrade(run, value)
      case 'pickup': return typeof value === 'number' && collectWeatherPickup(run, value)
      case 'ability': return (!point || !!(run.effects.precisionDrop || run.effects.targetedBurst || run.effects.fireSpot)) && !!useAbility(run, point)
      case 'satellite': return triggerSatellite(run)
      case 'course': return !!point && (funnel === undefined || Number.isSafeInteger(funnel)) && setCourse(run, point, funnel)
      case 'blizzard-course':
        if (typeof value !== 'string' || !Object.hasOwn(blizzardCourses, value) || !run.snow) return false
        const before = run.snow.steering
        setBlizzardCourse(run, value as BlizzardCourse)
        return before !== run.snow.steering
      case 'steer':
        if (typeof value !== 'number' || !Number.isInteger(value)) return false
        const route = [run.to, run.queued]
        steer(run, value as ZoneId)
        return route[0] !== run.to || route[1] !== run.queued
      default: return false
    }
  })
}

export async function verifyReplay(replay: Replay) {
  if (!validPlacement(replay?.placement) || !Number.isSafeInteger(replay.seed) || !Number.isSafeInteger(replay.startedAt) ||
    !Number.isSafeInteger(replay.ticks) || replay.ticks < 1 || replay.ticks > maxReplayTicks ||
    !Array.isArray(replay.commands) || replay.commands.length > maxReplayCommands ||
    (replay.name !== undefined && typeof replay.name !== 'string') ||
    (replay.pattern !== undefined && !Object.hasOwn(blizzardPatterns, replay.pattern))) throw Error('Invalid replay.')
  const prepared = await prepareForecast(replay.placement)
  if (!prepared.complete) throw Error('Regional exposure data is unavailable.')
  const run = createForecast(replay.placement, prepared, replay.seed, replay.startedAt, replay.name, replay.pattern)
  let index = 0
  while (run.time < replay.ticks && !run.end) {
    while (index < replay.commands.length && replay.commands[index]?.tick === run.time) {
      if (!applyCommand(run, replay.commands[index++])) throw Error('Illegal replay action.')
    }
    tick(run)
  }
  if (index !== replay.commands.length || run.time !== replay.ticks || !run.end) throw Error('Replay did not end naturally.')
  return summarizeRun(run, replay.placement, replay.startedAt)
}

export const metricLabels = {
  damage: 'Damage', deaths: 'Deaths', injured: 'Injured', settlements: 'Settlements affected',
  duration: 'Modeled duration', mastery: 'Campaign stars',
  pathKm: 'Ground path (km)', peakWidth: 'Peak width (m)', peakEF: 'Peak modeled EF',
  wind: 'Peak wind (mph)', surge: 'Storm surge', majorHours: 'Major hurricane time (hours)',
  windDamage: 'Wind damage', rainDamage: 'Rain damage', hailDamage: 'Hail damage', floodDamage: 'Flood damage', funnelDamage: 'Tornado damage',
  snowfall: 'Peak snowfall (cm)', whiteout: 'Longest whiteout (forecast ticks)',
  funnels: 'Tornadoes dropped', outbreak: 'Simultaneous tornadoes', combinedPath: 'Combined tornado track (km)',
  longestFunnel: 'Longest tornado track (km)', funnelEF: 'Strongest tornado (EF)',
  burnedArea: 'Burned area (km²)', spotfires: 'Spot fires', perimeter: 'Peak active area (km²)',
} as const
export type Metric = keyof typeof metricLabels
export const eventMetrics: Record<CampaignEvent, Metric[]> = {
  Tornado: ['pathKm', 'peakWidth', 'peakEF'],
  Hurricane: ['wind', 'windDamage', 'rainDamage', 'surge', 'majorHours'],
  Blizzard: ['snowfall', 'whiteout'],
  Thunderstorm: ['funnels', 'outbreak', 'combinedPath', 'longestFunnel', 'funnelEF', 'funnelDamage', 'hailDamage', 'floodDamage'],
  Wildfire: ['burnedArea', 'spotfires', 'perimeter'],
}
export const commonMetrics: Metric[] = ['damage', 'deaths', 'injured', 'settlements', 'duration']
export const modeledTickSeconds: Record<CampaignEvent, number> = {
  Tornado: tornadoTickSeconds, Hurricane: cycloneTickSeconds, Blizzard: 60, Thunderstorm: 30, Wildfire: 180,
}

export function summarizeRun(run: Run, placement: Placement, startedAt: number) {
  const { event, difficulty } = placement
  const total = totals(run)
  const impacted = impactAreas(run).filter(({ site }) => site.loss > 0)
  const places = new Set(run.tornado?.places)
  if (!run.tornado) for (const { zone, country } of impacted) {
    if (country && zone.population) for (const city of affectedCities(zone.x, zone.y, country, 8)) places.add(city)
  }
  const metrics: Partial<Record<Metric, number>> = {
    ...total, injured: impactAreas(run).reduce((sum, { site }) => sum + site.injured, 0),
    duration: run.time * modeledTickSeconds[event], settlements: places.size,
  }
  if (run.tornado) Object.assign(metrics, {
    pathKm: run.tornado.lengthKm, peakWidth: run.tornado.maxWidthKm * 1000, peakEF: run.tornado.peakEf ?? 0,
  })
  if (run.cyclone) Object.assign(metrics, {
    wind: run.cyclone.peakWind, surge: run.surgeDamage, windDamage: run.windDamage, rainDamage: run.rainDamage,
    majorHours: run.majorHurricaneTicks / 10,
  })
  if (run.snow) Object.assign(metrics, {
    snowfall: [...run.snow.deposits.values()].reduce((peak, report) => Math.max(peak, report.cm), 0),
    whiteout: run.snow.longestWhiteout,
  })
  if (event === 'Thunderstorm') {
    const funnels = run.front?.funnels ?? []
    const lengths = funnels.map(funnel => funnel.groundKm)
    Object.assign(metrics, {
      funnels: funnels.length, outbreak: run.peakOutbreak, combinedPath: lengths.reduce((sum, km) => sum + km, 0),
      longestFunnel: Math.max(0, ...lengths), funnelEF: Math.max(0, ...funnels.map(funnel => funnel.reachedEF)),
      funnelDamage: funnels.reduce((sum, funnel) => sum + funnel.damage, 0), hailDamage: run.hailDamage, floodDamage: run.floodDamage,
    })
  }
  if (run.fire) Object.assign(metrics, {
    burnedArea: run.fire.areaKm2, spotfires: run.fire.spotfires, perimeter: run.peakFirePerimeterKm2,
  })
  return Object.freeze({
    rulesVersion, datasetVersion, placement: Object.freeze({ ...placement }), mode: run.sandbox ? 'sandbox' : 'campaign',
    seed: run.seed, startedAt, ticks: run.time, name: run.name, pattern: run.blizzardPattern, ending: run.end,
    stars: run.sandbox ? 0 : earnedStars(event, difficulty, total.damage, !!run.end), metrics: Object.freeze(metrics),
  })
}
export type RunSummary = ReturnType<typeof summarizeRun>
