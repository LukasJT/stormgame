import type { Run } from './sim'

export const snowfallScale = [
  [0.3, '#b5a9f4'], [1, '#8f82ee'], [2, '#5755ec'], [4, '#3743bf'],
  [6, '#7138bd'], [8, '#9338c5'], [10, '#bd42bc'], [14, '#ec4ea3'],
  [18, '#fa77b8'], [24, '#ffacd0'], [30, '#ffe0f1'],
] as const

type Vertex = { x: number; y: number; depth: number }
const key = (x: number, y: number) => x + ',' + y
const cache = new WeakMap<Run, { time: number; world: boolean; svg: string }>()

// Interpolate the edge of each accumulation band between neighboring grid samples.
function contour(triangle: Vertex[], threshold: number) {
  const points: { x: number; y: number }[] = []
  for (let index = 0; index < triangle.length; index++) {
    const a = triangle[index]
    const b = triangle[(index + 1) % triangle.length]
    if (a.depth >= threshold) points.push(a)
    if ((a.depth >= threshold) === (b.depth >= threshold)) continue
    const fraction = (threshold - a.depth) / (b.depth - a.depth)
    points.push({ x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction })
  }
  if (points.length < 3) return ''
  return points.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('') + 'Z'
}

export function drawSnowfall(run: Run, world: boolean) {
  if (!run.snow) return ''
  const time = run.time - run.time % 4
  const saved = cache.get(run)
  if (saved?.time === time && saved.world === world) return saved.svg
  const cells = new Map<string, number>()
  const squares = new Map<string, { x: number; y: number }>()
  for (const [{ zone }, { cm }] of run.snow.deposits) {
    const worldX = Math.floor(zone.x) + .5
    const x = world ? worldX : worldX + Math.round((run.front!.point.x - worldX) / 3600) * 3600
    const y = Math.floor(zone.y) + .5
    cells.set(key(x, y), Math.max(cells.get(key(x, y)) ?? 0, cm / 2.54))
    for (const dx of [-1, 0]) for (const dy of [-1, 0]) {
      squares.set(key(x + dx, y + dy), { x: x + dx, y: y + dy })
    }
  }
  const layers = snowfallScale.map(() => [] as string[])
  for (const { x, y } of squares.values()) {
    if (world && (x < 0 || x > 3599)) continue
    const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]
      .map(([x, y]) => ({ x, y, depth: cells.get(key(x, y)) ?? 0 }))
    const middle = { x: x + .5, y: y + .5, depth: corners.reduce((sum, v) => sum + v.depth, 0) / 4 }
    const peak = Math.max(...corners.map(point => point.depth))
    for (const [index, [threshold]] of snowfallScale.entries()) {
      if (threshold > peak) break
      for (let side = 0; side < 4; side++) {
        layers[index].push(contour([corners[side], corners[(side + 1) % 4], middle], threshold))
      }
    }
  }
  const paths = layers.map((parts, index) => parts.length
    ? `<path fill="${snowfallScale[index][1]}" d="${parts.join('')}"/>` : '').join('')
  const svg = `<g class="weather-layer snowfall-layer" data-snowfall-layer role="img" aria-label="Accumulated snowfall" pointer-events="none">${paths}</g>`
  cache.set(run, { time, world, svg })
  return svg
}
