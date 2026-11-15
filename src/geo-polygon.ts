export function inside(x: number, y: number, ring: number[][]) {
  let found = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const py = ring[i][1]
    const prevY = ring[j][1]
    if ((py > y) === (prevY > y)) continue
    const px = ring[i][0]
    const prevX = ring[j][0]
    if (x < px + (prevX - px) * (y - py) / (prevY - py)) found = !found
  }
  return found
}
