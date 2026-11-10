import { advanceWildfire, fireHistoryAt, fireHistoryLabels, spotFire, startWildfire, type Wildfire } from './wildfire'
import { localExposureAt, makeZone, makeZones, zoneIds as ids, type Theater, type ZoneId, type Zone } from './world'
import { baseEffects, trees, type Effects, type Upgrade } from './upgrades'
import { alongTrack } from './track'
import { hazardFor, hazards } from './hazards'
import { blizzardCourseAvailable, blizzardHeading, blizzardOptions, blizzardPatterns, blizzardSteeringOffset, blizzardTrack, type BlizzardCourse, type BlizzardPattern, type BlizzardSteering } from './blizzard'
import { advanceFront, advanceFunnel, createFunnel, distanceKm, dropRadius, headingToward, isActive, kmPerX, landAt, makeConvectiveTrack, movePoint, random, worldX, type ConvectiveTrack, type MapPoint } from './convection'
import { lakeAt, localityAt } from './free-drop'
import { affectedCities, escapeName, nearbyCity } from './cities'
import { fatalityRate, injuryToFatality, lossPerHome, sweptShare, windBand } from './impact'
import { momentumSchedule, startingMomentum, usesTornadoEconomy, type WeatherPickup } from './momentum'
import { cycloneFlow, cycloneSpeed, cycloneTrack, cycloneWeather, latitudeAt, longitudeAt, radarSpin, startCyclone, type Cyclone } from './cyclone'
import { markSwath, tornadoStrips, type Swath } from './swath'
import { tornadoClimate } from './tornado-climate'
import { tornadoStartDate, type TornadoRecord } from './tornado-report'
export type { ZoneId } from './world'
export type Difficulty = 'Easy' | 'Normal' | 'Hard' | 'Expert'
export type Origin = 0 | 1

export const difficultyRules = {
  Easy: { shelter: 0, good: 0.65, hostile: 0.1, description: 'Favorable weather · low initial sheltering' },
  Normal: { shelter: 0.5, good: 0.45, hostile: 0.2, description: 'Mixed weather · 50% baseline sheltering' },
  Hard: { shelter: 0.9, good: 0.25, hostile: 0.35, description: 'Fewer favorable conditions · 90% baseline sheltering' },
  Expert: { shelter: 0.98, good: 0.12, hostile: 0.48, description: 'Harsh weather · 98% baseline sheltering' },
}
export const leg = 70
export const defaultSeed = 80417


type Site = {
  deaths: number; injured: number; loss: number; warnedAt: number | null; threatAt: number | null
  clearedAt: number | null; sheltered: number; carry: number; injuryCarry: number; outageUntil: number; reportedWarning: boolean
}
type SnowReport = { place: string; cm: number }
type Event = { time: number; text: string; breaking?: boolean; snowfall?: SnowReport }
type Pulse = { zone: ZoneId; until: number; damage: number; kind: 'ability' | 'trail' }
type ImpactArea = { zone: Zone; site: Site; country?: string }
type Snowstorm = {
  deposits: Map<ImpactArea, SnowReport>
  waterMoisture: number; source: string | null; rate: number; visibilityMiles: number; longestWhiteout: number
  steering: BlizzardSteering
}
type Front = ConvectiveTrack & {
  areas: Map<string, ImpactArea>; current: ImpactArea
  locality: ReturnType<typeof localityAt>
  bursts: { point: MapPoint; radius: number; until: number; damage: number }[]
  floods: Map<ImpactArea, number>
  swath: Swath[]
}
export type Run = {
  seed: number; origin: Origin; difficulty: Difficulty; time: number; strength: number; momentum: number
  name: string; support: number; cyclone: Cyclone | null; overWater: boolean
  tornado: TornadoRecord | null; snow: Snowstorm | null; fire: Wildfire | null
  realTime: number; momentumGain: { points: number; at: number } | null
  momentumSchedule: ReturnType<typeof momentumSchedule>; pickup: WeatherPickup | null
  theater: Theater; zones: Zone[]; charge: number; whiteout: number
  impactCredit: number; blizzardPattern: BlizzardPattern | null
  front: Front | null
  at: ZoneId; to: ZoneId; queued: ZoneId | null; progress: number
  upgrades: string[]; effects: Effects
  upgradePayments: Map<string, number>; purchases: number; refunds: number
  pulses: Pulse[]
  detectedAt: number | null; sites: Record<ZoneId, Site>; track: ZoneId[]; events: Event[]
  alertHeadlines: Set<string>
  end: string | null
}

function newSite(): Site {
  return { deaths: 0, injured: 0, loss: 0, warnedAt: null, threatAt: null, clearedAt: null,
    sheltered: 0, carry: 0, injuryCarry: 0, outageUntil: 0, reportedWarning: false }
}

function frontArea(areas: Front['areas'], point: MapPoint, surface = landAt(point)) {
  const x = Math.floor(worldX(point.x)) + .5
  const y = Math.floor(point.y) + .5
  const { name, code } = surface
  const local = localExposureAt(code, latitudeAt(point), longitudeAt(point))
  const key = `${x},${y},${code ?? ''},${local?.id ?? ''}`
  const saved = areas.get(key)
  if (saved) return saved
  const center = landAt({ x, y })
  const centerExposure = localExposureAt(code, latitudeAt({ x, y }), longitudeAt({ x, y }))
  const sample = center.code === code && centerExposure?.id === local?.id ? { x, y } : point
  const zone = makeZone([name, latitudeAt(sample), longitudeAt(sample), code], kmPerX(y) * 11.1 / 2.59, [], local)
  const area = { zone, site: newSite(), country: code }
  areas.set(key, area)
  return area
}

export function impactAreas(run: Run): ImpactArea[] {
  return run.front ? [...run.front.areas.values()]
    : ids.map(id => ({ zone: run.zones[id], site: run.sites[id], country: run.theater.places[id][3] }))
}

function zoneReference(theater: Theater, id: ZoneId) {
  const [name, lat, lon] = theater.places[id]
  return theater.custom ? localityAt(lat, lon).reference : `in ${name}`
}

export function activeStorm(run: Run) {
  if (run.theater.storm !== 'Thunderstorm') return run.theater.storm
  const { mesocyclone, outflow, newCells } = run.effects
  if (mesocyclone && mesocyclone >= Math.max(outflow, newCells)) return 'Supercell'
  if (outflow && outflow >= newCells) return 'Squall'
  return newCells ? 'Multicell' : 'Thunderstorm'
}

export function stormOrganization(run: Run) {
  const form = activeStorm(run)
  return form === 'Thunderstorm' ? 'Developing cell' : form === 'Squall' ? 'Squall line' : form === 'Multicell' ? 'Multicell cluster' : form
}

export function stormAbility(run: Run) {
  const form = activeStorm(run)
  return run.theater.storm === 'Thunderstorm' && form !== 'Supercell'
    ? hazards.Thunderstorm.ability : hazardFor(form)?.ability
}

export function chooseBlizzardPattern(run: Run, pattern: BlizzardPattern) {
  if (!run.blizzardPattern || run.time || run.end || !blizzardOptions(run.theater.places[run.origin]).includes(pattern)) return false
  run.blizzardPattern = pattern
  if (run.front) run.front.heading = blizzardHeading(run.front.point, pattern, run.front.phase, 0, 0)
  run.events[0].text = `${pattern} formed near ${run.zones[run.origin].name}.`
  return true
}

export function setBlizzardCourse(run: Run, course: BlizzardCourse) {
  const snow = run.snow
  if (!snow || run.end || snow.steering.course === course || !blizzardCourseAvailable(course, run.blizzardPattern)) return
  snow.steering = { course, from: blizzardSteeringOffset(snow.steering, run.time), since: run.time }
}

