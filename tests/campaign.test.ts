import { afterEach, expect, it, vi } from 'vitest'
import { campaign, damageTargets, difficulties, earnedStars } from '../src/campaign'
import { momentumSchedule } from '../src/momentum'
import { abilityCost, buyUpgrade, collectWeatherPickup, conditions, defaultSeed, frontSpeed, impactAreas, setCourse, startRun, stormStats, tick, totals, useAbility } from '../src/sim'
import { advanceFront, movePoint } from '../src/convection'
import { loadLocalities, makeDrop } from '../src/free-drop'
import { tornadoClock, tornadoStartDate, tornadoTickSeconds, tornadoVerdict } from '../src/tornado-report'
import { theaters } from '../src/world'
import { evolutionRating } from '../src/evolution-stats'
import { trees } from '../src/upgrades'

afterEach(() => vi.unstubAllGlobals())

const plains = theaters.find(theater => theater.id === 'plains')!

it('awards a completion star and four damage stars with distinct difficulty targets', () => {
  for (const storm of campaign) for (const difficulty of difficulties) {
    const targets = damageTargets(storm, difficulty)
    expect(earnedStars(storm, difficulty, Number.MAX_SAFE_INTEGER, false)).toBe(0)
    expect(earnedStars(storm, difficulty, 0, true)).toBe(1)
    targets.forEach((target, index) => {
      expect(earnedStars(storm, difficulty, target - 1, true)).toBe(index + 1)
      expect(earnedStars(storm, difficulty, target, true)).toBe(index + 2)
    })
  }
  const score = damageTargets('Hurricane', 'Easy')[1]
  expect(earnedStars('Hurricane', 'Easy', score, true)).toBe(3)
  expect(earnedStars('Hurricane', 'Hard', score, true)).toBe(2)
})

it('saves independent bests and unlocks exactly the next event from a fresh profile', async () => {
  vi.resetModules()
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key), setItem: storage.set.bind(storage) })
  const profile = await import('../src/profile')
  expect(campaign.filter(profile.eventUnlocked)).toEqual(['Tornado'])
  const score = damageTargets('Tornado', 'Hard')[2]
  profile.recordRun('Tornado', 'Easy', { damage: 0, deaths: 0 })
  expect(campaign.filter(profile.eventUnlocked)).toEqual(['Tornado', 'Hurricane'])
  profile.recordRun('Tornado', 'Hard', { damage: score, deaths: 3 })
  profile.recordRun('Tornado', 'Hard', { damage: 0, deaths: 0 })
  profile.recordRun('Hurricane', 'Normal', { damage: 0, deaths: 0 })
  vi.resetModules()
  const reloaded = await import('../src/profile')
  expect(reloaded.stormRecord('Tornado', 'Easy')).toEqual({ stars: 1, damage: 0, deaths: 0 })
  expect(reloaded.stormRecord('Tornado', 'Hard')).toEqual({ stars: 4, damage: score, deaths: 3 })
  expect(reloaded.stormRecord('Tornado', 'Normal')).toBeUndefined()
  expect(campaign.filter(reloaded.eventUnlocked)).toEqual(['Tornado', 'Hurricane', 'Blizzard'])
})

it('counts historical completions without guessing their difficulty', async () => {
  vi.resetModules()
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'stormwake.records'
    ? JSON.stringify({ Tornado: { score: 4, deaths: 2 }, Supercell: { damage: 100, deaths: 0 } }) : null })
  const profile = await import('../src/profile')
  expect(profile.legacyRecord('Tornado')).toEqual({ damage: 400_000, deaths: 2 })
  expect(profile.legacyRecord('Thunderstorm')).toEqual({ damage: 100, deaths: 0 })
  expect(profile.eventUnlocked('Wildfire')).toBe(true)
  expect(profile.stormRecord('Tornado', 'Normal')).toBeUndefined()
})

it('ends the campaign at Wildfire even when saved rankings contain retired events', async () => {
  vi.resetModules()
  const retired = { Easy: { damage: 0, deaths: 0, stars: 1 } }
  const saved = { Flooding: retired, 'Dust Storm': retired, 'Heat Dome': retired }
  const storage = new Map([['stormwake.rankings', JSON.stringify(saved)]])
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key), setItem: storage.set.bind(storage) })
  const profile = await import('../src/profile')
  expect(profile.nextEvent('Wildfire')).toBeUndefined()
  expect(campaign.filter(profile.eventUnlocked)).toEqual(['Tornado'])
  profile.recordRun('Tornado', 'Easy', { damage: 0, deaths: 0 })
  expect(JSON.parse(storage.get('stormwake.rankings')!)).toMatchObject(saved)
})

