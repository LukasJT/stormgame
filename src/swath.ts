import type { MapPoint } from './convection'
import { efMinimum, windBand } from './impact'

export const efColors = ['#bcebf0', '#85e79e', '#ffde69', '#ffa051', '#ff5d65', '#e292ff']
export type Swath = { points: MapPoint[]; ef: number; wind: number; width: number; scour: boolean }

const core = .57
const taper = .74

function windAt(peak: number, offset: number) {
  const edge = Math.max(0, (offset - core) / (1 - core))
  return peak * (1 - taper * edge ** 1.4)
}

// The widths are nested around the peak wind track. Each successive band
// begins at a higher wind threshold and occupies a narrower part of the path.
export function tornadoBands(peak: number, width: number) {
  return efMinimum.flatMap((min, ef) => {
    if (min > peak) return []
    const edge = Math.min(1, ((1 - min / peak) / taper) ** (1 / 1.4))
    return [{ ef, width: width * (core + (1 - core) * edge) }]
  })
}

export function tornadoStrips(peak: number, width: number) {
  const bands = tornadoBands(peak, width)
  return bands.flatMap((band, i) => {
    const inner = bands[i + 1]?.width
    if (inner === undefined) return [{ offset: 0, width: band.width, wind: peak }]
    if (band.width === inner) return []
    const offset = (band.width + inner) / 4
    const strip = { width: (band.width - inner) / 2, wind: windAt(peak, offset * 2 / width) }
    return [{ ...strip, offset: -offset }, { ...strip, offset }]
  })
}

export function markSwath(path: Swath[], from: MapPoint, to: MapPoint, windMph: number, widthKm: number) {
  const width = Math.max(.001, Math.round(widthKm * 1000) / 1000)
  const wind = Math.floor(windMph * 10) / 10
  const ef = windBand(wind)
  // This is a ground-susceptibility proxy for the visual, independent of the EF rating.
  const susceptibility = Math.sin(to.x * 3.6 + to.y * 2.1)
  const scour = ef >= 3 && width >= .42 && susceptibility > (ef === 3 ? .65 : ef === 4 ? .18 : -.38)
  const last = path.at(-1)
  if (last?.points.at(-1) === from && last.wind === wind && last.width === width && last.scour === scour) {
    last.points.push(to)
  } else {
    path.push({ points: [from, to], ef, wind, width, scour })
  }
}