export function startRun(theater: Theater, origin: Origin, difficulty: Difficulty, seed: number): Run {
  const zones = makeZones(theater)
  const hazard = hazardFor(theater.storm)
  const blizzardPattern = theater.storm === 'Blizzard' ? blizzardOptions(theater.places[origin])[0] : null
  const sites = Object.fromEntries(ids.map(id => [id, newSite()])) as Run['sites']
  const areas: Front['areas'] = new Map()
  const point = { x: zones[origin].x, y: zones[origin].y }
  const tornado = theater.storm === 'Tornado'
  const hurricane = theater.storm === 'Hurricane'
  const fire = theater.storm === 'Wildfire' ? startWildfire(point, seed) : null
  const locality = localityAt(latitudeAt(point), longitudeAt(point))
  const overWater = !locality.code
  const city = tornado ? closestTornadoCity(point) : undefined
  const name = tornado ? overWater ? 'Waterspout' : tornadoName(city) : ''
  const record: TornadoRecord | null = tornado
    ? { startedAt: tornadoStartDate(), lengthKm: 0, groundTicks: 0, maxWidthKm: 0, peakEf: null, places: new Set(), travelKm: 0,
      awareness: 0, deaths: 0, nextSatellite: 0, manualSatellite: 0, chaserExposure: 0 } : null
  const cyclone = hurricane ? startCyclone(point, seed, overWater && !lakeAt(latitudeAt(point), longitudeAt(point))) : null
  const front: Front | null = tornado || hurricane || blizzardPattern || fire || hazard?.group === 'storm'
    ? { ...makeConvectiveTrack(point, seed, tornado), areas, current: frontArea(areas, point), locality, bursts: [], floods: new Map(), swath: [] }
    : null
  if (front && cyclone) front.heading = cycloneFlow(cyclone, point)
  if (front && blizzardPattern) front.heading = blizzardHeading(point, blizzardPattern, front.phase, 0, 0)
  return {
    seed, origin, difficulty, theater, zones, charge: blizzardPattern ? 42 : 35, whiteout: 0, name, support: 100, cyclone, overWater, tornado: record, fire,
    impactCredit: 0, blizzardPattern, front,
    snow: blizzardPattern ? { deposits: new Map(), waterMoisture: 0, source: null, rate: 0, visibilityMiles: 10, longestWhiteout: 0,
      steering: { course: 'natural', from: 0, since: 0 } } : null,
    time: 0, strength: hurricane ? 31 : tornado ? 58 : blizzardPattern ? 48 : fire ? 100 * ([...fire.cells.values()][0]?.heat ?? 0) : front ? 17 : origin === 1 ? 38 : 43, momentum: startingMomentum(theater.storm),
    realTime: 0, momentumGain: null,
    momentumSchedule: momentumSchedule(seed, theater.storm), pickup: null,
    at: origin, to: zones[origin].neighbors[0], queued: null, progress: 0,
    upgrades: [], effects: { ...baseEffects }, upgradePayments: new Map(), purchases: 0, refunds: 0, pulses: [],
    detectedAt: null, sites, track: [origin], end: fire && !fire.active ? 'Ignition unavailable here.' : null, alertHeadlines: new Set(),
    events: [{ time: 0, text: tornado ? `Rotating storms detected ${overWater ? locality.reference : city ? `near ${city}` : locality.reference}.` : theater.storm === 'Wildfire'
      ? fire && !fire.active ? 'No historical burn recorded at this location.' : `Wildfire ignited ${zoneReference(theater, origin)}.`
      : hazard || blizzardPattern ? `${blizzardPattern ?? theater.storm} formed ${zoneReference(theater, origin)}.` : `Circulation formed ${zoneReference(theater, origin)}.`,
    breaking: tornado || !!hazard }],
  }
}

function closestTornadoCity(point: MapPoint) {
  const city = nearbyCity(latitudeAt(point), longitudeAt(point), '', undefined, Infinity)
  return city && escapeName(city.name)
}

function tornadoName(city: string | undefined) {
  return city ? `The ${city} Tornado` : 'The Tornado'
}

export function tornadoLimits(run: Run) {
  return { ticks: 600 + run.effects.tornadoLifetime, km: 180 + run.effects.tornadoRange }
}

function gainMomentum(run: Run, points: number) {
  run.momentum += points
  const prior = run.momentumGain
  run.momentumGain = { points: points + (prior?.at === run.realTime ? prior.points : 0), at: run.realTime }
}

export function satelliteCooldown(run: Run) {
  return Math.max(0, Math.ceil(((run.tornado?.manualSatellite ?? 0) - run.realTime) / 1000))
}

function spawnSatellite(run: Run) {
  const front = run.front!
  const id = front.funnels.length + 1
  const roll = random(run.seed ^ Math.imul(id, 0x9e3779b1) ^ run.time)
  const heading = front.heading + (roll() < .5 ? -1 : 1) * (.55 + roll() * (Math.PI - .55))
  const { windMph, widthKm } = stormStats(run)
  const peakEF = Math.min(2, Math.max(0, windBand(windMph) - 1))
  front.funnels.push({
    id, ef: 0, peakEF, wind: 65, width: .02, peakWidth: Math.min(.35, Math.max(.025, widthKm * .25)),
    start: run.time, life: 18 + Math.floor(roll() * 12), point: front.point, path: [front.point],
    swath: [], heading, naturalHeading: heading, preference: null, speed: .18 + roll() * .15, phase: roll() * 6.28,
  })
  log(run, 'A weaker satellite tornado splits from the main circulation.')
}

export function triggerSatellite(run: Run) {
  if (!run.tornado || run.end || run.overWater || !run.effects.satelliteTrigger || satelliteCooldown(run)) return false
  spawnSatellite(run)
  run.tornado.manualSatellite = run.realTime + 60_000
  return true
}

export function nameHurricane(run: Run, name: string) {
  const normalized = name.trim().replace(/\s+/g, ' ')
  if (!run.cyclone || run.time || !normalized || normalized.length > 32) return false
  run.name = escapeName(normalized)
  const { category, windMph } = stormStats(run)
  run.cyclone.stage = category
  run.cyclone.peakWind = windMph
  run.cyclone.environment = conditions(run, run.origin).name
  run.cyclone.history = [{ time: 0, category, wind: windMph, reason: 'Circulation formed', location: run.front!.locality.name }]
  run.events[0].text = `${category} ${run.name} forms ${run.front!.locality.reference}.`
  run.events[0].breaking = true
  return true
}

export function collectWeatherPickup(run: Run, time: number) {
  if (run.end || !run.pickup || run.pickup.time !== time || run.time >= run.pickup.expires) return false
  gainMomentum(run, run.pickup.points)
  run.pickup = null
  return true
}

export function conditions(run: Run, id: ZoneId, time = run.time) {
  const storm = activeStorm(run)
  if (run.cyclone && run.front) return cycloneWeather(run.cyclone, run.front.point, run.effects, 2 - difficultyRules[run.difficulty].good * 3, run.strength)
  if (run.fire) {
    const history = fireHistoryAt(run.fire.origin)
    return { name: history ? `${fireHistoryLabels[history - 1]} historical burning` : 'No recorded burning', trend: history ? .015 * history : 0 }
  }
  if (run.front && storm !== 'Tornado' && !run.blizzardPattern) return frontConditions(run, time)
  const rule = difficultyRules[run.difficulty]
  const hash = Math.imul(run.seed ^ Math.imul(id + 1, 374761393) ^ Math.imul(Math.floor(time / (2 * leg)) + 1, 668265263), 1274126177)
  const roll = ((hash ^ (hash >>> 15)) >>> 0) / 4294967296
  const hazard = hazardFor(storm)
  if (hazard) {
    if (run.zones[id].sea && hazard.group === 'ground') return { name: 'Open water', trend: -.26 }
    const latitude = Math.abs(run.theater.places[id][1])
    const adverse = roll > 1 - rule.hostile || (storm === 'Heat Dome' && latitude > 68)
    if (adverse) return { name: hazard.weather[2], trend: -.19 * (1 - run.effects.hazardBuffer) }
    if (roll < rule.good) return { name: hazard.weather[0], trend: hazard.growth + run.effects.hazardGain }
    return { name: hazard.weather[1], trend: -.025 + run.effects.hazardGain * .5 }
  }
  if (storm === 'Tornado') {
    return tornadoWeather(run, roll)
  }
  if (run.blizzardPattern) {
    const pattern = blizzardPatterns[run.blizzardPattern]
    const cold = Math.max(.18, 1 - run.effects.hazardBuffer - run.effects.coldTolerance * .45)
    if (Math.abs(latitudeAt(position(run))) < 29) return { name: 'Warm surroundings', trend: -.18 * cold }
    if (roll < rule.good) return { name: pattern.favorable, trend: pattern.growth + run.effects.hazardGain }
    if (roll > 1 - rule.hostile) return { name: 'Thaw', trend: -.12 * cold }
    return { name: 'Cold front', trend: -.025 + run.effects.hazardGain * .5 }
  }
  return { name: 'Mixed conditions', trend: -.025 }
}

