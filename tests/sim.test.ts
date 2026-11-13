import { describe, expect, it } from 'vitest'
import { activeStorm, buyUpgrade, chooseBlizzardPattern, collectWeatherPickup, conditions, defaultSeed, hurricaneCategory, impactAreas, leg, nameHurricane, removeUpgrade, routeOptions, setBlizzardCourse, setCourse, startRun, steer, stormStats, tick, tornadoLimits, triggerSatellite, tornadoRadius, totals, travelRate, useAbility } from '../src/sim'
import { makeZones, theaters, type Storm } from '../src/world'
import { lakeAt, loadLocalities, makeDrop, makeHurricaneDrop } from '../src/free-drop'
import { hazardNames, hazards } from '../src/hazards'
import { advanceFunnel, createFunnel, distanceKm, isActive, makeConvectiveTrack, movePoint } from '../src/convection'
import { baseEffects } from '../src/upgrades'
import { formatDamage } from '../src/damage'
import { fatalityRate, lossPerHome, sweptShare } from '../src/impact'
import { markSwath, tornadoBands, tornadoStrips, type Swath } from '../src/swath'

const gulf = theaters.find(theater => theater.id === 'gulf')!
function advance(run: ReturnType<typeof startRun>, time: number) {
  while (!run.end && run.time < time) tick(run)
}

