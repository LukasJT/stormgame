// Seeded forecasts share the free-placement rankings without entering the replay database.
const difficulties = ['Easy', 'Normal', 'Hard', 'Expert']
export const seededAt = Date.UTC(2026, 10, 15)
const forecasts = {
  Tornado: { counts: [60, 54, 32, 16], origins: [[37.69, -97.34], [35.47, -97.52], [41.26, -95.94], [33.52, -86.81]] },
  Hurricane: { counts: [55, 44, 26, 12], origins: [[21, -87], [24, -83], [26.8, -77.1], [27.6, -89.5]] },
  Blizzard: { counts: [22, 18, 12, 6], origins: [[51.05, -114.07], [43.4, -87.1], [41.7, -70.3], [40.1, -105.2]] },
  Thunderstorm: { counts: [48, 40, 24, 10], origins: [[50.45, -104.62], [39.05, -95.68], [35.22, -101.83], [42.03, -93.62]] },
  Wildfire: { counts: [28, 22, 14, 8], origins: [[39.76, -121.62], [38.58, -120.54], [37.16, -119.42], [34.9, -118.57]] },
}
const handles = [
  'prairie_wx', 'milo47', 'dustyboots', 'cloudline_09', 'lexdrifts', 'StormKite', 'radar_rob', 'sam_wx',
  'bluehour88', 'coniferjoe', 'taylormaps', 'northloop', 'sydplays', 'gust_junkie', 'aria_77', 'westwindjay',
  'noahtracks', 'wx_gracie', 'pickles_17', 'brooklynskies', 'LakesideKai', 'snowedinn', 'morganwx', 'zeroecho',
  'casey_515', 'isabelstorms', 'pixelrobin', 'mistbyte', 'ridge_runner', 'jaycen92', 'wxmason', 'raincheck_rin',
  'maplewx', 'eli_north', 'jordy404', 'cloudbuffer', 'rileyroads', 'slowfront', 'luma_skies', 'cameron153',
  'offshorelee', 'mandy7', 'MesonetMatt', 'ashraven_2', 'taterstorm', 'bluejetben', 'niko_89', 'sloane_wx',
  'evieafterdark', 'fernstation', 'nickwx22', 'lane_81', 'turbulentTed', 'juniperjay', 'deltaecho23', 'owenloops',
  'wx_violet', 'cattailkat', 'skip_91', 'cloudyRen', 'HazelPlays', 'boreal_bri', 'kellan06', 'piper_wx',
]
const round = value => Math.round(value * 10) / 10