export function tornadoSupportAt(point: MapPoint) {
  return tornadoClimate(latitudeAt(point), longitudeAt(point))
}

function tornadoWeather(run: Run, roll: number) {
  const point = run.front!.point
  const latitude = Math.abs(latitudeAt(point))
  const support = tornadoSupportAt(point) * (run.overWater ? .68 : 1)
  const rule = difficultyRules[run.difficulty]
  const weakening = Math.max(.15, 1 - run.effects.hazardBuffer)
  const cold = latitude >= 52 || roll > 1 - rule.hostile / 2
  const heat = !cold && (latitude <= 30 || roll > 1 - rule.hostile)
  const tolerance = cold ? run.effects.coldTolerance : heat ? run.effects.heatTolerance : 0
  const name = cold ? 'Cold inflow' : heat ? 'Hot, dry inflow' : roll < rule.good ? 'Buoyant inflow' : 'Mixed inflow'
  const airLoss = cold ? .080 : heat ? .072 : roll < rule.good ? .008 : .027
  const geographicLoss = .60 * (1 - support) ** 3
  return { name, trend: -(airLoss * (1 - tolerance) + geographicLoss * (1 - tolerance * .25)) * weakening }
}

function frontConditions(run: Run, time: number) {
  const front = run.front!
  const hazard = hazardFor(activeStorm(run))!
  if (time < 95) return { name: 'Developing cell', trend: .048 + run.effects.hazardGain * .4 }
  if (front.current.zone.sea) return { name: 'Weak maritime inflow', trend: -.10 * (1 - run.effects.hazardBuffer) }
  const epoch = Math.floor(time / 100)
  const hash = Math.imul(run.seed ^ Math.imul(epoch + 1, 374761393) ^ Math.imul(Math.floor(front.point.x / 55), 668265263), 1274126177)
  const roll = ((hash ^ hash >>> 15) >>> 0) / 4294967296
  const difficulty = difficultyRules[run.difficulty]
  if (roll > 1 - difficulty.hostile) return { name: hazard.weather[2], trend: -.135 * (1 - run.effects.hazardBuffer) }
  if (roll < difficulty.good) return { name: hazard.weather[0], trend: hazard.growth * .62 + run.effects.hazardGain }
  return { name: hazard.weather[1], trend: .018 + run.effects.hazardGain * .45 }
}

export function hurricaneCategory(windMph: number) {
  const limits = [157, 130, 111, 96, 74]
  const index = limits.findIndex(limit => windMph >= limit)
  return index >= 0 ? `Category ${5 - index}` : windMph >= 39 ? 'Tropical storm' : 'Tropical depression'
}

export function stormStats(run: Run) {
  if (run.fire) return { windMph: 16, widthKm: Math.round(2 * Math.sqrt(run.fire.areaKm2 / Math.PI)),
    category: run.end ? 'Out' : run.fire.responseAt === null ? 'Growing perimeter' : 'Suppression underway' }
  const fraction = run.strength / 100
  const bonus = run.effects.wind * Math.min(1, fraction * 5)
  if (run.theater.storm === 'Hurricane') {
    const organizedCore = Math.min(1, Math.max(0, (run.strength - 12) / 18))
    const windMph = Math.round(fraction * 162 + run.effects.wind * organizedCore)
    const fading = run.strength <= 12 && conditions(run, run.at).trend < 0
    return { windMph, widthKm: Math.round(90 + run.strength * 3.2 + run.effects.width),
      category: run.end ? 'Dissipated' : fading ? 'Remnant low' : hurricaneCategory(windMph) }
  }
  if (run.theater.storm === 'Tornado') {
    const coupling = Math.min(1, Math.max(0, run.time - 8) / 16)
    const coherence = Math.min(1, run.strength / 22)
    const windMph = Math.round((65 + run.effects.wind * coupling) * coherence)
    const ef = windBand(windMph)
    const widthKm = Math.min(4.2, .04 + coupling * (ef ** 2 * .036 + run.effects.width)) * coherence
    return { windMph, widthKm: Math.round(widthKm * 100) / 100, category: run.end ? 'Dissipated' : run.overWater ? 'Waterspout' : `EF${ef} · On ground` }
  }
  const hazard = hazardFor(activeStorm(run))
  if (hazard) return {
    windMph: Math.round(fraction * hazard.wind + bonus),
    widthKm: Math.round(hazard.width * (.55 + fraction) + run.effects.width),
    category: conditions(run, run.at).name,
  }
  const width = run.blizzardPattern ? blizzardPatterns[run.blizzardPattern].width : 0
  return { windMph: Math.round(fraction * 85 + bonus), widthKm: Math.round(width * (.75 + fraction * .45) + run.effects.width), category: run.end ? 'Dissipated' : run.whiteout ? 'Whiteout' : 'Snow band' }
}

export function forecast(run: Run) {
  const next = run.queued ?? preferredRoute(run, run.to)
  return [...new Set([...footprint(run, run.at), ...footprint(run, run.to), ...footprint(run, next), ...run.pulses.map(pulse => pulse.zone)])]
    .filter(id => run.zones[id].population)
}

export function preferredRoute(run: Run, at: ZoneId) {
  return run.zones[at].neighbors[0]
}

export function footprint(run: Run, center: ZoneId) {
  const fringe = run.effects.fringe + (hazardFor(activeStorm(run))?.fringe ?? 0)
  return [center, ...run.zones[center].neighbors.filter(id => run.zones[id].population).slice(0, fringe)]
}

export const tornadoRadius = (run: Run) => dropRadius(stormStats(run).widthKm)
export const burstRange = (run: Run) => Math.max(25, stormStats(run).widthKm * .55)
export const abilityCost = (run: Run) => {
  const ability = stormAbility(run)
  return ability ? ability.cost - (ability.tornado ? run.effects.tornadoEfficiency : 0) : 0
}

export function setCourse(run: Run, target: MapPoint, funnelId?: number) {
  if (!run.front || run.cyclone || run.end) return false
  const track = funnelId === undefined ? run.front : run.front.funnels.find(funnel => funnel.id === funnelId && isActive(funnel, run.time))
  if (!track || !(funnelId === undefined ? run.effects.courseControl : run.effects.tornadoSteering) || distanceKm(track.point, target) < .2) return false
  track.preference = headingToward(track.point, target)
  return true
}

function abilityTargets(run: Run, reach: number) {
  return [run.at, ...run.zones[run.at].neighbors.slice(0, reach)].filter(id => !run.zones[id].sea)
}

export function hazardAbilityReady(run: Run) {
  const ability = stormAbility(run)
  return !!ability && !run.end && run.charge >= abilityCost(run) &&
    (!!run.front || abilityTargets(run, (ability.reach ?? 0) + run.effects.abilityReach).length > 0)
}

function addPulse(run: Run, zone: ZoneId, seconds: number, damage: number, kind: Pulse['kind']) {
  const old = run.pulses.find(pulse => pulse.zone === zone && pulse.kind === kind)
  if (old) {
    old.until = run.time + seconds
    old.damage = damage
  } else run.pulses.push({ zone, until: run.time + seconds, damage, kind })
}