it('seeds irregular Momentum awards and lets weather pickups pay out only once', () => {
  const active = startRun(plains, 0, 'Easy', defaultSeed)
  const unattended = startRun(plains, 0, 'Easy', defaultSeed)
  const schedule = active.momentumSchedule
  const first = schedule.pickups[0]
  expect(schedule).toEqual(unattended.momentumSchedule)
  expect(schedule).not.toEqual(momentumSchedule(defaultSeed + 1, 'Tornado'))
  expect(new Set(schedule.awards.slice(1).map((award, index) => award.time - schedule.awards[index].time)).size).toBeGreaterThan(1)
  for (const run of [active, unattended]) {
    expect(run.momentum).toBe(10)
    expect(collectWeatherPickup(run, first.time)).toBe(false)
    while (run.time < first.time) tick(run)
    expect(run.pickup).toEqual(first)
  }
  const budget = active.momentum
  expect(collectWeatherPickup(active, first.time + 1)).toBe(false)
  expect(collectWeatherPickup(active, first.time)).toBe(true)
  expect(collectWeatherPickup(active, first.time)).toBe(false)
  expect(active.momentum).toBe(budget + first.points)
  while (unattended.time < first.expires) tick(unattended)
  expect(unattended.pickup).toBeNull()
  while (!active.end) {
    if (active.pickup) collectWeatherPickup(active, active.pickup.time)
    tick(active)
  }
  expect(active.end).toBeTruthy()
  expect(active.momentum).toBe(10 + schedule.awards.filter(item => item.time <= active.time).reduce((sum, item) => sum + item.points, 0)
    + schedule.pickups.filter(item => item.time < active.time).reduce((sum, item) => sum + item.points, 0)
    + Math.min(32, Math.floor(Math.sqrt(active.impactCredit / 125_000_000))))
})

it('gates tornado junctions behind both branches and makes intensity purchased', () => {
  const run = startRun(plains, 0, 'Normal', defaultSeed)
  const point = { x: run.front!.point.x - 2, y: run.front!.point.y }
  expect(setCourse(run, point)).toBe(false)
  run.momentum = 130
  expect(buyUpgrade(run, 'tornado-course')).toBe(false)
  expect(buyUpgrade(run, 'multi-vortex')).toBe(false)
  for (const [id, range] of [['tornado-thermal', 35], ['tornado-organize', 90], ['tornado-course', 180]] as const) {
    expect(buyUpgrade(run, id)).toBe(true)
    const natural = run.front!.naturalHeading
    const requested = natural + 150 * Math.PI / 180
    expect(setCourse(run, movePoint(run.front!.point, requested, 30))).toBe(true)
    const track = { ...run.front!, path: [] }
    for (let i = 0; i < 200; i++) advanceFront(track, 0, i, run.effects.trackStability, run.effects.courseControl)
    expect((track.heading - natural) * 180 / Math.PI).toBeCloseTo(Math.min(range, 150))
  }
  expect(setCourse(run, point)).toBe(true)
  for (const id of ['vortex', 'rear-flank', 'tornado-vortex-breakdown', 'tornado-inner-core']) expect(buyUpgrade(run, id)).toBe(true)
  expect(buyUpgrade(run, 'multi-vortex')).toBe(false)
  run.momentum = 100
  for (const id of ['wide-funnel', 'satellite', 'wedge', 'multi-vortex']) expect(buyUpgrade(run, id)).toBe(true)
  expect(stormStats(run).category).toContain('EF0')
  for (let i = 0; i < 24; i++) tick(run)
  expect(stormStats(run).windMph).toBe(217)
  expect(stormStats(run).category).toContain('EF5')

  const longRun = startRun(plains, 0, 'Normal', defaultSeed)
  longRun.momentum = 50
  expect(buyUpgrade(longRun, 'tornado-life-anchor')).toBe(false)
  for (const id of ['tornado-life-feed', 'tornado-life-balance', 'tornado-life-anchor']) expect(buyUpgrade(longRun, id)).toBe(true)
  expect(longRun.effects.endurance).toBeCloseTo(2.02)
  const speed = frontSpeed(longRun)
  expect(buyUpgrade(longRun, 'tornado-track-feed')).toBe(true)
  expect(frontSpeed(longRun)).toBeCloseTo(speed * 1.18)
})

