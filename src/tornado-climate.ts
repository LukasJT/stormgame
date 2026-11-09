import { inside } from './geo-polygon'

export const tornadoClimateTiers = [
  { label: 'Some support', color: '#ffd260', support: .56 },
  { label: 'Favorable', color: '#ff9a3e', support: .80 },
  { label: 'Most favorable', color: '#ff5147', support: 1 },
] as const

// Approximate game regions, in longitude/latitude. Draw the same boundaries used by the simulation.
export const tornadoClimateRegions: { tier: 0 | 1 | 2; ring: number[][] }[] = [
  { tier: 0, ring: [[-123, 49], [-111, 54], [-96, 53], [-82, 48], [-69, 45], [-78, 35], [-81, 26], [-94, 25], [-99, 20], [-112, 30], [-122, 37]] },
  { tier: 1, ring: [[-107, 49], [-96, 50], [-84, 46], [-75, 40], [-82, 33], [-87, 29], [-98, 29], [-104, 34]] },
  { tier: 2, ring: [[-103, 44], [-97, 45], [-91, 41], [-86, 36], [-89, 32], [-98, 32], [-103, 36]] },
  { tier: 0, ring: [[-11, 50], [-7, 57], [9, 58], [24, 62], [51, 61], [67, 54], [54, 47], [35, 44], [28, 36], [12, 37], [-9, 37]] },
  { tier: 1, ring: [[-3, 51], [8, 53], [20, 51], [33, 48], [27, 41], [16, 41], [4, 44]] },
  { tier: 0, ring: [[67, 55], [72, 61], [83, 60], [93, 54], [90, 49], [75, 49]] },
  { tier: 0, ring: [[109, 44], [119, 50], [132, 48], [145, 44], [141, 34], [126, 30], [119, 22], [110, 27]] },
  { tier: 1, ring: [[113, 38], [123, 40], [130, 35], [122, 29], [114, 30]] },
  { tier: 0, ring: [[75, 29], [86, 30], [97, 27], [95, 20], [83, 20], [76, 23]] },
  { tier: 1, ring: [[86, 27], [94, 27], [93, 21], [87, 22]] },
  { tier: 0, ring: [[-66, -21], [-53, -21], [-45, -26], [-48, -34], [-56, -42], [-67, -42], [-70, -32]] },
  { tier: 1, ring: [[-64, -28], [-55, -26], [-50, -30], [-55, -36], [-63, -38], [-67, -34]] },
  { tier: 0, ring: [[20, -24], [30, -23], [34, -28], [28, -34], [22, -35], [18, -31]] },
  { tier: 0, ring: [[112, -28], [121, -29], [121, -35], [114, -36], [111, -33]] },
  { tier: 0, ring: [[129, -12], [139, -12], [139, -20], [134, -24], [129, -19]] },
  { tier: 0, ring: [[146, -18], [154, -23], [154, -33], [148, -40], [139, -39], [137, -34], [144, -27]] },
  { tier: 0, ring: [[168, -35], [178, -35], [178, -44], [169, -47], [165, -44]] },
]

function distanceToEdge(lon: number, lat: number, ring: number[][]) {
  let distance = Infinity
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[j]
    const dx = ring[i][0] - x
    const dy = ring[i][1] - y
    const along = Math.max(0, Math.min(1, ((lon - x) * dx + (lat - y) * dy) / (dx * dx + dy * dy)))
    distance = Math.min(distance, Math.hypot(lon - x - dx * along, lat - y - dy * along))
  }
  return distance
}

const regions = tornadoClimateRegions.map(({ ring, tier }) => ({
  ring, tier, west: Math.min(...ring.map(p => p[0])) - 4, east: Math.max(...ring.map(p => p[0])) + 4,
  south: Math.min(...ring.map(p => p[1])) - 4, north: Math.max(...ring.map(p => p[1])) + 4,
}))

export function tornadoClimate(lat: number, lon: number) {
  let support = .22 * Math.max(0, Math.min(1, (68 - Math.abs(lat)) / 21))
  for (const { ring, tier, west, east, south, north } of regions) {
    if (lon < west || lon > east || lat < south || lat > north) continue
    const distance = distanceToEdge(lon, lat, ring)
    const proximity = inside(lon, lat, ring) ? .82 + .18 * Math.min(1, distance / 3) : .82 * Math.max(0, 1 - distance / 4)
    support = Math.max(support, tornadoClimateTiers[tier].support * proximity)
  }
  return support
}

export function tornadoSupportLabel(support: number) {
  if (support >= .82) return 'Very favorable'
  if (support >= .58) return 'Favorable'
  if (support >= .32) return 'Limited support'
  if (support >= .12) return 'Unfavorable'
  return 'Extremely unfavorable'
}