export function useAbility(run: Run, target?: MapPoint) {
  if (run.end) return
  const ability = stormAbility(run)
  if (ability) {
    if (!hazardAbilityReady(run)) return
    if (run.fire) {
      if (!spotFire(run.fire, run.effects, run.time)) return false
      run.charge -= abilityCost(run)
      log(run, 'Windborne embers start a new spot fire.')
      return true
    }
    if (run.front) {
      if (ability.tornado) {
        const maxEf = run.theater.storm === 'Thunderstorm' && activeStorm(run) !== 'Supercell' ? 2 : 5
        const funnel = createFunnel(run.front, run.seed, run.time, tornadoRadius(run), run.effects, run.strength, ability.seconds, target, maxEf)
        if (!funnel) return
        const where = localityAt(90 - funnel.point.y / 10, funnel.point.x / 10 - 180)
        log(run, `Tornado touches down ${where.reference}.`, true)
      } else {
        if (target && (!run.effects.targetedBurst || distanceKm(run.front.point, target) > burstRange(run) || !landAt(target).code)) return
        const point = target ?? movePoint(run.front.point, run.front.heading, (ability.reach ?? 0) * 11)
        run.front.bursts.push({ point, radius: Math.max(6, stormStats(run).widthKm * .22), until: run.time + ability.seconds + run.effects.burst,
          damage: ability.damage * (1 + run.effects.burstPower) })
        const where = target ? localityAt(90 - point.y / 10, point.x / 10 - 180) : run.front.locality
        log(run, `Severe ${activeStorm(run).toLowerCase()} intensifies ${where.reference}.`, true)
      }
      run.charge -= abilityCost(run)
      return true
    }
    const zones = abilityTargets(run, (ability.reach ?? 0) + run.effects.abilityReach)
    if (!zones.length) return
    run.charge -= abilityCost(run)
    zones.forEach((zone, i) => addPulse(run, zone, ability.seconds + run.effects.burst, ability.damage * (1 + run.effects.burstPower) * (i === 0 ? 1 : .68), 'ability'))
    log(run, `${activeStorm(run)} intensifies ${zoneReference(run.theater, zones[0])}.`, true)
    return
  }
}

export function steer(run: Run, to: ZoneId) {
  if (run.end || !routeOptions(run).includes(to)) return
  if (run.progress === 0) run.to = to
  else run.queued = to
}

export function routeOptions(run: Run) {
  return run.front ? [] : run.zones[run.progress === 0 ? run.at : run.to].neighbors
}

function missingPrerequisite(upgrades: string[], upgrade: Upgrade) {
  return (!!upgrade.requires && !upgrades.includes(upgrade.requires)) ||
    !!upgrade.requiresAll?.some(id => !upgrades.includes(id))
}

export function upgradeLocked(run: Run, upgrade: Upgrade) {
  return missingPrerequisite(run.upgrades, upgrade)
}

const upgradeEconomy = {
  Easy: { increase: 0, refund: .50, decay: .20 },
  Normal: { increase: .5, refund: .35, decay: .35 },
  Hard: { increase: 1, refund: .25, decay: .50 },
  Expert: { increase: 2, refund: 0, decay: 0 },
}

export function upgradeCost(run: Run, upgrade: Upgrade) {
  return upgrade.cost + Math.floor(run.purchases * upgradeEconomy[run.difficulty].increase)
}

export function upgradeRefund(run: Run, id: string) {
  const policy = upgradeEconomy[run.difficulty]
  return Math.floor((run.upgradePayments.get(id) ?? 0) * policy.refund / (1 + run.refunds * policy.decay))
}

export function canRemoveUpgrade(run: Run, id: string) {
  if (run.end || !run.upgrades.includes(id)) return false
  const remaining = run.upgrades.filter(installed => installed !== id)
  return !trees[run.theater.storm].some(item => remaining.includes(item.id) && missingPrerequisite(remaining, item))
}

function applyUpgradeEffects(run: Run, upgrade: Upgrade) {
  for (const [key, amount] of Object.entries(upgrade.effects)) run.effects[key as keyof Effects] += amount
}

export function removeUpgrade(run: Run, id: string) {
  if (!canRemoveUpgrade(run, id)) return false
  run.momentum += upgradeRefund(run, id)
  run.refunds++
  run.upgradePayments.delete(id)
  run.upgrades = run.upgrades.filter(installed => installed !== id)
  run.effects = { ...baseEffects }
  for (const item of trees[run.theater.storm]) if (run.upgrades.includes(item.id)) applyUpgradeEffects(run, item)
  if (run.front && !run.effects.courseControl) run.front.preference = null
  if (run.front && !run.effects.tornadoSteering) {
    for (const funnel of run.front.funnels) funnel.preference = null
  }
  return true
}

export function buyUpgrade(run: Run, id: string) {
  const upgrade = trees[run.theater.storm].find(item => item.id === id)
  if (!upgrade || run.end || run.upgrades.includes(id) || upgradeLocked(run, upgrade)) return false
  const cost = upgradeCost(run, upgrade)
  if (run.momentum < cost) return false
  run.momentum -= cost
  run.upgradePayments.set(id, cost)
  run.purchases++
  run.upgrades.push(id)
  const before = activeStorm(run)
  applyUpgradeEffects(run, upgrade)
  if (activeStorm(run) !== before) log(run, `Thunderstorm reorganizes as a ${stormOrganization(run).toLowerCase()} ${run.front!.locality.reference}.`, true)
  return true
}

function damageMomentum(credit: number) {
  return Math.min(32, Math.floor(Math.sqrt(credit / 125_000_000)))
}

export function trackPoints(run: Run) {
  return [...run.track.map(id => run.zones[id]), run.zones[run.to], run.zones[run.queued ?? preferredRoute(run, run.to)]]
}

export function position(run: Run) {
  return run.front?.point ?? alongTrack(trackPoints(run), run.track.length - 1, run.progress / leg)
}

function log(run: Run, message: string, breaking = false, snowfall?: SnowReport) {
  run.events.unshift({ time: run.time, text: message, breaking, snowfall })
  if (run.events.length > 12) run.events.splice(run.tornado ? -2 : -1, 1)
}

function updateWarnings(run: Run) {
  const hazard = hazardFor(activeStorm(run))
  if (run.detectedAt === null) {
    const { x, y } = position(run)
    const nearTown = ids.some(id => run.zones[id].population >= (hazard ? 5000 : 1) && Math.hypot(x - run.zones[id].x, y - run.zones[id].y) < 6)
    if (!nearTown && !run.pulses.some(pulse => pulse.kind === 'ability') && run.strength + run.effects.wind * .4 + run.effects.fringe * 3 < 52) return
    run.detectedAt = run.time
    log(run, hazard
      ? nearTown ? 'Hazard spotted near a settlement.' : 'Hazard detected as its impact grew.'
      : nearTown ? 'Storm spotted near a settlement.' : 'Storm detected as circulation expanded.')
  }
  const threatened = new Set(forecast(run))
  for (const id of ids) {
    updateSiteWarning(run, run.zones[id], run.sites[id], threatened.has(id), hazard?.warning)
  }
}

function updateSiteWarning(run: Run, zone: Zone, site: Site, threatened: boolean, warning = 'shelter warning') {
    const living = zone.population - site.deaths
    if (threatened) {
      site.threatAt ??= run.time
      if (site.warnedAt === null) {
        if (run.time - site.threatAt < run.effects.warningDelay * (1 - (run.tornado?.awareness ?? 0) * .7)) return
        site.warnedAt = run.time
        site.clearedAt = null
        if (!site.reportedWarning) {
          site.reportedWarning = true
          if (!run.tornado && !run.snow && (!run.front || zone.population >= 600)) {
            const place = run.front ? localityAt(90 - zone.y / 10, zone.x / 10 - 180) : null
            const where = place?.reference ?? `in ${zone.name}`
            const locality = place?.city ?? zone.name
            if (!run.alertHeadlines.has(locality)) {
              run.alertHeadlines.add(locality)
              const headline = warning === 'shelter warning' ? 'Shelter-in-place order issued' : `${warning[0].toUpperCase()}${warning.slice(1)} issued`
              log(run, `${headline} ${where}.`)
            }
          }
        }
      }
      const outage = site.outageUntil > run.time ? run.effects.broadcast : 0
      const awareness = run.tornado?.awareness ?? 0
      const baseline = difficultyRules[run.difficulty].shelter
      const uptake = (baseline + (1 - baseline) * awareness * .92) * (1 - run.effects.panic)
      const elapsed = Math.max(0, run.time - site.warnedAt - 14 * (1 - awareness)) * (1 - outage)
      const target = Math.floor(living * uptake * Math.min(1, elapsed / (leg * (1 - awareness * .90) + run.effects.gridlock)))
      site.sheltered = Math.min(living, Math.max(target, site.sheltered))
    } else {
      site.threatAt = null
      if (site.warnedAt !== null) {
        site.warnedAt = null
        site.clearedAt = run.time
      }
      if (site.clearedAt !== null && run.time - site.clearedAt > leg) {
        site.sheltered = Math.max(0, site.sheltered - Math.ceil(living / leg))
      }
    }
}