it('combines tornado hail, runoff, and rain concealment along one upgrade path', () => {
  const makeRun = () => startRun(makeDrop('Tornado', 37.69, -97.34), 0, 'Easy', defaultSeed)
  const base = makeRun()
  const precipitation = makeRun()
  base.momentum = precipitation.momentum = 100
  expect(buyUpgrade(precipitation, 'rain-wrapped')).toBe(false)
  for (const run of [base, precipitation]) {
    expect(buyUpgrade(run, 'vortex')).toBe(true)
    expect(buyUpgrade(run, 'rear-flank')).toBe(true)
  }
  expect(buyUpgrade(precipitation, 'tornado-rain-core')).toBe(false)
  for (const id of ['rain-wrapped', 'tornado-rain-core', 'tornado-rain-swath', 'tornado-runoff']) {
    expect(buyUpgrade(precipitation, id)).toBe(true)
  }
  expect(precipitation.effects.hail).toBeCloseTo(1.45)
  expect(precipitation.effects.rainWrap).toBeCloseTo(1.9)
  for (let i = 0; i < 360; i++) for (const run of [base, precipitation]) tick(run)
  expect(stormStats(precipitation).windMph).toBe(stormStats(base).windMph)
  expect(precipitation.front!.floods.size).toBeGreaterThan(0)
  expect(totals(precipitation).damage).toBeGreaterThan(totals(base).damage)
})

it('adds debris damage at each tier without raising the wind speed or EF rating', () => {
  const path = ['tornado-debris', 'tornado-debris-load', 'tornado-debris-barrage']
  const runs = [0, 1, 2, 3].map(tier => {
    const run = startRun(makeDrop('Tornado', 37.69, -97.34), 0, 'Normal', defaultSeed)
    run.momentum = 150
    for (const id of ['vortex', 'rear-flank', 'tornado-low-jet', 'tornado-ground-jet']) expect(buyUpgrade(run, id)).toBe(true)
    for (const id of path.slice(0, tier)) {
      const node = trees.Tornado.find(upgrade => upgrade.id === id)!
      const rating = evolutionRating('Tornado', 'damage', run.effects, node)
      expect(rating.projected).toBeGreaterThan(rating.current)
      expect(buyUpgrade(run, id)).toBe(true)
    }
    for (let i = 0; i < 90; i++) tick(run)
    return run
  })
  for (let tier = 1; tier < runs.length; tier++) {
    expect(stormStats(runs[tier]).windMph).toBe(stormStats(runs[0]).windMph)
    expect(runs[tier].tornado?.peakEf).toBe(runs[0].tornado?.peakEf)
    expect(totals(runs[tier]).damage).toBeGreaterThan(totals(runs[tier - 1]).damage * 1.10)
  }
})

it('makes every warning tier reduce sheltering before the storm can cause an outage', () => {
  const path = ['tornado-response', 'tornado-grid', 'tornado-warning-overload']
  const runs = [0, 1, 2, 3].map(tier => {
    const run = startRun(makeDrop('Tornado', 37.69, -97.34), 0, 'Hard', defaultSeed)
    run.momentum = 30
    for (const id of path.slice(0, tier)) expect(buyUpgrade(run, id)).toBe(true)
    const sampled = new Map<ReturnType<typeof impactAreas>[number]['site'], { warnedAt: number; sheltered: number }>()
    for (let i = 0; i < 120; i++) {
      tick(run)
      for (const { site } of impactAreas(run)) {
        if (site.warnedAt === null) continue
        const prior = sampled.get(site)
        sampled.set(site, { warnedAt: prior?.warnedAt ?? site.warnedAt, sheltered: Math.max(prior?.sheltered ?? 0, site.sheltered) })
      }
    }
    expect(impactAreas(run).every(area => !area.site.outageUntil)).toBe(true)
    return {
      warnedAt: Math.min(...[...sampled.values()].map(site => site.warnedAt)),
      sheltered: Math.max(0, ...[...sampled.values()].map(site => site.sheltered)),
    }
  })
  for (let tier = 1; tier < runs.length; tier++) {
    expect(runs[tier].warnedAt).toBeGreaterThan(runs[tier - 1].warnedAt)
    expect(runs[tier].sheltered).toBeLessThan(runs[tier - 1].sheltered)
  }
})

