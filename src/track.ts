type Point = { x: number; y: number }

export function alongTrack(points: Point[], index: number, fraction: number): Point {
  const a = points[index]
  const b = points[index + 1] ?? a
  const before = points[index - 1] ?? a
  const after = points[index + 2] ?? b
  const t = Math.min(1, Math.max(0, fraction))
  const interpolate = (key: keyof Point) => {
    const u = 1 - t
    const c = a[key] + (b[key] - before[key]) / 7
    const d = b[key] - (after[key] - a[key]) / 7
    return u ** 3 * a[key] + 3 * u ** 2 * t * c + 3 * u * t ** 2 * d + t ** 3 * b[key]
  }
  return { x: interpolate('x'), y: interpolate('y') }
}

export function pathFor(points: Point[], world: boolean, precision = 2) {
  let previous: number | undefined
  return points.map(point => {
    const x = world ? ((point.x % 3600) + 3600) % 3600 : point.x
    const first = previous === undefined || Math.abs(x - previous) > 1800
    previous = x
    return `${first ? 'M' : 'L'}${x.toFixed(precision)} ${point.y.toFixed(precision)}`
  }).join(' ')
}