function impactWind(run: Run) {
  const storm = activeStorm(run)
  const wind = stormStats(run).windMph
  if (storm === 'Tornado' || storm === 'Hurricane') return wind
  if (run.theater.storm === 'Thunderstorm') return wind
  if (run.front) return wind + run.effects.hazardDamage * 35
  // Convert non-wind hazards to severity bands for the shared exposure model.
  return Math.max(wind, 55 + run.strength * 1.02)
}

function impact(run: Run, id: ZoneId, intensity: number, rain = 0, wind = impactWind(run)) {
  applyImpact(run, run.zones[id], run.sites[id], intensity * 5, wind, rain)
}

function applyImpact(run: Run, zone: Zone, site: Site, share: number, wind: number, rain = 0, funnel = false, propertyOnly = false) {
  if (!zone.population || !zone.assets || share <= 0) return 0
  share = Math.min(1, share)
  const effects = run.effects
  const living = zone.population - site.deaths
  const outage = site.outageUntil > run.time
  const overload = site.loss >= zone.assets * .2 ? effects.overload : 0
  const breach = funnel && wind >= 111 ? effects.shelterBreach : 0
  const protectedShare = living ? Math.min(1, site.sheltered / living) * (1 - Math.min(.65, breach + (outage ? effects.power : 0))) : 0
  const preparedness = difficultyRules[run.difficulty].shelter
  const leadMinutes = site.warnedAt === null || !preparedness ? 0 : (run.time - site.warnedAt) / 60
  const rate = fatalityRate(wind, protectedShare, leadMinutes, preparedness)
  const casualtyRate = share * rate * (1 + overload + effects.panic)
  const loss = Math.min(zone.assets - site.loss, Math.floor(zone.housing * share * lossPerHome(wind, funnel) * (1 + rain + (propertyOnly ? 0 : effects.gust) + (outage ? effects.supply : 0))))
  site.loss += loss
  if (loss > 0 && usesTornadoEconomy(run.theater.storm)) {
    const densityBonus = Math.min(6, 1 + zone.population / zone.area / 220)
    const before = damageMomentum(run.impactCredit)
    run.impactCredit += loss * densityBonus
    const after = damageMomentum(run.impactCredit)
    if (after > before) gainMomentum(run, after - before)
  }
  if (propertyOnly) return loss
  if (loss > 0 && effects.outageTime && (run.theater.storm !== 'Tornado' || wind >= 86)) {
    site.outageUntil = run.time + effects.outageTime
    if (!outage) log(run, `Power outage in ${zone.name}.`)
  }
  const expected = living * casualtyRate + site.carry
  const deaths = Math.min(living, Math.floor(expected))
  site.carry = expected - deaths
  site.deaths += deaths
  if (run.tornado) run.tornado.deaths += deaths
  const surviving = living - deaths
  site.sheltered = Math.min(surviving, site.sheltered)
  site.injured = Math.min(surviving, site.injured - (living ? Math.floor(site.injured * deaths / living) : 0))
  const uninjured = surviving - site.injured
  const injuries = uninjured * casualtyRate * injuryToFatality + site.injuryCarry
  const newInjuries = Math.min(uninjured, Math.floor(injuries))
  site.injured += newInjuries
  site.injuryCarry = injuries - newInjuries
  return loss
}

function sampledAreas(front: Front, center: MapPoint, radius: number) {
  const areas = new Set<ImpactArea>([frontArea(front.areas, center)])
  for (let i = 0; i < 8; i++) areas.add(frontArea(front.areas, movePoint(center, i * Math.PI / 4, radius)))
  return areas
}

export function frontSpeed(run: Run) {
  if (run.fire) return 0
  return run.cyclone ? cycloneSpeed(run.front!.point) : run.tornado ? Math.max(.23 * (1 + run.effects.tornadoSpeed), (180 + run.effects.tornadoRange) / 960) : run.blizzardPattern ? travelRate(run) : 1.15 * travelRate(run)
}

function moveFront(run: Run, front: Front, speed = frontSpeed(run)) {
  advanceFront(front, speed, run.time, run.effects.trackStability)
  const current = frontArea(front.areas, front.point)
  if (current !== front.current) {
    front.current = current
    front.locality = localityAt(90 - front.point.y / 10, front.point.x / 10 - 180)
  }
}

function updateFrontWarnings(run: Run, front: Front, threatened: Set<ImpactArea>, spotted: boolean) {
  if (run.detectedAt === null && spotted) {
    run.detectedAt = run.time
    log(run, 'Severe weather detected. Local alerts are being issued.', true)
  }
  if (run.detectedAt === null) return
  for (const area of front.areas.values()) {
    if (area.zone.population && (threatened.has(area) || area.site.threatAt !== null || area.site.sheltered > 0)) {
      updateSiteWarning(run, area.zone, area.site, threatened.has(area))
    }
  }
}

const greatLakes = new Set(['Lake Superior', 'Lake Michigan', 'Lake Huron', 'Lake Erie', 'Lake Ontario'])

function tickBlizzard(run: Run, front: Front, patternName: BlizzardPattern) {
  const snow = run.snow!
  const next = blizzardTrack(front.point, patternName, front.phase, run.time - 1, 1, run.effects, snow.steering)
  front.point = next.point
  front.heading = next.heading
  if (run.time % 5 === 0) front.path.push(front.point)
  const surface = landAt(front.point)
  const area = frontArea(front.areas, front.point, surface)
  if (area !== front.current) {
    front.current = area
    front.locality = localityAt(latitudeAt(front.point), longitudeAt(front.point), surface)
  }

  const pattern = blizzardPatterns[patternName]
  const latitude = Math.abs(latitudeAt(front.point))
  const cold = Math.max(0, Math.min(1, (latitude - 25) / 12 + run.effects.coldTolerance))
  const lake = !surface.code && surface.name !== 'Open water'
  const water = !surface.code && cold > .3
  if (water) {
    const uptake = lake ? .88 + run.effects.lakeMoisture : .66 + run.effects.oceanMoisture
    snow.waterMoisture = Math.min(100, snow.waterMoisture + uptake * cold)
    if (snow.waterMoisture >= 12) snow.source = lake ? surface.name : 'ocean'
  } else {
    snow.waterMoisture = Math.max(0, snow.waterMoisture - .62 / (1 + run.effects.snowRetention))
    if (snow.waterMoisture < 6) snow.source = null
  }
  const clipper = patternName === 'Alberta Clipper'
  const lakeFeed = clipper && water && greatLakes.has(surface.name)
    ? run.effects.lakeMoisture * cold * Math.min(1, snow.waterMoisture / 20) : 0
  const coastal = patternName === "Nor'easter"
  // Coastal inflow buys time on the way north, then tapers as the storm enters the North Atlantic.
  const coastalSupport = coastal && water && !lake
    ? .03 * Math.min(1, snow.waterMoisture / 50) * Math.max(0, Math.min(1, (48 - latitude) / 4)) : 0
  const atlanticFade = coastal ? Math.min(.20, Math.max(0, latitude - 44) * .035) : 0
  const weather = conditions(run, run.at)
  const priorStrength = run.strength
  develop(run, weather.trend + lakeFeed * .85 - atlanticFade, lakeFeed * .55 + coastalSupport,
    clipper ? run.effects.endurance * .28 : coastal ? .5 : 0)
  const lakeHeadline = `clipper-recovery-${surface.name}`
  if (lakeFeed > .08 && run.strength > priorStrength && !run.alertHeadlines.has(lakeHeadline)) {
    run.alertHeadlines.add(lakeHeadline)
    log(run, `Alberta Clipper rebuilds over ${surface.name} as lake moisture feeds the storm.`, true)
  }
  const moisture = Math.min(100, Math.max(0, run.charge + (.13 + pattern.snow + run.effects.snowGain * .35) * cold
    - (water ? 0 : .31 * snow.rate)))
  run.charge = moisture
  const strength = run.strength / 100
  snow.rate = cold * strength * (.27 + moisture * .006 + snow.waterMoisture * .013) * (1 + run.effects.snowRate)
  const { windMph, widthKm } = stormStats(run)
  const groundSnow = snow.deposits.get(area)?.cm ?? 0
  const blowing = Math.min(.95, groundSnow * .021) * (1 + run.effects.drift) * cold
  const obscuration = (snow.rate + blowing) * Math.max(0, windMph - 21) / 22
  snow.visibilityMiles = Math.min(10, 10 / (1 + 46 * obscuration ** 2))
  run.whiteout = !surface.code || windMph < 35 || snow.visibilityMiles >= .25 ? 0 : run.whiteout + 1
  snow.longestWhiteout = Math.max(snow.longestWhiteout, run.whiteout)
  if (run.whiteout === 1 && !run.alertHeadlines.has('blizzard-whiteout')) {
    run.alertHeadlines.add('blizzard-whiteout')
    log(run, `Whiteout reported ${front.locality.reference}.`, true)
  }

  if (run.time % 4 === 0 && snow.rate > .025) {
    const lakeBand = snow.source !== null && snow.source !== 'ocean'
    const radius = widthKm * (lakeBand ? .28 : .46)
    const samples = new Map<ImpactArea, number>()
    const along = snow.source ? 18 : 12
    const slices = Math.max(2, Math.ceil(radius / (kmPerX(front.point.y) * .88)))
    for (const longitudinal of [-1, -.5, 0, .5, 1]) {
      const center = movePoint(front.point, front.heading, longitudinal * along)
      for (let offset = -slices; offset <= slices; offset++) {
        const lateral = offset / slices
        const point = movePoint(center, front.heading + Math.PI / 2, lateral * radius)
        const affected = frontArea(front.areas, point)
        if (affected.zone.sea) continue
        const weight = (1 - .62 * Math.abs(lateral)) * (1 - .34 * Math.abs(longitudinal))
        samples.set(affected, Math.max(samples.get(affected) ?? 0, weight))
      }
    }
    updateFrontWarnings(run, front, new Set(samples.keys()), snow.rate > .15)
    for (const [affected, weight] of samples) {
      const { zone, site, country } = affected
      const previous = snow.deposits.get(affected)
      const cm = (previous?.cm ?? 0) + snow.rate * weight * 4
      const place = previous?.place ?? snowfallPlace(zone, country)
      snow.deposits.set(affected, { cm, place })
      const intensity = snow.rate * weight * (.006 + (run.whiteout ? .004 : 0) + Math.min(.004, cm * .00007))
      const impactWind = Math.max(windMph, 54 + Math.min(55, cm * 1.3))
      applyImpact(run, zone, site, intensity, impactWind, Math.min(.45, cm * .005 * (1 + run.effects.drift)))
      if (zone.population >= 600) reportSnowfall(run, place, cm)
    }
  }
  if (run.strength <= 0) run.end = 'The snow band dissipated.'
}

