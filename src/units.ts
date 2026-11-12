import { settings } from './profile'
import { localizedNumber } from './i18n'

const kilometersPerMile = 1.609344

export function formatDistance(km: number) {
  if (settings.units === 'imperial') return `${localizedNumber(km / kilometersPerMile, 3)} mi`
  return km > 0 && km < 1 ? `${localizedNumber(km * 1000)} m` : `${localizedNumber(km, 1)} km`
}

export function windSpeed(mph: number) {
  return settings.units === 'metric' ? `${Math.round(mph * kilometersPerMile)} km/h` : `${Math.round(mph)} mph`
}

export function temperature(celsius: number) {
  return settings.units === 'metric' ? `${Math.round(celsius)} °C` : `${Math.round(celsius * 1.8 + 32)} °F`
}

export function measurementText(description: string) {
  return description.replace(/(\d+(?:\.\d+)?) (mph|km|m)\b/g, (_, value: string, unit: string) =>
    unit === 'mph' ? windSpeed(Number(value)) : formatDistance(Number(value) / (unit === 'm' ? 1000 : 1)))
}

export function snowfallDepth(cm: number) {
  return settings.units === 'metric' ? `${localizedNumber(cm, 1)} cm` : `${localizedNumber(cm / 2.54, 1)} in`
}
