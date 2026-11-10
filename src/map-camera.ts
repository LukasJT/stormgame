import { drawCities, loadCities } from './cities'
import { drawSatelliteTiles } from './satellite-tiles'
import { kmPerX } from './convection'

type Point = { x: number; y: number }
type Box = Point & { width: number; height: number }
type Camera = { home: Box; center: Point; zoom: number; key: string; detached: boolean }
type Gesture = { center: Point; distance: number }

const earthWidth = 3600
const earthHeight = 1800
const minZoom = 1
const worldZoom = 256
const regionalZoom = 48
const zoomStep = 1.45
const dragThreshold = 5
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function centerOf(box: Box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

export class MapCamera {
  private svg: SVGSVGElement | null = null
  private camera: Camera | null = null
  private world: Camera | null = null
  private region: Camera | null = null
  private pointers = new Map<number, Point>()
  private previous: Gesture | null = null
  private dragging = false
  private suppressClick = false
  private readonly zoomIn: HTMLButtonElement
  private readonly zoomOut: HTMLButtonElement

  constructor(private readonly surface: HTMLElement, tools: HTMLElement, onRelease: () => void) {
    this.zoomIn = tools.querySelector<HTMLButtonElement>('[data-camera="in"]')!
    this.zoomOut = tools.querySelector<HTMLButtonElement>('[data-camera="out"]')!
    tools.addEventListener('click', event => {
      const action = (event.target as Element).closest<HTMLElement>('[data-camera]')?.dataset.camera
      if (action === 'in') this.zoom(zoomStep)
      if (action === 'out') this.zoom(1 / zoomStep)
      if (action === 'reset') this.reset()
    })
    surface.addEventListener('wheel', event => {
      event.preventDefault()
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight : 1
      this.zoom(Math.exp(clamp(-event.deltaY * units * .002, -.7, .7)), { x: event.clientX, y: event.clientY })
    }, { passive: false })
    surface.addEventListener('pointerdown', this.press)
    window.addEventListener('pointermove', this.move)
    window.addEventListener('pointerup', event => this.release(event, onRelease))
    window.addEventListener('pointercancel', event => this.release(event, onRelease))
    window.addEventListener('blur', () => {
      if (this.pointers.size) {
        this.pointers.clear()
        this.endGesture(onRelease)
      }
    })
    surface.addEventListener('click', event => {
      if (this.suppressClick && event.detail !== 0) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }, { capture: true })
    surface.addEventListener('keydown', event => this.handleKey(event))
    new ResizeObserver(() => this.apply()).observe(surface)
  }

  get interacting() {
    return this.pointers.size > 0
  }

  private get maxZoom() {
    return this.camera?.key === 'world' ? worldZoom : regionalZoom
  }

  attach(key: string, follow?: Point) {
    const svg = this.surface.querySelector<SVGSVGElement>('svg.atlas')
    if (!svg || svg === this.svg) return
    if (!this.svg) void loadCities().then(() => this.apply())
    const oldTiles = this.svg?.querySelector('[data-satellite-tiles]')
    if (oldTiles && this.camera?.key === key) svg.querySelector('[data-satellite-tiles]')?.replaceWith(oldTiles)
    this.svg = svg
    const saved = key === 'world' ? this.world : this.region
    if (saved?.key === key) this.camera = saved
    else {
      const { x, y, width, height } = svg.viewBox.baseVal
      const home = { x, y, width, height }
      this.camera = { key, home, center: centerOf(home), zoom: minZoom, detached: false }
      if (key === 'world') this.world = this.camera
      else this.region = this.camera
    }
    if (follow) {
      const { width, height } = this.camera.home
      this.camera.home = { x: follow.x - width / 2, y: follow.y - height / 2, width, height }
      if (!this.camera.detached) this.camera.center = follow
    }
    this.apply()
  }

  private box(): Box | null {
    const { clientWidth, clientHeight } = this.surface
    if (!this.camera || !clientWidth || !clientHeight) return null
    const { home, center, zoom } = this.camera
    const aspect = clientWidth / clientHeight
    const width = Math.max(home.width, home.height * aspect) / zoom
    const height = width / aspect
    const world = this.camera.key === 'world'
    const left = world ? 0 : centerOf(home).x - earthWidth / 2
    // Allow margins near the edges so a zoom anchor stays put as the globe fills the viewport.
    const x = world && zoom === minZoom ? earthWidth / 2 : clamp(center.x, left, left + earthWidth)
    const y = world && zoom === minZoom ? earthHeight / 2 : clamp(center.y, 0, earthHeight)
    return { x: x - width / 2, y: y - height / 2, width, height }
  }

  private apply() {
    const box = this.box()
    if (!box || !this.svg || !this.camera) return
    this.camera.center = centerOf(box)
    this.svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`)
    this.svg.toggleAttribute('data-precise', box.width < 300)
    for (const pin of this.svg.querySelectorAll('[data-camera-scaled]')) {
      const scale = pin.getAttribute('data-camera-scaled') === 'screen' ? box.width / this.surface.clientWidth : 1 / this.camera.zoom
      pin.setAttribute('transform', `scale(${scale})`)
    }
    const unitsPerPixel = box.width / this.surface.clientWidth
    const kmPerPixel = unitsPerPixel * 11.1
    this.svg.toggleAttribute('data-local-weather', kmPerPixel < 15)
    const weather = this.svg.querySelector<SVGGElement>('[data-weather-scale]')
    if (weather) {
      const diameter = Number(weather.dataset.weatherScale)
      const x = diameter / kmPerX(Number(weather.dataset.weatherY))
      const y = diameter / 11.1
      const sizeFade = clamp((y / unitsPerPixel - 2.5) / 8.5, 0, 1)
      const zoomFade = clamp((26 - kmPerPixel) / 14, 0, 1)
      weather.setAttribute('transform', `scale(${x} ${y})`)
      const heatDome = weather.parentElement?.getAttribute('data-weather-kind') === 'heat-dome'
      const opacity = heatDome ? Math.max(.68, sizeFade * zoomFade) : sizeFade * zoomFade
      weather.setAttribute('opacity', opacity.toFixed(3))
    }
    drawCities(this.svg, box, this.surface.clientWidth)
    drawSatelliteTiles(this.svg, box, this.surface.clientWidth)
    this.zoomIn.disabled = this.camera.zoom >= this.maxZoom
    this.zoomOut.disabled = this.camera.zoom <= minZoom
  }

  reset() {
    if (!this.camera) return
    this.camera.center = centerOf(this.camera.home)
    this.camera.zoom = minZoom
    this.camera.detached = false
    this.apply()
  }

  private zoom(factor: number, point?: Point) {
    const rect = this.surface.getBoundingClientRect()
    const anchor = point ?? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    this.transform(factor, anchor, anchor)
  }

  private transform(factor: number, from: Point, to: Point) {
    const box = this.box()
    if (!box || !this.camera) return
    const rect = this.surface.getBoundingClientRect()
    const nextZoom = clamp(this.camera.zoom * factor, minZoom, this.maxZoom)
    const ratio = this.camera.zoom / nextZoom
    const x = box.x + (from.x - rect.left) * box.width / rect.width
    const y = box.y + (from.y - rect.top) * box.height / rect.height
    this.camera.zoom = nextZoom
    this.camera.detached = true
    this.camera.center = {
      x: x + (.5 - (to.x - rect.left) / rect.width) * box.width * ratio,
      y: y + (.5 - (to.y - rect.top) / rect.height) * box.height * ratio,
    }
    this.apply()
  }

  private gesture(): Gesture | null {
    const [first, second] = this.pointers.values()
    if (!first) return null
    if (!second) return { center: first, distance: 0 }
    return {
      center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      distance: Math.hypot(first.x - second.x, first.y - second.y),
    }
  }

  private press = (event: PointerEvent) => {
    if (event.button !== 0 || this.pointers.size >= 2) return
    if (!this.pointers.size) this.suppressClick = false
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    this.previous = this.gesture()
    if (this.pointers.size > 1) this.startGesture()
  }

  private startGesture() {
    this.dragging = true
    this.suppressClick = true
    this.surface.classList.add('is-dragging')
    for (const id of this.pointers.keys()) this.surface.setPointerCapture(id)
  }

  private move = (event: PointerEvent) => {
    if (!this.pointers.has(event.pointerId) || !this.previous) return
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const next = this.gesture()!
    const { center, distance } = this.previous
    if (!this.dragging && Math.hypot(next.center.x - center.x, next.center.y - center.y) < dragThreshold) return
    if (!this.dragging) this.startGesture()
    this.transform(distance && next.distance ? next.distance / distance : 1, center, next.center)
    this.previous = next
  }

  private release(event: PointerEvent, onRelease: () => void) {
    if (!this.pointers.delete(event.pointerId)) return
    this.previous = this.gesture()
    if (!this.pointers.size) this.endGesture(onRelease)
  }

  private endGesture(onRelease: () => void) {
    this.dragging = false
    this.previous = null
    this.surface.classList.remove('is-dragging')
    requestAnimationFrame(onRelease)
  }

  private handleKey(event: KeyboardEvent) {
    if (event.target !== this.surface) return
    const rect = this.surface.getBoundingClientRect()
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    switch (event.key) {
      case '+':
      case '=': this.zoom(zoomStep); break
      case '-': this.zoom(1 / zoomStep); break
      case '0': this.reset(); break
      case 'ArrowLeft': this.transform(1, center, { x: center.x + rect.width / 6, y: center.y }); break
      case 'ArrowRight': this.transform(1, center, { x: center.x - rect.width / 6, y: center.y }); break
      case 'ArrowUp': this.transform(1, center, { x: center.x, y: center.y + rect.height / 6 }); break
      case 'ArrowDown': this.transform(1, center, { x: center.x, y: center.y - rect.height / 6 }); break
      default: return
    }
    event.preventDefault()
  }
}
