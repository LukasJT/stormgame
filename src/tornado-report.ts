import { dateFormatter, stormClock } from './storm-clock'

export const tornadoTickSeconds = 15

export type TornadoRecord = {
  startedAt: number; lengthKm: number; groundTicks: number; maxWidthKm: number; peakEf: number | null
  places: Set<string>; travelKm: number; awareness: number; deaths: number
  nextSatellite: number; manualSatellite: number; chaserExposure: number
}

export function tornadoStartDate(today = new Date()) {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15).getTime()
}

export const tornadoDate = (startedAt: number) => dateFormatter('long').format(startedAt)

export function tornadoClock(startedAt: number, ticks: number) {
  return stormClock(startedAt, ticks, tornadoTickSeconds)
}

export function tornadoDuration(ticks: number) {
  const minutes = Math.floor(ticks * tornadoTickSeconds / 60)
  if (!minutes) return ticks ? '<1 min' : '0 min'
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours} hr ${minutes % 60} min` : `${minutes} min`
}

export function tornadoVerdict(record: TornadoRecord, damage: number, deaths: number, countryDeaths: ReadonlyMap<string, number>) {
  if (deaths > 1300) return 'Deadliest tornado in recorded history'
  if ((countryDeaths.get('US') ?? 0) > 695) return 'Deadliest tornado in American history'
  if ((countryDeaths.get('CA') ?? 0) > 28) return 'Deadliest tornado in Canadian history'
  if (deaths) return 'Deadly tornado leaves a trail of destruction'
  if (record.peakEf === null) return 'Waterspout dissipates offshore'
  if (damage && (damage >= 1_000_000 || record.peakEf >= 2)) return 'Damaging tornado sweeps through the region'
  if (damage && record.places.size === 0) return 'Minor tornado leaves scattered rural damage'
  if (damage) return 'Minor tornado causes localized damage'
  return 'Brief tornado dissipates with no reported damage'
}