function snowfallPlace(zone: Zone, country: string | undefined) {
  const lat = latitudeAt(zone)
  const lon = longitudeAt(zone)
  const city = country ? nearbyCity(lat, lon, country, undefined, 26) : undefined
  return city ? escapeName(city.name) : localityAt(lat, lon).name
}

function reportSnowfall(run: Run, place: string, cm: number) {
  const milestone = [100, 70, 45, 30, 15, 5].find(depth => cm >= depth)
  if (!milestone) return
  const key = `snow-${place}-${milestone}`
  if (run.alertHeadlines.has(key)) return
  run.alertHeadlines.add(key)
  const source = run.snow!.source
  const text = source === 'ocean' ? 'as an ocean-fed snow band passes.'
    : source ? `as lake-effect snow streams off ${escapeName(source)}.` : 'as the snow band moves through.'
  log(run, text, milestone >= 15, { place, cm })
}

function tickTornado(run: Run, front: Front) {
  const previous = front.point
  const record = run.tornado!
  const limit = tornadoLimits(run)
  moveFront(run, front, Math.min(frontSpeed(run), Math.max(0, limit.km - record.travelKm)))
  record.travelKm += distanceKm(previous, front.point)
  const wasWater = run.overWater
  run.overWater = front.current.zone.sea
  if (wasWater && !run.overWater && run.name === 'Waterspout') {
    const locality = localityAt(latitudeAt(front.point), longitudeAt(front.point))
    run.name = tornadoName(closestTornadoCity(front.point))
    log(run, `Waterspout moves ashore ${locality.reference} · ${run.name}.`, true)
  }
  const weather = conditions(run, run.at)
  const support = tornadoSupportAt(front.point) * (run.overWater ? .68 : 1)
  const exposure = (1 - support) ** 2
  const difficulty = (1 - difficultyRules[run.difficulty].good) * .024
  const draw = (.153 + exposure * .34 + difficulty) / (1 + run.effects.endurance * .67)
  run.support = Math.max(0, run.support - draw)
  const exhausted = Math.max(0, 1 - run.support / 24) * .52
  run.strength = Math.max(0, run.strength + weather.trend - exhausted)
  const ahead = movePoint(front.point, front.heading, 15 + record.awareness * 35)
  const threatened = new Set([front.current, ...sampledAreas(front, ahead, record.awareness * 10)])
  const { windMph, widthKm } = stormStats(run)
  const concealment = Math.min(.85, run.effects.rainWrap * .53)
  const visibility = (Math.max(0, windMph - 85) / 150 + widthKm * .48
    + Math.min(.3, front.current.zone.population / 16_000)) * (1 - concealment)
  record.awareness = Math.min(1, record.awareness + Math.max(0, visibility - .11) * .023)
  const spotted = record.awareness >= .14 || front.current.zone.population >= 600 / (1 - concealment)
  if (!run.overWater && spotted && run.detectedAt === null) {
    run.detectedAt = run.time
    log(run, 'Weather station confirms a tornado on the ground.', true)
  }
  if (run.effects.satelliteChance && run.realTime >= record.nextSatellite) {
    record.nextSatellite = run.realTime + 70_000
    if (!run.overWater && random(run.seed ^ run.time ^ 0x7115)() < run.effects.satelliteChance) spawnSatellite(run)
  }
  const satellites = advanceTrackedFunnels(run, front, threatened)
  updateFrontWarnings(run, front, threatened, false)
  for (const { funnel, distance } of satellites) {
    applyTornadoSweep(run, front, funnel.point, funnel.heading, distance, funnel.width, funnel.wind)
  }
  record.maxWidthKm = Math.max(record.maxWidthKm, widthKm)
  const ground = groundSegment(previous, front.point, wasWater, run.overWater)
  if (ground && widthKm && windMph >= 65) {
    const [from, to, fraction] = ground
    const distance = distanceKm(from, to)
    record.lengthKm += distance
    record.groundTicks += fraction
    record.peakEf = Math.max(record.peakEf ?? 0, windBand(windMph))
    markSwath(front.swath, from, to, windMph, widthKm)
    const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
    applyTornadoSweep(run, front, middle, front.heading, distance, widthKm, windMph)
  }
  const force = Math.min(1, run.strength / 22)
  if (run.effects.hail && run.time % 4 === 0) {
    for (const { zone, site, country } of sampledAreas(front, front.point, run.effects.hailRadius)) {
      if (applyImpact(run, zone, site, .011 * run.effects.hail * force, 75, 0, false, true) && country) {
        noteTornadoPlaces(record, front.point, country, run.effects.hailRadius)
      }
    }
  }
  if (!run.overWater && run.effects.floodPower && run.time % 4 === 0) {
    front.floods.set(front.current, run.time + 36 + run.effects.floodLife)
  }
  for (const [area, until] of front.floods) {
    if (until < run.time) front.floods.delete(area)
    else if (applyImpact(run, area.zone, area.site, .003 * run.effects.floodPower, 70, .55, false, true) && area === front.current && area.country) {
      noteTornadoPlaces(record, front.point, area.country, 0)
    }
  }
  tornadoHeadlines(run, front, windMph, widthKm)
  if (run.time >= limit.ticks || record.travelKm >= limit.km - 1e-6) {
    run.end = 'The tornado dissipated.'
  }
  finishMovingStorm(run)
}

