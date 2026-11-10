import { random } from './convection'
import type { Storm } from './world'

export const usesTornadoEconomy = (storm: Storm) => storm === 'Tornado' || storm === 'Thunderstorm' || storm === 'Wildfire'
export const startingMomentum = (storm: Storm) => storm === 'Hurricane' ? 20 : usesTornadoEconomy(storm) ? 10 : 5
const pickupLifetime = 42

const opportunities: Partial<Record<Storm, readonly string[]>> = {
  Tornado: ['Warm Air', 'Moist Inflow', 'Wind Shear', 'Unstable Air'],
  Hurricane: ['Warm Water', 'Moist Air', 'Deep Ocean Heat'],
  Blizzard: ['Arctic Air', 'Lake Moisture', 'Fresh Snowpack'],
  Wildfire: ['Dry Fuels', 'Gusty Winds', 'Low Humidity'],
  'Dust Storm': ['Loose Topsoil', 'Dry Ground', 'Strong Gusts'],
  'Heat Dome': ['Sinking Air', 'Clear Skies', 'Dry Soil'],
}
const thunderstormOpportunities = ['Warm Air', 'Rising Moisture', 'Wind Shear', 'Unstable Air']

export type WeatherPickup = { time: number; expires: number; label: string; points: number }

export function momentumSchedule(seed: number, storm: Storm) {
  let salt = 0x156ADF09
  for (const letter of storm) salt = Math.imul(salt, 31) + letter.charCodeAt(0)
  const roll = random(seed ^ salt)
  const labels = opportunities[storm] ?? thunderstormOpportunities
  if (storm === 'Hurricane') {
    // The first four minutes fund formation upgrades before short offshore tracks reach land.
    const earlyAwards = 15
    const awards = Array.from({ length: earlyAwards + 15 }, (_, index) => {
      const early = index < earlyAwards
      const time = early ? 5 + index * 16 + Math.floor(roll() * 8) : 243 + (index - earlyAwards) * 57 + Math.floor(roll() * 35)
      return { time, points: early ? 5 + Number(roll() < .35) : 2 + Number(roll() < .22) }
    })
    const pickups = Array.from({ length: 12 }, (_, index): WeatherPickup => {
      const early = index < 5
      const time = early ? 11 + index * 48 + Math.floor(roll() * 6) : 260 + (index - 5) * 103 + Math.floor(roll() * 37)
      const label = labels[Math.floor(roll() * labels.length)]
      const points = early ? 6 + Number(roll() < .35) : 3 + Number(roll() < .25)
      return { time, expires: time + pickupLifetime, label, points }
    })
    return { awards, pickups }
  }
  if (usesTornadoEconomy(storm)) {
    const awards = Array.from({ length: 40 }, (_, index) => ({
      time: 12 + index * 23 + Math.floor(roll() * 15),
      points: roll() < .35 ? 3 : 2,
    }))
    const pickups = Array.from({ length: 19 }, (_, index): WeatherPickup => {
      const time = 22 + index * 48 + Math.floor(roll() * (index ? 6 : 9))
      return { time, expires: time + pickupLifetime, label: labels[Math.floor(roll() * labels.length)], points: 3 + Math.floor(roll() * 3) }
    })
    return { awards, pickups }
  }
  const awards = Array.from({ length: 18 }, (_, index) => ({
    time: 14 + index * 57 + Math.floor(roll() * 35),
    points: roll() < .22 ? 2 : 1,
  }))
  const pickups = Array.from({ length: 10 }, (_, index): WeatherPickup => {
    const time = 27 + index * 103 + Math.floor(roll() * 37)
    return { time, expires: time + pickupLifetime, label: labels[Math.floor(roll() * labels.length)], points: roll() < .25 ? 3 : 2 }
  })
  return { awards, pickups }
}
