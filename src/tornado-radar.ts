const palette = ['#368aa1', '#2a9861', '#45b751', '#a2c551', '#e2c74e', '#e7864e']
const edges = [.15, .24, .36, .50, .67, .84]
const cells = 72
const step = 2 / cells
const cellHeight = (step + .002).toFixed(3)
const tau = Math.PI * 2

function rainCore(x: number, y: number, dx: number, dy: number, rx: number, ry: number) {
  return Math.exp(-(((x - dx) / rx) ** 2 + ((y - dy) / ry) ** 2))
}

export function tornadoRadar(time: number, strength: number, wind: number, phase: number) {
  // Storm-relative axes: +x points along the track and +y toward its right flank.
  // The broad rain core leads the circulation. The rear-flank band wraps inward.
  const organization = Math.min(1, .23 + strength * .48 + Math.max(0, wind - 65) / 310)
  const pulse = Math.sin(time * .23 + phase)
  const wrap = 2.8 + organization * 1.7
  const paths = palette.map(() => '')
  for (let row = 0; row < cells; row++) {
    const y = -1 + (row + .5) * step
    let previous = -1
    let start = 0
    for (let col = 0; col <= cells; col++) {
      let band = -1
      if (col < cells) {
        const x = -1 + (col + .5) * step
        const forward = rainCore(x, y, .27 + pulse * .026, -.33, .44, .24)
        const flank = rainCore(x, y, -.08, -.32 + pulse * .032, .30, .17)
        const angle = ((-Math.PI / 2 - Math.atan2(y, x) + tau) % tau) / wrap
        const radius = .34 - Math.min(1, angle) * .27
        const hook = angle < 1 ? Math.exp(-((Math.hypot(x, y) - radius) ** 2) / .008)
          * Math.min(1, (1 - angle) * 9) : 0
        const grain = .91 + .085 * Math.sin(x * 37 + y * 17 - time * .31 + phase)
          + .065 * Math.sin(y * 53 - x * 19 + time * .18)
        const echo = (forward * (.47 + organization * .28) + flank * .27 + hook * (.22 + organization * .36)) * grain
        for (let i = 0; i < edges.length && echo >= edges[i]; i++) band = i
      }
      if (band === previous) continue
      if (previous >= 0) {
        const left = (-1 + start * step).toFixed(3)
        const top = (-1 + row * step).toFixed(3)
        const width = ((col - start) * step + .002).toFixed(3)
        paths[previous] += `M${left} ${top}h${width}v${cellHeight}h-${width}Z`
      }
      start = col
      previous = band
    }
  }
  return paths.map((path, index) => path ? `<path fill="${palette[index]}" d="${path}"/>` : '').join('')
}
