export function inside(x: number, y: number, ring: number[][]) {
  let found = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [px, py] = ring[i]
    const [prevX, prevY] = ring[j]
    if ((py > y) !== (prevY > y) && x < px + (prevX - px) * (y - py) / (prevY - py)) found = !found
  }
  return found
}