describe('global weather scenarios', () => {
  it.each(hazardNames)('starts %s, activates its own ability, and resolves impact', storm => {
    const area = theaters.find(theater => theater.storm === storm)!
    const run = startRun(area, 0, 'Easy', defaultSeed)
    useAbility(run)
    expect(run.fire?.spotfires ?? (run.front ? run.front.funnels.length + run.front.bursts.length : run.pulses.length)).toBeGreaterThan(0)
    expect(run.charge).toBe(35 - hazards[storm].ability.cost)
    advance(run, 6)
    expect(totals(run).damage).toBeGreaterThan(0)
  })

  it('lets a thunderstorm spawn another tornado while the first is active', () => {
    const run = startRun(theaters.find(theater => theater.storm === 'Thunderstorm')!, 0, 'Easy', defaultSeed)
    const front = run.front!
    expect(useAbility(run)).toBe(true)
    useAbility(run)
    expect(front.funnels).toHaveLength(1)
    const first = front.funnels[0]
    expect(distanceKm(front.point, first.point)).toBeLessThan(tornadoRadius(run))
    expect(first.point).not.toEqual(front.point)
    advance(run, 17)
    expect(useAbility(run)).toBe(true)
    const second = front.funnels[1]
    expect(first.heading).not.toBe(second.heading)
    expect(first.path.length).toBeGreaterThan(2)
    expect(front.funnels.filter(funnel => isActive(funnel, run.time))).toHaveLength(2)
    advance(run, Math.max(first.life, second.start + second.life))
    expect(front.funnels.every(funnel => !isActive(funnel, run.time))).toBe(true)
  })

  it('organizes a developing cell through upgrades and preserves its track and tornadoes', () => {
    const run = startRun(theaters.find(theater => theater.storm === 'Thunderstorm')!, 0, 'Easy', defaultSeed)
    expect(activeStorm(run)).toBe('Thunderstorm')
    expect(useAbility(run)).toBe(true)
    const first = run.front!.funnels[0]
    advance(run, 8)
    const before = { ...totals(run), time: run.time, point: run.front!.point }
    run.momentum = 60
    expect(buyUpgrade(run, 'storm-new-cell')).toBe(true)
    expect(activeStorm(run)).toBe('Multicell')
    expect(buyUpgrade(run, 'storm-outflow')).toBe(true)
    expect(activeStorm(run)).toBe('Squall')
    expect(travelRate(run)).toBe(hazards.Squall.speed)
    expect(buyUpgrade(run, 'funnel-rotation')).toBe(true)
    expect(activeStorm(run)).toBe('Supercell')
    expect({ ...totals(run), time: run.time, point: run.front!.point }).toEqual(before)
    expect(run.front!.funnels[0]).toBe(first)
    expect(removeUpgrade(run, 'funnel-rotation')).toBe(true)
    expect(activeStorm(run)).toBe('Squall')
    run.charge = 100
    expect(useAbility(run)).toBe(true)
    expect(run.front!.funnels).toHaveLength(2)
  })

  it('starts a weak Saskatchewan cell and carries it east without looping through waypoints', () => {
    const run = startRun(makeDrop('Thunderstorm', 52.13, -106.67), 0, 'Easy', defaultSeed)
    expect(run.strength).toBe(17)
    advance(run, 45)
    expect(totals(run).deaths).toBe(0)
    expect(totals(run).damage).toBeLessThan(20_000)
    advance(run, 260)
    const path = run.front!.path
    expect(path.every((point, i) => i === 0 || point.x > path[i - 1].x)).toBe(true)
    expect(distanceKm(path[0], path.at(-1)!)).toBeGreaterThan(230)
  })

  it('gates precision and both steering controls behind their trees', () => {
    const area = theaters.find(theater => theater.id === 'thunderstorm-prairies')!
    const run = startRun(area, 0, 'Easy', defaultSeed)
    const front = run.front!
    const target = movePoint(front.point, -Math.PI / 2, 10)
    expect(useAbility(run, target)).toBeUndefined()
    expect(setCourse(run, target)).toBe(false)
    run.momentum = 100
    expect(buyUpgrade(run, 'funnel-precision')).toBe(false)
    for (const id of ['funnel-rotation', 'funnel-core', 'funnel-guidance', 'funnel-precision']) expect(buyUpgrade(run, id)).toBe(true)
    const far = movePoint(front.point, 0, tornadoRadius(run) + 5)
    expect(useAbility(run, far)).toBeUndefined()
    expect(useAbility(run, target)).toBe(true)
    expect(distanceKm(front.funnels[0].point, target)).toBeLessThan(.001)
    expect(setCourse(run, front.point, 1)).toBe(true)
    for (const id of ['track-inflow', 'track-organize']) expect(buyUpgrade(run, id)).toBe(true)
    expect(buyUpgrade(run, 'track-control')).toBe(false)
    expect(buyUpgrade(run, 'track-align')).toBe(true)
    expect(buyUpgrade(run, 'track-control')).toBe(true)
    const guided = startRun(area, 0, 'Easy', defaultSeed)
    guided.momentum = 100
    for (const id of ['track-inflow', 'track-organize', 'track-align', 'track-control']) expect(buyUpgrade(guided, id)).toBe(true)
    expect(setCourse(guided, target)).toBe(true)
    advance(guided, 110)
    expect(guided.front!.point.y).toBeLessThan(target.y)
    expect(guided.effects.endurance).toBe(0)
  })

  it('raises EF5 odds, width and lifetime through tornado upgrades', () => {
    const point = { x: 734, y: 380 }
    const basic = makeConvectiveTrack(point, defaultSeed)
    const enhanced = makeConvectiveTrack(point, defaultSeed)
    for (let i = 0; i < 120; i++) {
      const a = createFunnel(basic, defaultSeed, i, 30, baseEffects, 42, 44)!
      const b = createFunnel(enhanced, defaultSeed, i, 30, { ...baseEffects, tornadoIntensity: .18, tornadoWidth: .65, tornadoLife: 17 }, 42, 44)!
      expect(a.ef).toBe(0)
      expect(b.ef).toBe(0)
      expect(b.width).toBeGreaterThan(a.width)
      expect(b.life).toBeGreaterThan(a.life)
    }
    expect(enhanced.funnels.filter(funnel => funnel.peakEF === 5).length).toBeGreaterThan(basic.funnels.filter(funnel => funnel.peakEF === 5).length)
  })

  it('keeps a new Kansas tornado at EF0 with minimal damage and no fatalities', () => {
    const area = makeDrop('Tornado', 37.69, -97.34)
    const run = startRun(area, 0, 'Easy', defaultSeed)
    useAbility(run)
    expect(stormStats(run)).toMatchObject({ category: 'EF0 · On ground', windMph: 65, widthKm: .04 })
    advance(run, 10)
    expect(totals(run).deaths).toBe(0)
    expect(totals(run).damage).toBeGreaterThan(0)
    expect(totals(run).damage).toBeLessThan(3_000)
  })

  it('drifts northeast without looping for both standalone and dropped tornadoes', () => {
    const tornado = startRun(makeDrop('Tornado', 37.69, -97.34), 0, 'Easy', defaultSeed)
    const standalone = tornado.front!
    advance(tornado, 500)
    expect(standalone.path.length).toBeGreaterThan(70)
    expect(standalone.path.every((point, index) => index === 0 ||
      (point.x > standalone.path[index - 1].x && point.y < standalone.path[index - 1].y))).toBe(true)

    const parent = makeConvectiveTrack({ x: 826.6, y: 523.1 }, defaultSeed)
    for (let seed = 0; seed < 24; seed++) {
      const funnel = createFunnel(parent, seed, 0, 25, baseEffects, 43, 50)!
      const start = funnel.point
      for (let age = 1; age <= funnel.life; age++) advanceFunnel(funnel, age)
      expect(funnel.point.x).toBeGreaterThan(start.x)
      expect(funnel.point.y).toBeLessThan(start.y)
    }
  })

  it('reaches four simulated hours and 400 km when the lifetime and travel lanes are maxed', () => {
    const run = startRun(makeDrop('Tornado', 37.69, -97.34), 0, 'Easy', defaultSeed)
    run.momentum = 100
    for (const id of ['tornado-life-feed', 'tornado-life-balance', 'tornado-life-anchor',
      'tornado-track-feed', 'tornado-track-corridor', 'tornado-track-long']) {
      expect(buyUpgrade(run, id)).toBe(true)
    }
    expect(tornadoLimits(run)).toEqual({ ticks: 960, km: 400 })
    advance(run, 1_000)
    expect(run.time).toBe(960)
    expect(run.tornado!.lengthKm).toBeCloseTo(400)
    expect(run.end).toBeTruthy()
  })

  it('reaches EF4 then EF5 along the wind lane and gates manual satellites by simulation time', () => {
    const run = startRun(makeDrop('Tornado', 37.69, -97.34), 0, 'Easy', defaultSeed)
    run.momentum = 80
    for (const id of ['vortex', 'rear-flank', 'tornado-vortex-breakdown']) {
      expect(buyUpgrade(run, id)).toBe(true)
    }
    advance(run, 24)
    expect(stormStats(run)).toMatchObject({ windMph: 170, category: 'EF4 · On ground' })
    expect(buyUpgrade(run, 'tornado-inner-core')).toBe(true)
    expect(stormStats(run).windMph).toBe(202)
    expect(stormStats(run).category).toContain('EF5')
    expect(triggerSatellite(run)).toBe(false)
    run.momentum = 60
    for (const id of ['tornado-satellite-seed', 'tornado-satellite-lobes', 'tornado-satellite-shear', 'tornado-satellite-split']) {
      expect(buyUpgrade(run, id)).toBe(true)
    }
    expect(triggerSatellite(run)).toBe(true)
    const satellite = run.front!.funnels[0]
    expect(satellite.peakEF).toBeLessThan(5)
    expect(satellite.heading).not.toBe(run.front!.heading)
    advance(run, run.time + 59)
    run.realTime = 120_000
    expect(triggerSatellite(run)).toBe(false)
    advance(run, run.time + 1)
    expect(triggerSatellite(run)).toBe(true)
    advance(run, run.time + 60)
    expect(run.events.filter(event => event.text.includes('storm chasers'))).toHaveLength(1)
  })

  it('earns enough Momentum for EF5 on a favorable run and delays publicity with rain wrapping', async () => {
    await loadLocalities()
    const theater = makeDrop('Tornado', 37.69, -97.34)
    const run = startRun(theater, 0, 'Normal', defaultSeed)
    const windLane = ['vortex', 'rear-flank', 'tornado-vortex-breakdown', 'tornado-inner-core']
    let next = 0
    while (!run.end && (next < windLane.length || !stormStats(run).category.includes('EF5'))) {
      if (run.pickup) collectWeatherPickup(run, run.pickup.time)
      if (next < windLane.length && buyUpgrade(run, windLane[next])) next++
      tick(run)
    }
    expect(run.end).toBeNull()
    expect(run.effects.satelliteTrigger).toBe(0)
    expect(run.impactCredit).toBeGreaterThan(0)
    expect(run.momentumGain?.points).toBeGreaterThan(0)

    const visible = startRun(theater, 0, 'Normal', defaultSeed)
    const concealed = startRun(theater, 0, 'Normal', defaultSeed)
    for (const storm of [visible, concealed]) {
      storm.momentum = 100
      for (const id of [...windLane, 'wide-funnel', 'satellite', 'wedge']) expect(buyUpgrade(storm, id)).toBe(true)
    }
    expect(buyUpgrade(concealed, 'rain-wrapped')).toBe(true)
    advance(visible, 28)
    advance(concealed, 28)
    expect(visible.tornado!.awareness).toBeGreaterThan(concealed.tornado!.awareness)
    expect(impactAreas(visible).reduce((sum, area) => sum + area.site.sheltered, 0))
      .toBeGreaterThan(impactAreas(concealed).reduce((sum, area) => sum + area.site.sheltered, 0))
  })

  it('uses swept area, wind fragility and shelter for losses', () => {
    expect(sweptShare(2, .5, 10)).toBeCloseTo(1 / 25.8999)
    expect(lossPerHome(65, true)).toBeLessThan(lossPerHome(65) / 10)
    expect(lossPerHome(220)).toBeGreaterThan(lossPerHome(100) * 3)
    expect(fatalityRate(85, 0, 0, 0)).toBe(0)
    expect(fatalityRate(220, .85, 10, .9)).toBeLessThan(fatalityRate(220, 0, 0, 0))
  })

  it('supports runoff and a longer forecast as separate specialties', () => {
    const area = theaters.find(theater => theater.id === 'thunderstorm-prairies')!
    const flooding = startRun(area, 0, 'Easy', defaultSeed)
    const baseline = startRun(area, 0, 'Easy', defaultSeed)
    const longevity = startRun(area, 0, 'Easy', defaultSeed)
    for (const run of [flooding, baseline, longevity]) {
      run.momentum = 40
    }
    expect(buyUpgrade(flooding, 'flood-rain')).toBe(true)
    advance(flooding, 80)
    advance(baseline, 80)
    expect(flooding.front!.floods.size).toBeGreaterThan(0)
    expect(totals(flooding).damage).toBeGreaterThan(totals(baseline).damage)
    for (const id of ['life-inflow', 'life-reserve', 'life-recharge', 'life-window']) expect(buyUpgrade(longevity, id)).toBe(true)
    expect(longevity.effects.endurance).toBeGreaterThan(0)
  })

  it('formats dollar values at small, million and billion scales', () => {
    expect([21, 54879, 1_370_000, 72_120_000_000].map(formatDamage)).toEqual(['$21', '$54879', '$1.37 million', '$72.12 billion'])
  })

  it.each([
    [51.05, -114.07, 'Alberta Clipper'],
    [42.36, -71.06, "Nor'easter"],
    [35.24, -75.54, "Nor'easter"],
    [44.45, -81.23, 'Lake-Effect Storm'],
    [39.74, -104.99, 'Colorado Low'],
    [43.06, 141.35, 'Sea-Effect Snow'],
  ])('forecasts a location-specific blizzard at %s, %s', (lat, lon, name) => {
    const run = startRun(makeDrop('Blizzard', lat, lon), 0, 'Normal', defaultSeed)
    expect(run.blizzardPattern).toBe(name)
    useAbility(run)
    expect(run.whiteout).toBe(0)
  })

  it('limits the blizzard alternatives to the start and locks the pattern during play', () => {
    const run = startRun(theaters.find(theater => theater.id === 'ontario')!, 0, 'Normal', defaultSeed)
    expect(chooseBlizzardPattern(run, "Nor'easter")).toBe(false)
    expect(chooseBlizzardPattern(run, 'Snow Squall')).toBe(true)
    expect(travelRate(run)).toBeGreaterThan(1)
    advance(run, 1)
    expect(chooseBlizzardPattern(run, 'Lake-Effect Storm')).toBe(false)
  })

  it('curves blizzards gradually to either side of the natural track', () => {
    const theater = makeDrop('Blizzard', 49, -115)
    const natural = startRun(theater, 0, 'Normal', defaultSeed)
    const left = startRun(theater, 0, 'Normal', defaultSeed)
    const right = startRun(theater, 0, 'Normal', defaultSeed)
    const farLeft = startRun(theater, 0, 'Normal', defaultSeed)
    const farRight = startRun(theater, 0, 'Normal', defaultSeed)
    for (const run of [natural, left, right, farLeft, farRight]) {
      expect(chooseBlizzardPattern(run, 'Frontal Snowstorm')).toBe(true)
    }
    setBlizzardCourse(left, 'left')
    setBlizzardCourse(right, 'right')
    setBlizzardCourse(farLeft, 'far-left')
    setBlizzardCourse(farRight, 'far-right')
    expect(left.front!.heading).toBe(natural.front!.heading)
    for (const run of [natural, left, right]) advance(run, 1)
    expect(natural.front!.heading - left.front!.heading).toBeLessThan(.03)
    for (const run of [natural, left, right]) advance(run, 60)
    expect(left.front!.point.y).toBeLessThan(natural.front!.point.y)
    expect(right.front!.point.y).toBeGreaterThan(natural.front!.point.y)
    expect(right.front!.heading - natural.front!.heading).toBeLessThanOrEqual(Math.PI / 10)
    for (const run of [farLeft, farRight]) advance(run, 60)
    expect(farLeft.front!.point.y).toBeLessThan(left.front!.point.y)
    expect(farRight.front!.point.y).toBeGreaterThan(right.front!.point.y)
    expect(farRight.front!.heading - natural.front!.heading).toBeCloseTo(Math.PI / 5, 1)
    setBlizzardCourse(right, 'natural')
    for (const run of [natural, right]) advance(run, 140)
    expect(right.front!.heading).toBeCloseTo(natural.front!.heading, 2)
  })

  it('tracks a Mid-Atlantic Nor’easter north and east along the coast', () => {
    const run = startRun(theaters.find(theater => theater.id === 'mid-atlantic')!, 0, 'Normal', defaultSeed)
    expect(run.blizzardPattern).toBe("Nor'easter")
    const start = run.front!.point
    advance(run, 480)
    expect(run.front!.point.y).toBeLessThan(start.y - 26)
    expect(run.front!.point.x).toBeGreaterThan(start.x)
    expect(run.front!.point.x).toBeLessThan(start.x + 35)
  })

  it('allows sharper left turns on a Nor’easter while preserving the gentler Clipper limit', () => {
    const coastal = makeDrop('Blizzard', 35.24, -75.54)
    const hard = startRun(coastal, 0, 'Normal', defaultSeed)
    const max = startRun(coastal, 0, 'Normal', defaultSeed)
    const clipper = startRun(makeDrop('Blizzard', 51.19, -114.47), 0, 'Normal', defaultSeed)
    setBlizzardCourse(clipper, 'max-left')
    expect(clipper.snow!.steering.course).toBe('natural')
    setBlizzardCourse(hard, 'hard-left')
    setBlizzardCourse(max, 'max-left')
    for (const run of [hard, max]) advance(run, 55)
    expect(max.front!.point.x).toBeLessThan(hard.front!.point.x)
    expect(max.front!.point.x).toBeLessThan(max.front!.path[0].x)
  })

  it('keeps exact custom origins on land, open water, and across the dateline', () => {
    const plains = startRun(makeHurricaneDrop(39, -97), 0, 'Normal', defaultSeed)
    expect(plains.theater.places[0].slice(1, 3)).toEqual([39, -97])
    expect(plains.zones[0].sea).toBe(false)
    expect(plains.zones[0].population).toBeGreaterThan(0)
    advance(plains, 4)
    expect(plains.strength).toBeLessThan(31)
    expect(totals(plains).damage).toBeGreaterThan(0)

    const pacific = startRun(makeHurricaneDrop(16, 179.8), 0, 'Normal', defaultSeed)
    expect(pacific.zones[0].sea).toBe(true)
    expect(pacific.zones[0].population).toBe(0)
    expect(pacific.zones.every(zone => Math.abs(zone.x - pacific.zones[0].x) < 80)).toBe(true)
    advance(pacific, 4)
    expect(pacific.strength).toBeGreaterThan(31)
    expect(totals(pacific).damage).toBe(0)

    const polar = startRun(makeHurricaneDrop(85, 20), 0, 'Normal', defaultSeed)
    advance(polar, 4)
    expect(polar.strength).toBeLessThan(31)
    expect(new Set(makeHurricaneDrop(-90, 180).places.map(place => place[2])).size).toBeGreaterThan(3)
  })

  it('uses Tornado Simulator national and Canadian census densities for playable populations', () => {
    const canada = makeZones(theaters.find(theater => theater.id === 'ontario')!)
    expect(canada[2].source).toContain('Toronto, ON')
    expect(canada[2].density).toBeGreaterThan(canada[0].density)
    expect(canada[2].population).toBeLessThanOrEqual(Math.round(canada[2].density * 300))
    expect(makeZones(gulf)[2].source).toContain('Orleans Parish')
    for (const type of ['Hurricane', 'Tornado', 'Blizzard'] as Storm[]) {
      const available = theaters.filter(theater => theater.storm === type)
      expect(available.length).toBeGreaterThanOrEqual(4)
      for (const theater of available) {
        const zones = makeZones(theater)
        expect(zones.filter(zone => zone.sea)).toHaveLength(type === 'Hurricane' ? 2 : 0)
        expect(zones.filter(zone => !zone.sea).every(zone => zone.density > 0)).toBe(true)
      }
    }
  })

  it('requires a usable hurricane name and follows a continuous automatic Gulf landfall', () => {
    const run = startRun(gulf, 1, 'Normal', defaultSeed)
    expect(nameHurricane(run, '   ')).toBe(false)
    expect(nameHurricane(run, '  Hazel  ')).toBe(true)
    expect(run.name).toBe('Hazel')
    expect(routeOptions(run)).toEqual([])
    expect(useAbility(run)).toBeUndefined()
    const initial = run.front!.point
    steer(run, 0)
    expect(setCourse(run, movePoint(initial, Math.PI / 2, 20))).toBe(false)
    advance(run, 340)
    expect(nameHurricane(run, 'Other')).toBe(false)
    expect(run.cyclone!.history.some(stage => stage.reason.startsWith('Landfall'))).toBe(true)
    expect(run.front!.path.every((point, i, path) => i === 0 || point.y < path[i - 1].y)).toBe(true)
    expect(run.cyclone!.inlandKm).toBeGreaterThan(100)
  })

  it('can strengthen after crossing Cuba and returning to warm water', () => {
    const run = startRun(makeHurricaneDrop(16, -72), 0, 'Normal', defaultSeed)
    const cyclone = run.cyclone!
    expect(nameHurricane(run, 'Hazel')).toBe(true)
    run.momentum = 100
    for (const id of ['warm', 'deep', 'moist-inflow', 'surface-flux', 'marine']) expect(buyUpgrade(run, id)).toBe(true)

    while (cyclone.ocean && !run.end && run.time < 750) tick(run)
    expect(cyclone.ocean).toBe(false)
    expect(conditions(run, run.at).trend).toBeLessThan(0)
    const landfallWind = stormStats(run).windMph

    while (!cyclone.ocean && !run.end && run.time < 750) tick(run)
    expect(cyclone.ocean).toBe(true)
    expect(stormStats(run).windMph).toBeLessThan(landfallWind)
    const exitWind = stormStats(run).windMph
    advance(run, run.time + 20)
    expect(stormStats(run).windMph).toBeGreaterThan(exitWind)
    expect(cyclone.history.some(stage => stage.reason === 'Returned to open water · warm ocean water')).toBe(true)
  })

  it('lets a hurricane recover over the Gulf Stream north of 29°', () => {
    const run = startRun(makeHurricaneDrop(32, -81.2), 0, 'Normal', defaultSeed)
    const cyclone = run.cyclone!
    const front = run.front!
    // Drive an eastward crossing from coastal Georgia to isolate the water-temperature change.
    cyclone.initial = 0
    cyclone.bias = 0
    cyclone.turnLatitude = 90
    front.heading = 0
    expect(cyclone.ocean).toBe(false)
    while (!cyclone.ocean && !run.end && run.time < 100) tick(run)
    expect(cyclone.ocean).toBe(true)
    while (conditions(run, run.at).trend < 0 && !run.end && run.time < 100) tick(run)
    expect(conditions(run, run.at)).toMatchObject({ name: 'Warm ocean water' })
    const offshoreStrength = run.strength
    advance(run, run.time + 30)
    expect(run.strength).toBeGreaterThan(offshoreStrength)

    const cooler = startRun(makeHurricaneDrop(32, -48), 0, 'Normal', defaultSeed)
    expect(cooler.cyclone!.ocean).toBe(true)
    expect(conditions(cooler, cooler.at).trend).toBeLessThan(0)
  })

  it('extends the footprint only after an affordable purchase', () => {
    const run = startRun(gulf, 0, 'Normal', defaultSeed)
    run.momentum = 5
    expect(buyUpgrade(run, 'warm')).toBe(true)
    expect(buyUpgrade(run, 'bands')).toBe(false)
    advance(run, leg * 2)
    const width = stormStats(run).widthKm
    expect(buyUpgrade(run, 'bands')).toBe(true)
    expect(stormStats(run).widthKm).toBe(width + 45)
    expect(buyUpgrade(run, 'bands')).toBe(false)
    advance(run, 360)
    expect(impactAreas(run).some(({ site }) => site.loss > 0)).toBe(true)
  })

  it('keeps the tornado grounded and lets blizzard snowfall cause damage automatically', () => {
    const tornado = startRun(theaters.find(theater => theater.id === 'plains')!, 0, 'Normal', defaultSeed)
    advance(tornado, 6)
    expect(totals(tornado).damage).toBeGreaterThan(0)
    expect(totals(tornado).deaths).toBe(0)
    useAbility(tornado)
    advance(tornado, 70)
    expect(stormStats(tornado).category).toContain('On ground')

    expect(tornado.events.at(-1)?.text).toContain('Rotating storms detected')

    const blizzard = startRun(theaters.find(theater => theater.id === 'ontario')!, 0, 'Normal', defaultSeed)
    advance(blizzard, 24)
    expect(blizzard.snow?.deposits.size).toBeGreaterThan(0)
    expect(totals(blizzard).damage).toBeGreaterThan(0)
  })

  it('finishes deterministically, caps losses, and resets the tally on replay', () => {
    const first = startRun(gulf, 1, 'Hard', defaultSeed)
    const second = startRun(gulf, 1, 'Hard', defaultSeed)
    advance(first, 2400)
    advance(second, 2400)
    expect(first).toEqual(second)
    expect(first.end).toBeTruthy()
    for (const { site, zone } of impactAreas(first)) {
      expect(site.injured + site.deaths).toBeLessThanOrEqual(zone.population)
      expect(site.loss).toBeLessThanOrEqual(zone.assets)
    }
    expect(totals(first).damage).toBeGreaterThan(0)
    expect(totals(startRun(gulf, 1, 'Hard', defaultSeed))).toEqual({ deaths: 0, damage: 0 })
  })

  it('gates hurricane upgrades and applies official wind bands', () => {
    const storm = startRun(gulf, 1, 'Normal', defaultSeed)
    storm.momentum = 100
    expect(buyUpgrade(storm, 'marine')).toBe(false)
    const before = conditions(storm, 1).trend
    expect(buyUpgrade(storm, 'warm')).toBe(true)
    expect(conditions(storm, 1).trend).toBeGreaterThan(before)
    expect(buyUpgrade(storm, 'deep')).toBe(true)
    expect(buyUpgrade(storm, 'marine')).toBe(false)
    for (const id of ['moist-inflow', 'surface-flux', 'marine']) expect(buyUpgrade(storm, id)).toBe(true)
    const wind = stormStats(storm).windMph
    expect(buyUpgrade(storm, 'eye')).toBe(true)
    expect(stormStats(storm).windMph).toBe(wind + 12)
    expect(hurricaneCategory(73)).toBe('Tropical storm')
    expect(hurricaneCategory(74)).toBe('Category 1')
    expect(hurricaneCategory(157)).toBe('Category 5')

  })

  it('naturally weakens from Category 5 through tropical depression after Gulf landfall', () => {
    const run = startRun(makeHurricaneDrop(22, -90), 0, 'Normal', defaultSeed)
    nameHurricane(run, 'Hazel')
    run.momentum = 250
    for (const id of ['warm', 'deep', 'moist-inflow', 'surface-flux', 'marine', 'core', 'persistent', 'coastal-feed', 'inland-moisture', 'inland-engine', 'surge']) expect(buyUpgrade(run, id)).toBe(true)
    advance(run, 2400)
    expect(run.time).toBeGreaterThanOrEqual(12 * 60)
    expect(run.time).toBeLessThanOrEqual(19 * 60)
    const stages = run.cyclone!.history.map(stage => stage.category)
    expect(stages).toContain('Category 5')
    expect(stages.at(-3)).toBe('Tropical depression')
    expect(stages.at(-2)).toBe('Remnant low')
    expect(stages.at(-1)).toBe('Dissipated')
    expect(run.end).toBe('Hazel dissipated.')
    expect(run.cyclone!.history.some(stage => stage.reason.startsWith('Deep inland'))).toBe(true)
    expect(totals(run).damage).toBeGreaterThan(0)
  })

  it('names tornadoes from nearby cities, detects large lakes, and records ground-only EF swaths', async () => {
    await loadLocalities()
    const wichita = startRun(makeDrop('Tornado', 37.69, -97.34), 0, 'Normal', defaultSeed)
    expect(wichita.name).toBe('The Wichita Tornado')
    expect(wichita.events[0].text).toBe('Rotating storms detected near Wichita.')
    expect(startRun(makeDrop('Tornado', 32.7486, -97.3289), 0, 'Normal', defaultSeed).name).toBe('The Fort Worth Tornado')
    expect(startRun(makeDrop('Tornado', 43.5789, -79.6583), 0, 'Normal', defaultSeed).name).toBe('The Mississauga Tornado')
    advance(wichita, 6)
    expect(wichita.front!.swath[0]).toMatchObject({ ef: 0, scour: false })
    expect(stormStats(wichita).widthKm).toBeLessThan(.1)
    const lake = startRun(makeDrop('Tornado', 43.7, -78.1), 0, 'Normal', defaultSeed)
    expect(lake.name).toBe('Waterspout')
    advance(lake, 6)
    expect(lake.front!.swath).toHaveLength(0)
    expect(totals(lake).damage).toBe(0)
    let north = 43.97
    while (!lakeAt(north, -78.1) && north > 43.5) north -= .002
    const shore = startRun(makeDrop('Tornado', north - .001, -78.1), 0, 'Normal', defaultSeed)
    expect(shore.name).toBe('Waterspout')
    advance(shore, 90)
    expect(shore.name).toMatch(/ Tornado$/)
    expect(shore.front!.swath.length).toBeGreaterThan(0)
  })

  it('distinguishes NYC borough land and islands from adjacent rivers and harbor water', () => {
    const land = [[40.758, -73.9855], [40.6926, -74.0168], [40.645, -73.782], [40.583, -73.818], [40.61, -74.13], [40.73, -74.06]]
    const water = [[40.7056, -73.9939], [40.72, -74.025], [40.665, -74.05]]
    for (const [lat, lon] of land) {
      const run = startRun(makeDrop('Tornado', lat, lon), 0, 'Normal', defaultSeed)
      expect(run.name, `${lat}, ${lon}`).toMatch(/ Tornado$/)
      expect(run.front!.current.zone.sea).toBe(false)
    }
    for (const [lat, lon] of water) {
      const run = startRun(makeDrop('Tornado', lat, lon), 0, 'Normal', defaultSeed)
      expect(run.name, `${lat}, ${lon}`).toBe('Waterspout')
      expect(run.front!.current.zone.sea).toBe(true)
    }
  })

  it('records a wider potentially scoured core separately from weak damage', () => {
    const path: Swath[] = []
    const from = { x: .3, y: 0 }
    const to = { x: .44, y: 0 }
    markSwath(path, from, to, 65, .04)
    markSwath(path, to, { x: .49, y: 0 }, 235, 1.24)
    expect(path.map(({ ef, width, scour }) => ({ ef, width, scour }))).toEqual([
      { ef: 0, width: .04, scour: false }, { ef: 5, width: 1.24, scour: true },
    ])
    const bands = tornadoBands(235, 1.24)
    expect(bands.map(band => band.ef)).toEqual([0, 1, 2, 3, 4, 5])
    expect(bands.every((band, i) => i === 0 || band.width < bands[i - 1].width)).toBe(true)
    expect(tornadoStrips(235, 1.24).reduce((width, strip) => width + strip.width, 0)).toBeCloseTo(bands[0].width)
    expect(tornadoBands(85.9, .04).map(band => band.ef)).toEqual([0])
  })
})
