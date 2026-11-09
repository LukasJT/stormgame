const nasa = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/500m'

export function drawSatelliteTiles(svg: SVGSVGElement, box: { x: number; y: number; width: number; height: number }, pixels: number) {
  const layer = svg.querySelector<SVGGElement>('[data-satellite-tiles]')
  if (!layer) return
  const scale = box.width / pixels
  if (scale >= .4) {
    if (layer.dataset.tileSet) {
      layer.replaceChildren()
      delete layer.dataset.tileSet
    }
    return
  }

  // EPSG:4326 matrices start at 180° W, 90° N and use 512 px tiles.
  let level = 4
  let span = 180
  while (span / 512 > scale && level < 7) {
    level++
    span /= 2
  }
  const columns = 3600 / span
  const west = Math.floor(box.x / span)
  const east = Math.ceil((box.x + box.width) / span)
  const north = Math.max(0, Math.floor(box.y / span))
  const south = Math.min(1800 / span, Math.ceil((box.y + box.height) / span))
  const tileSet = `${level}/${west}/${east}/${north}/${south}`
  if (layer.dataset.tileSet === tileSet) return
  layer.dataset.tileSet = tileSet

  const tiles: string[] = []
  for (let row = north; row < south; row++) {
    for (let col = west; col < east; col++) {
      const wrapped = ((col % columns) + columns) % columns
      tiles.push(`<image href="${nasa}/${level}/${row}/${wrapped}.jpeg" x="${col * span}" y="${row * span}" width="${span}" height="${span}"/>`)
    }
  }
  layer.innerHTML = tiles.join('')
}