function sampleMetrics(event, damage, level, rolls) {
  const [a, b, c] = rolls
  const severe = Math.max(0, level - .34)
  const square = level ** 2
  switch (event) {
    case 'Tornado': {
      const duration = Math.round((6 + 161 * level + 20 * a) * 60)
      const ef = Math.min(4, Math.floor(level * 4.5))
      const deaths = ef ? Math.round(severe * (4 + 46 * b)) : 0
      return { duration, deaths, injured: Math.round(deaths * (4 + 8 * c)),
        settlements: Math.round(18 * square + 2 * b),
        pathKm: round(duration / 3600 * (22 + 72 * b)), peakWidth: Math.round(24 + 1250 * square * (.45 + .55 * c)), peakEF: ef }
    }
    case 'Hurricane': {
      const wind = Math.round(32 + 126 * level)
      const deaths = Math.round(severe * (2 + 130 * b))
      const windDamage = Math.round(damage * (.42 + .27 * a))
      const rainDamage = Math.round((damage - windDamage) * (.42 + .45 * c))
      return { duration: Math.round((11 + 98 * level + 15 * a) * 3600), deaths, injured: Math.round(deaths * (3 + 6 * c)),
        settlements: Math.round(3 + 155 * square + 6 * b), wind, windDamage, rainDamage,
        surge: damage - windDamage - rainDamage, majorHours: wind < 111 ? 0 : round((wind - 110) * (.25 + .5 * c)) }
    }
    case 'Blizzard': {
      const deaths = Math.round(severe * (2 + 22 * b))
      return { duration: Math.round((3 + 37 * level + 5 * a) * 3600), deaths, injured: Math.round(deaths * (2 + 7 * c)),
        settlements: Math.round(82 * square + 4 * b), snowfall: round(1.2 + 78 * square + 7 * a),
        whiteout: Math.round(severe * (4 + 55 * b)) }
    }
    case 'Thunderstorm': {
      const funnels = Math.floor(level * 13 + a)
      const longestFunnel = funnels ? round(2 + level * (6 + 21 * b)) : 0
      const deaths = Math.round(severe * (3 + 57 * b))
      return { duration: Math.round((1 + 9 * level + 2 * a) * 3600), deaths, injured: Math.round(deaths * (3 + 10 * c)),
        settlements: Math.round(48 * square + 4 * b), funnels, outbreak: Math.min(funnels, Math.ceil(funnels * .44)),
        combinedPath: round(longestFunnel * (funnels ? 1 + (funnels - 1) * (.2 + .55 * c) : 0)), longestFunnel,
        funnelEF: funnels ? Math.min(4, Math.floor(level * 4.5)) : 0, funnelDamage: funnels ? Math.round(damage * (.08 + .33 * b)) : 0,
        hailDamage: Math.round(damage * .27 * c), floodDamage: Math.round(damage * .21 * a) }
    }
    case 'Wildfire': {
      const burnedArea = round(1 + 1480 * square * (.36 + .64 * a))
      const deaths = Math.round(severe * (1 + 44 * b))
      return { duration: Math.round((3 + 55 * level + 8 * a) * 3600), deaths, injured: Math.round(deaths * (2 + 6 * c)),
        settlements: Math.round(27 * square + 3 * b), burnedArea, spotfires: Math.floor(level * (4 + 13 * c)),
        perimeter: round(burnedArea * (.18 + .33 * b)) }
    }
  }
}

export function seededForecasts(event, difficulty, damageTargets) {
  const eventIndex = Object.keys(forecasts).indexOf(event)
  const difficultyIndex = difficulties.indexOf(difficulty)
  if (eventIndex < 0 || difficultyIndex < 0) return []
  const { counts, origins } = forecasts[event]
  const count = counts[difficultyIndex]
  const targets = damageTargets(event, difficulty)
  const [, , fourStars, fiveStars] = targets
  const ceiling = fourStars + .5 * (fiveStars - fourStars)
  let seed = 12031 + 1039 * eventIndex + 313 * difficultyIndex
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0x100000000
  }
  return Array.from({ length: count }, (_, i) => {
    const roll = random()
    const percentile = i === count - 1 ? .975 + .02 * roll : (i + roll) / count
    const damage = Math.round(ceiling * (.00012 + percentile ** 3.65))
    const level = .76 * percentile + .24 * random()
    const metrics = { damage, ...sampleMetrics(event, damage, level, [random(), random(), random()]) }
    const [lat, lon] = origins[i % origins.length]
    const playerIndex = (i * 13 + eventIndex * 7 + difficultyIndex * 9) % handles.length
    return {
      id: `seed-${eventIndex}-${difficultyIndex}-${playerIndex}`,
      name: handles[playerIndex],
      player: (0x612ab8 + 105421 * playerIndex).toString(36).padStart(6, '0'),
      submitted: seededAt,
      summary: {
        placement: { event, difficulty, origin: 0, lat: round(lat + (random() - .5) * .7), lon: round(lon + (random() - .5) * .7) },
        stars: 1 + targets.filter(target => damage >= target).length,
        metrics,
      },
    }
  })
}

export function seededLeaderboard({ event, difficulty, metric }, damageTargets) {
  if (metric !== 'mastery') return seededForecasts(event, difficulty, damageTargets)
    .map(row => ({ ...row, score: row.summary.metrics[metric] }))
  const players = new Map()
  for (const event of Object.keys(forecasts)) for (const difficulty of difficulties) {
    for (const row of seededForecasts(event, difficulty, damageTargets)) {
      const prior = players.get(row.player)
      players.set(row.player, { ...row, score: (prior?.score ?? 0) + row.summary.stars })
    }
  }
  return [...players.values()]
}
