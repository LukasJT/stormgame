// Sample forecasts are generated separately from the verified score database.
const difficulties = ['Easy', 'Normal', 'Hard', 'Expert']
const forecasts = {
  Tornado: { counts: [60, 54, 32, 16], origins: [[37.69, -97.34], [35.47, -97.52], [41.26, -95.94], [33.52, -86.81]] },
  Hurricane: { counts: [55, 44, 26, 12], origins: [[21, -87], [24, -83], [26.8, -77.1], [27.6, -89.5]] },
  Blizzard: { counts: [22, 18, 12, 6], origins: [[51.05, -114.07], [43.4, -87.1], [41.7, -70.3], [40.1, -105.2]] },
  Thunderstorm: { counts: [48, 40, 24, 10], origins: [[50.45, -104.62], [39.05, -95.68], [35.22, -101.83], [42.03, -93.62]] },
  Wildfire: { counts: [28, 22, 14, 8], origins: [[39.76, -121.62], [38.58, -120.54], [37.16, -119.42], [34.9, -118.57]] },
}
const firstWords = ['Amber', 'Cedar', 'Copper', 'Distant', 'Highland', 'Juniper', 'Silver', 'Willow']
const secondWords = ['Anvil', 'Creek', 'Finch', 'Gust', 'Horizon', 'Pine', 'Ridge', 'Skies']
const callsign = index => firstWords[index % 8] + ' ' + secondWords[Math.floor(index / 8)]
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
        pathKm: round(duration / 3600 * (22 + 57 * b)), peakWidth: Math.round(24 + 880 * square * (.45 + .55 * c)), peakEF: ef }
    }
    case 'Hurricane': {
      const wind = Math.round(32 + 112 * level)
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
        settlements: Math.round(82 * square + 4 * b), snowfall: round(1.2 + 63 * square + 7 * a),
        whiteout: Math.round(severe * (4 + 55 * b)) }
    }
    case 'Thunderstorm': {
      const funnels = Math.floor(level * 10 + a)
      const longestFunnel = funnels ? round(2 + level * (6 + 21 * b)) : 0
      const deaths = Math.round(severe * (3 + 57 * b))
      return { duration: Math.round((1 + 9 * level + 2 * a) * 3600), deaths, injured: Math.round(deaths * (3 + 10 * c)),
        settlements: Math.round(48 * square + 4 * b), funnels, outbreak: Math.min(funnels, Math.ceil(funnels * .44)),
        combinedPath: round(longestFunnel * (funnels ? 1 + (funnels - 1) * (.2 + .55 * c) : 0)), longestFunnel,
        funnelEF: funnels ? Math.min(4, Math.floor(level * 4.5)) : 0, funnelDamage: funnels ? Math.round(damage * (.08 + .33 * b)) : 0,
        hailDamage: Math.round(damage * .27 * c), floodDamage: Math.round(damage * .21 * a) }
    }
    case 'Wildfire': {
      const burnedArea = round(1 + 1170 * square * (.36 + .64 * a))
      const deaths = Math.round(severe * (1 + 44 * b))
      return { duration: Math.round((3 + 55 * level + 8 * a) * 3600), deaths, injured: Math.round(deaths * (2 + 6 * c)),
        settlements: Math.round(27 * square + 3 * b), burnedArea, spotfires: Math.floor(level * (4 + 13 * c)),
        perimeter: round(burnedArea * (.18 + .33 * b)) }
    }
  }
}

export function demoLeaderboard({ event, difficulty, metric }, damageTargets) {
  const eventIndex = Object.keys(forecasts).indexOf(event)
  const difficultyIndex = difficulties.indexOf(difficulty)
  if (eventIndex < 0 || difficultyIndex < 0) return []
  if (metric === 'mastery') {
    return Array.from({ length: 24 }, (_, i) => ({
      name: callsign(i * 13 % 64),
      score: Math.round(1 + 37 * ((23 - i) / 23) ** 2),
    }))
  }

  const { counts, origins } = forecasts[event]
  const count = counts[difficultyIndex]
  const [, threeStarTarget] = damageTargets(event, difficulty)
  let seed = 12031 + 1039 * eventIndex + 313 * difficultyIndex
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0x100000000
  }
  return Array.from({ length: count }, (_, i) => {
    const percentile = (i + random()) / count
    const damage = Math.round(threeStarTarget * (.00025 + 1.15 * percentile ** 3.5))
    const level = .76 * percentile + .24 * random()
    const metrics = { damage, ...sampleMetrics(event, damage, level, [random(), random(), random()]) }
    const [lat, lon] = origins[i % origins.length]
    return {
      name: callsign((i * 13 + eventIndex * 7 + difficultyIndex * 9) % 64),
      score: metrics[metric],
      lat: round(lat + (random() - .5) * .7), lon: round(lon + (random() - .5) * .7),
    }
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}