function tornadoHeadlines(run: Run, front: Front, wind: number, width: number) {
  const record = run.tornado!
  if (run.overWater) return
  if (run.detectedAt !== null && wind >= 86 && front.current.country) {
    const radius = 3 + width * .5 + record.awareness * 5
    const city = nearbyCity(latitudeAt(front.point), longitudeAt(front.point), front.current.country, undefined, radius)
    if (city && city.population >= 3_000 && !run.alertHeadlines.has(city.name)) {
      run.alertHeadlines.add(city.name)
      log(run, `${escapeName(city.name)} residents ordered to shelter as ${wind >= 166 ? 'a violent' : 'a'} tornado passes nearby.`, true)
    }
  }
  if (wind >= 166 && record.chaserExposure >= 0) {
    record.chaserExposure++
    if (record.chaserExposure >= 45 || random(run.seed ^ run.time ^ 0x843)() < .025) {
      record.chaserExposure = -1
      log(run, 'Popular storm chasers killed by violent tornado.', true)
    }
  }
  for (const threshold of [25, 100, 500]) {
    const key = `tornado-casualties-${threshold}`
    if (record.deaths < threshold || run.alertHeadlines.has(key)) continue
    run.alertHeadlines.add(key)
    record.awareness = Math.min(1, record.awareness + (threshold === 25 ? .35 : .5))
    run.detectedAt ??= run.time
    log(run, `${threshold} deaths confirmed. Officials urge everyone in the tornado’s path to shelter in place.`, true)
  }
}

function groundSegment(from: MapPoint, to: MapPoint, fromWater: boolean, toWater: boolean): [MapPoint, MapPoint, number] | undefined {
  if (fromWater && toWater) return
  if (!fromWater && !toWater) return [from, to, 1]
  const at = (fraction: number) => ({ x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction })
  let low = 0
  let high = 1
  for (let i = 0; i < 7; i++) {
    const middle = (low + high) / 2
    const water = !landAt(at(middle)).code
    if (water === fromWater) low = middle
    else high = middle
  }
  return fromWater ? [at(high), to, 1 - high] : [from, at(low), low]
}

function noteTornadoPlaces(record: TornadoRecord, point: MapPoint, country: string, radius: number) {
  for (const city of affectedCities(point.x, point.y, country, radius)) record.places.add(city)
}

function applyTornadoSweep(run: Run, front: Front, point: MapPoint, heading: number, distance: number, width: number, wind: number, multiplier = 1, rain = 0) {
  for (const strip of tornadoStrips(wind, width)) {
    const center = strip.offset === 0 ? point : movePoint(point, heading + Math.PI / 2, strip.offset)
    const { zone, site, country } = frontArea(front.areas, center)
    const loss = applyImpact(run, zone, site, sweptShare(distance, strip.width, zone.area) * multiplier, strip.wind, rain, true)
    if (loss && run.tornado && country) noteTornadoPlaces(run.tornado, center, country, strip.width / 2)
  }
}

function advanceTrackedFunnels(run: Run, front: Front, threatened: Set<ImpactArea>) {
  const funnels = front.funnels.filter(funnel => isActive(funnel, run.time - 1))
  const sweeps = []
  for (const funnel of funnels) {
    const previous = funnel.point
    advanceFunnel(funnel, run.time)
    const area = frontArea(front.areas, funnel.point)
    threatened.add(area)
    if (landAt(funnel.point).code) {
      if (landAt(previous).code) markSwath(funnel.swath, previous, funnel.point, funnel.wind, funnel.width)
      sweeps.push({ funnel, distance: distanceKm(previous, funnel.point) })
    }
  }
  return sweeps
}

function tickFront(run: Run, front: Front, hazard: NonNullable<ReturnType<typeof hazardFor>>) {
  moveFront(run, front)
  const weather = frontConditions(run, run.time)
  const thunderstorm = run.theater.storm === 'Thunderstorm'
  const trend = thunderstorm && weather.trend < 0 ? weather.trend * .8 : weather.trend
  develop(run, trend, 0, thunderstorm ? .38 : 0)
  run.charge = Math.max(0, Math.min(100, run.charge + hazard.recharge + weather.trend * 1.8 + run.effects.chargeGain))
  const width = stormStats(run).widthKm
  const core = sampledAreas(front, front.point, width * .28)
  const form = activeStorm(run)
  if (run.theater.storm === 'Thunderstorm') {
    if (form === 'Squall') {
      for (const side of [-1, 1]) {
        const gustFront = movePoint(front.point, front.heading + side * Math.PI / 2, width * .36)
        for (const area of sampledAreas(front, gustFront, width * .12)) core.add(area)
      }
    } else if (form === 'Multicell') {
      const phase = Math.sin(run.time / 19 + front.phase)
      const daughter = movePoint(front.point, front.heading + phase * .9, width * (.34 + phase * .07))
      for (const area of sampledAreas(front, daughter, width * .17)) core.add(area)
    }
  }
  const ahead = movePoint(front.point, front.heading, 20)
  const threatened = sampledAreas(front, ahead, width * .35)
  const sweeps = advanceTrackedFunnels(run, front, threatened)
  for (const area of core) threatened.add(area)
  for (const area of front.floods.keys()) threatened.add(area)
  front.bursts = front.bursts.filter(burst => burst.until >= run.time)
  const bursts = front.bursts.map(burst => ({ burst, areas: sampledAreas(front, burst.point, burst.radius) }))
  for (const { areas } of bursts) for (const area of areas) threatened.add(area)
  updateFrontWarnings(run, front, threatened, run.strength > 31 || front.funnels.some(funnel => isActive(funnel, run.time - 1)) || front.current.zone.population >= 1800)
  const force = (run.strength / 100) ** 2
  const developed = Math.max(0, (run.strength - 30) / 70)
  const passive = hazard.passive * force * (1 + run.effects.hazardDamage) * (.06 + developed * .8)
  const wind = impactWind(run)
  for (const { zone, site } of core) applyImpact(run, zone, site, passive * 5, wind)
  if (run.theater.storm === 'Thunderstorm') thunderstormImpacts(run, front, force)
  for (const { funnel, distance } of sweeps) {
    applyTornadoSweep(run, front, funnel.point, funnel.heading, distance, funnel.width, funnel.wind, 1, run.effects.burstPower)
  }
  for (const { burst, areas } of bursts) {
    for (const { zone, site } of areas) {
      applyImpact(run, zone, site, burst.damage * force * 1.9, wind)
    }
  }
  if (run.effects.floodPower && run.time % 8 === 0) {
    for (const area of core) if (!area.zone.sea) front.floods.set(area, run.time + 32 + run.effects.floodLife)
  }
  for (const [area, until] of front.floods) {
    if (until < run.time) front.floods.delete(area)
    else applyImpact(run, area.zone, area.site, .00275 * run.effects.floodPower * force, 55 + run.strength * .85 + run.effects.floodPower * 15, .42)
  }
  finishMovingStorm(run)
}

function thunderstormImpacts(run: Run, front: Front, force: number) {
  const { hail, hailRadius, lightning, lightningOutage } = run.effects
  if (hail && run.time % 4 === 0) {
    for (const { zone, site } of sampledAreas(front, front.point, hailRadius)) {
      applyImpact(run, zone, site, .008 * hail * force, 75, 0, false, true)
    }
  }
  if (!lightning || run.time % 8 !== 0) return
  const roll = random(run.seed ^ Math.imul(run.time, 0x45d9f3b))
  if (roll() >= lightning * Math.sqrt(force)) return
  const point = movePoint(front.point, roll() * Math.PI * 2, roll() * 18)
  const { zone, site } = frontArea(front.areas, point)
  if (applyImpact(run, zone, site, .009 * force, 72, 0, false, true)) {
    if (lightningOutage) site.outageUntil = Math.max(site.outageUntil, run.time + lightningOutage)
    if (!run.alertHeadlines.has('ground-strike')) {
      run.alertHeadlines.add('ground-strike')
      log(run, `Ground lightning strike reported ${localityAt(latitudeAt(point), longitudeAt(point)).reference}.`)
    }
  }
}

function finishMovingStorm(run: Run) {
  if (run.strength <= 0) run.end = 'The storm dissipated.'
}

function develop(run: Run, trend: number, supportGain = 0, extraEndurance = 0) {
  // Inflow, moisture or fuel is depleted at a rate that depends on conditions and intensity.
  const draw = .069 + run.strength * .00028 + Math.max(0, -trend) * .18
  run.support = Math.min(100, Math.max(0, run.support + supportGain - draw / (1 + run.effects.endurance + extraEndurance)))
  const exhausted = Math.max(0, 1 - run.support / 33) * .49
  run.strength = Math.min(100, Math.max(0, run.strength + trend - exhausted))
}

