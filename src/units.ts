import { settings } from './profile'

const distance = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const kilometersPerMile = 1.609344
const miles = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 })

export function formatDistance(km: number) {
  if (settings.units === 'imperial') return `${miles.format(km / kilometersPerMile)} mi`
  return km > 0 && km < 1 ? `${Math.round(km * 1000)} m` : `${distance.format(km)} km`
}

export function windSpeed(mph: number) {
  return settings.units === 'metric' ? `${Math.round(mph * kilometersPerMile)} km/h` : `${Math.round(mph)} mph`
}

export function waterDepth(meters: number) {
  return settings.units === 'metric' ? `${meters.toFixed(1)} m` : `${(meters / .3048).toFixed(1)} ft`
}

export function temperature(celsius: number) {
  return settings.units === 'metric' ? `${Math.round(celsius)} °C` : `${Math.round(celsius * 1.8 + 32)} °F`
}

export function measurementText(description: string) {
  return description.replace(/(\d+(?:\.\d+)?) (mph|km|m)\b/g, (_, value: string, unit: string) =>
    unit === 'mph' ? windSpeed(Number(value)) : formatDistance(Number(value) / (unit === 'm' ? 1000 : 1)))
}
