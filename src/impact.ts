// Wind fragility and shelter rates adapted from Tornado Simulator (MIT).
const structures = [
  { share: .10, value: 45_000, fragility: [.15, .70, .98, 1, 1] },
  { share: .55, value: 180_000, fragility: [.01, .10, .55, .90, .99] },
  { share: .25, value: 250_000, fragility: [.005, .05, .35, .75, .95] },
  { share: .10, value: 500_000, fragility: [.001, .01, .08, .30, .65] },
]
const outside = [.0001, .001, .005, .02, .08, .25]
const interior = [.00001, .0001, .001, .005, .025, .10]
const basement = [.000001, .00001, .0001, .001, .008, .04]
const shelter = [0, 0, .00001, .0001, .001, .005]

export const homeReplacement = structures.reduce((total, item) => total + item.share * item.value, 0)
export const efWind = [76, 104, 127, 157, 188, 235]
export const efMinimum = [65, 86, 111, 136, 166, 201]
export const windBand = (wind: number) => Math.max(0, efMinimum.filter(min => wind >= min).length - 1)

export function tornadoWindProfile(windBonus: number, widthBonus: number, coupling = 1, coherence = 1) {
  const windMph = Math.round((65 + windBonus * coupling) * coherence)
  const ef = windBand(windMph)
  const widthKm = Math.min(4.2, .04 + coupling * (ef ** 2 * .036 + widthBonus)) * coherence
  return { windMph, ef, widthKm: Math.round(widthKm * 100) / 100 }
}

export const tornadoHailShare = (hail: number) => .0154 * hail
export const tornadoRunoffShare = (floodPower: number) => .0048 * floodPower
export const tornadoPropertyProtection = (preparedShare: number, leadMinutes: number) =>
  .30 * preparedShare * Math.min(1, leadMinutes / .75)

export function tornadoDebrisBonus(wind: number, debris: number) {
  if (wind < efMinimum[1]) return 0
  return debris * Math.min(1, .25 + .75 * (wind - efMinimum[1]) / (efMinimum[3] - efMinimum[1]))
}

function probabilityAtWind(wind: number, values: number[]) {
  if (wind <= 50) return values[0] * Math.max(0, wind / 50)
  if (wind >= 250) return values[4]
  const index = Math.floor(wind / 50) - 1
  return values[index] + (values[index + 1] - values[index]) * (wind % 50) / 50
}

export function lossPerHome(wind: number, gentleTornado = false) {
  const loss = structures.reduce((total, { share, value, fragility }) => {
    const destroyed = probabilityAtWind(wind, fragility) * .6
    const damaged = Math.min(1, destroyed * 2.5) - destroyed
    return total + share * value * (destroyed + damaged * .35)
  }, 0)
  return loss * (gentleTornado && windBand(wind) === 0 ? .08 : 1)
}

export function fatalityRate(wind: number, protectedShare: number, leadMinutes: number, preparedness: number) {
  const band = windBand(wind)
  if (band === 0) return 0
  const exposed = .1 * outside[band] + .9 * interior[band]
  const protectedRate = .7 * basement[band] + .3 * shelter[band]
  return ((1 - protectedShare) * exposed + protectedShare * protectedRate)
    * Math.max(0, 1 - leadMinutes * .018) * (1 - preparedness * .4)
}

export const injuryToFatality = 15
export const sweptShare = (distanceKm: number, widthKm: number, areaSqMi: number) =>
  Math.min(1, distanceKm * widthKm / (areaSqMi * 2.58999))