function tickCyclone(run: Run, front: Front, cyclone: Cyclone) {
  const previous = front.point
  const next = cycloneTrack(cyclone, previous, front.heading, 1)
  front.point = next.point
  front.heading = next.heading
  if (run.time % 5 === 0) front.path.push(front.point)
  const distance = distanceKm(previous, next.point)
  const surface = landAt(front.point)
  const wasOcean = cyclone.ocean
  cyclone.ocean = !surface.code && surface.name === 'Open water'
  cyclone.oceanKm = cyclone.ocean ? cyclone.oceanKm + distance : 0
  cyclone.inlandKm = cyclone.ocean ? 0 : cyclone.inlandKm + distance
  const current = frontArea(front.areas, front.point, surface)
  const landfall = wasOcean && !!surface.code
  const returnedToOcean = !wasOcean && cyclone.ocean
  if (current !== front.current || wasOcean !== cyclone.ocean) {
    front.current = current
    front.locality = localityAt(latitudeAt(front.point), longitudeAt(front.point), surface)
  }
  const weather = conditions(run, run.at)
  run.strength = Math.max(0, Math.min(100, run.strength + weather.trend))
  const stats = stormStats(run)
  cyclone.peakWind = Math.max(cyclone.peakWind, stats.windMph)
  cyclone.radarAngle = (cyclone.radarAngle + radarSpin(cyclone, stats.windMph)) % 360
  if (run.strength <= 7) run.end = `${run.name || 'The cyclone'} dissipated.`
  const category = run.end ? 'Dissipated' : stats.category
  const change = category !== cyclone.stage
  if (landfall || returnedToOcean || change || weather.name !== cyclone.environment) {
    const reason = landfall ? 'Landfall · ocean heat supply cut off'
      : returnedToOcean ? `Returned to open water · ${weather.name.toLowerCase()}` : weather.name
    cyclone.history.push({ time: run.time, category, wind: stats.windMph, reason, location: front.locality.name })
    if (landfall) log(run, `${run.name || 'The storm'} makes landfall ${front.locality.reference}.`, true)
    else if (returnedToOcean && weather.trend > 0) log(run, `${run.name || 'The storm'} starts rebuilding over warm water.`, true)
    else if (change && run.name) log(run, run.end ?? `${run.name} is now a ${category.toLowerCase()} ${front.locality.reference}.`)
    cyclone.stage = category
    cyclone.environment = weather.name
  }
  const core = sampledAreas(front, front.point, stats.widthKm * .31)
  const fringe = sampledAreas(front, movePoint(front.point, front.heading + run.time * .59, stats.widthKm * .24), stats.widthKm * .20)
  const threatened = new Set([...core, ...fringe])
  updateFrontWarnings(run, front, threatened, stats.windMph >= 66 || [...core].some(area => area.zone.population > 800))
  if (run.end) return
  const intensity = (stats.windMph / 155) ** 2 * .018
  for (const { zone, site } of core) applyImpact(run, zone, site, intensity, stats.windMph, run.effects.rain)
  for (const area of fringe) if (!core.has(area)) {
    applyImpact(run, area.zone, area.site, intensity * (.22 + run.effects.fringe * .13), stats.windMph, run.effects.rain)
  }
  if (run.effects.rainTrail) {
    const tail = frontArea(front.areas, movePoint(front.point, front.heading + Math.PI, stats.widthKm * .34))
    if (!threatened.has(tail)) applyImpact(run, tail.zone, tail.site, intensity * run.effects.rainTrail, stats.windMph, run.effects.rain)
  }
  if (landfall && run.effects.surge) {
    const targets = [...sampledAreas(front, front.point, stats.widthKm * .13)].filter(area => !area.zone.sea)
    for (const { zone, site } of targets.slice(0, 3 + run.effects.surgeFringe * 3)) {
      applyImpact(run, zone, site, run.effects.surge * (stats.windMph / 155), Math.max(111, stats.windMph), .5)
    }
    log(run, `Storm surge reported ${front.locality.reference}.`)
  }
}

function tickWildfire(run: Run, front: Front, fire: Wildfire) {
  run.charge = Math.min(100, run.charge + .44 + run.effects.chargeGain)
  if (run.time % 4 !== 0) return
  const resistance = { Easy: .73, Normal: 1, Hard: 1.23, Expert: 1.44 }[run.difficulty]
  if (fire.responseAt === null && run.time >= 36 / resistance + run.effects.fireDelay) {
    fire.responseAt = run.time
    log(run, 'Fire crews deploy and begin building containment lines.', true)
  }
  if (fire.responseAt !== null && !fire.aircraft && run.time >= fire.responseAt + 40 / resistance) {
    fire.aircraft = true
    log(run, 'Aircraft begin dropping retardant along the fire perimeter.', true)
  }
  const active = advanceWildfire(fire, run.effects, run.time, resistance)
  run.strength = 100 * active.reduce((peak, cell) => Math.max(peak, cell.heat), 0)
  const threatened = new Set<ImpactArea>()
  for (const cell of active) threatened.add(frontArea(front.areas, cell.point))
  updateFrontWarnings(run, front, threatened, fire.responseAt !== null)
  for (const cell of active) {
    const { zone, site } = frontArea(front.areas, cell.point)
    applyImpact(run, zone, site, .005 * cell.heat ** 2 * (1 + run.effects.hazardDamage), 55 + cell.heat * 86)
  }
  if (!fire.active) run.end = fire.containment >= .6 ? 'Crews contained the fire.' : 'The fire burned out.'
}

export function travelRate(run: Run) {
  if (run.blizzardPattern) return blizzardPatterns[run.blizzardPattern].speed * (1 + run.effects.spread)
  const hazard = hazardFor(activeStorm(run))
  if (!hazard) return 1
  return hazard.speed * (1 + run.effects.spread)
}

export function tick(run: Run) {
  if (run.end) return
  run.time++
  const storm = activeStorm(run)
  const hazard = hazardFor(storm)
  const award = run.momentumSchedule.awards.find(item => item.time === run.time)
  if (award) gainMomentum(run, award.points)
  if (run.pickup && run.time >= run.pickup.expires) run.pickup = null
  run.pickup ??= run.momentumSchedule.pickups.find(item => item.time === run.time) ?? null
  if (run.fire && run.front) return tickWildfire(run, run.front, run.fire)
  if (run.front && run.blizzardPattern) return tickBlizzard(run, run.front, run.blizzardPattern)
  if (run.front) return run.cyclone ? tickCyclone(run, run.front, run.cyclone) : hazard ? tickFront(run, run.front, hazard) : tickTornado(run, run.front)
  run.pulses = run.pulses.filter(pulse => pulse.until >= run.time)
  run.progress += travelRate(run)
  if (run.progress >= leg) {
    if (hazard?.trail && !run.zones[run.at].sea) addPulse(run, run.at, hazard.trail + run.effects.persistence, hazard.passive * .46, 'trail')
    run.at = run.to
    run.track.push(run.at)
    run.to = run.queued ?? preferredRoute(run, run.at)
    run.queued = null
    run.progress = 0
  }
  const environment = conditions(run, run.at)
  develop(run, environment.trend)
  if (hazard) {
    run.charge = Math.max(0, Math.min(100, run.charge + hazard.recharge + environment.trend * 1.8 + run.effects.chargeGain))
  }
  updateWarnings(run)
  if (hazard) {
    const strength = (run.strength / 100) ** 2
    const intensity = hazard.passive * strength * (1 + run.effects.hazardDamage)
    for (const id of footprint(run, run.at)) impact(run, id, intensity * (id === run.at ? 1 : .38))
    for (const pulse of run.pulses) impact(run, pulse.zone, pulse.damage * strength)
  }
  if (run.strength === 0) run.end = storm === 'Heat Dome' ? 'The heat dome broke.' : 'The storm dissipated.'
}

export function totals(run: Run) {
  const sites = run.front ? [...run.front.areas.values()].map(area => area.site) : Object.values(run.sites)
  const damage = sites.reduce((total, site) => total + site.loss, 0)
  return { deaths: sites.reduce((total, site) => total + site.deaths, 0), damage }
}