it('reduces weakening in both cold and hot air at every resistance tier', () => {
  for (const [lat, lon, environment] of [
    [53.54, -113.49, 'Cold inflow'],
    [29.42, -98.49, 'Hot, dry inflow'],
  ] as const) {
    const run = startRun(makeDrop('Tornado', lat, lon), 0, 'Normal', defaultSeed)
    run.momentum = 50
    let trend = conditions(run, run.at).trend
    expect(conditions(run, run.at).name).toBe(environment)
    for (const id of ['tornado-cold-pool', 'tornado-baroclinic', 'tornado-inflow-coupling']) {
      expect(buyUpgrade(run, id)).toBe(true)
      const after = conditions(run, run.at).trend
      expect(after).toBeGreaterThan(trend)
      expect(after).toBeLessThan(0)
      trend = after
    }
  }
})

it('tracks surveyed distance and towns while geography and upgrades shape the calendar lifetime', async () => {
  await loadLocalities()
  const plains = startRun(makeDrop('Tornado', 41.2565, -95.9345), 0, 'Normal', defaultSeed)
  const persistent = startRun(plains.theater, 0, 'Normal', defaultSeed)
  const arctic = startRun(makeDrop('Tornado', 64.317, -96.02), 0, 'Normal', defaultSeed)
  persistent.momentum = 150
  for (const id of ['tornado-cold-pool', 'tornado-baroclinic', 'tornado-inflow-coupling',
    'tornado-life-feed', 'tornado-life-balance', 'tornado-life-anchor',
    'tornado-track-feed', 'tornado-track-corridor', 'tornado-track-long']) {
    expect(buyUpgrade(persistent, id)).toBe(true)
  }
  for (const run of [plains, persistent, arctic]) {
    while (!run.end && run.time < 1200) tick(run)
    expect(run.end).toBeTruthy()
  }
  expect(arctic.time * tornadoTickSeconds).toBeLessThan(30 * 60)
  expect(persistent.time * tornadoTickSeconds).toBeGreaterThan(3.5 * 3600)
  expect(persistent.time * tornadoTickSeconds).toBeLessThan(4.1 * 3600)
  expect(persistent.tornado!.lengthKm).toBeGreaterThan(plains.tornado!.lengthKm)
  expect(plains.tornado).toMatchObject({ maxWidthKm: .04, peakEf: 0 })
  expect(plains.tornado!.places.has('Omaha, Nebraska')).toBe(true)
})

it('keeps the calendar date and chooses headlines from country-specific death tolls', () => {
  const date = tornadoStartDate(new Date(2026, 10, 9, 11))
  expect(tornadoClock(date, 0)).toEqual({ date: 'Nov 9, 2026', time: '3:00 PM' })
  expect(tornadoClock(date, 16).time).toBe('3:04 PM')
  const record = startRun(plains, 0, 'Easy', defaultSeed).tornado!
  record.peakEf = 0
  expect(tornadoVerdict(record, 600, 0, new Map())).toContain('rural damage')
  expect(tornadoVerdict(record, 1_000_000, 0, new Map())).toContain('Damaging tornado')
  expect(tornadoVerdict(record, 1_000_000, 29, new Map([['US', 29]]))).toContain('Deadly tornado')
  expect(tornadoVerdict(record, 1_000_000, 29, new Map([['CA', 29]]))).toContain('Canadian history')
  expect(tornadoVerdict(record, 1_000_000, 696, new Map([['US', 696]]))).toContain('American history')
  expect(tornadoVerdict(record, 1_000_000, 1301, new Map([['BD', 1301]]))).toContain('recorded history')
})

it('lets a specialized storm aim its active ability after buying Targeted Outbreak', () => {
  const theater = theaters.find(theater => theater.id === 'thunderstorm-plains')!
  const run = startRun({ ...theater, storm: 'Lightning' }, 0, 'Normal', defaultSeed)
  const point = run.front!.point
  const nearby = movePoint(point, 0, 7)
  const charge = run.charge
  expect(useAbility(run, nearby)).toBeFalsy()
  run.momentum = 29
  for (const id of ['impact-hail', 'impact-gust', 'impact-grid', 'impact-signature', 'impact-extreme']) expect(buyUpgrade(run, id)).toBe(true)
  expect(useAbility(run, movePoint(point, 0, 150))).toBeFalsy()
  expect(run.charge).toBe(charge)
  expect(useAbility(run, nearby)).toBe(true)
  expect(run.charge).toBe(charge - abilityCost(run))
  expect(run.front!.bursts[0].point).toEqual(nearby)
  expect(run.front!.bursts[0].until).toBe(7)
})
