export type SnowReport = { place: string; cm: number }
export type NewsItem = {
  id: number; time: number; text: string; breaking?: boolean; snowfall?: SnowReport
  kind?: string; locality?: string
}
export type NewsMode = 'standard' | 'major' | 'quiet'

export function appendNews(items: NewsItem[], item: Omit<NewsItem, 'id'>) {
  const id = (items[0]?.id ?? 0) + 1
  const prior = item.kind && items.findIndex(previous =>
    previous.kind === item.kind && previous.locality === item.locality && item.time - previous.time <= 36)
  if (typeof prior === 'number' && prior >= 0) {
    const previous = items[prior]
    if (!item.snowfall || (previous.snowfall?.cm ?? 0) >= item.snowfall.cm) return
    items.splice(prior, 1)
  }
  items.unshift({ ...item, id })
  if (items.length > 200) {
    const discard = items.length - 1 - [...items].reverse().findIndex(entry => !entry.breaking && entry.time > 0)
    items.splice(discard < items.length ? discard : items.length - 2, 1)
  }
}

export class NewsPresentation {
  ticker?: NewsItem
  banner?: NewsItem
  private tickerAt = -Infinity
  private bannerAt = -Infinity
  private cursor = 0

  update(items: NewsItem[], mode: NewsMode, now: number, paused: boolean) {
    if (paused) return false
    let changed = false
    if (this.banner && (now - this.bannerAt >= 7500 || mode === 'quiet')) {
      this.banner = undefined
      changed = true
    }
    if (mode === 'quiet') return changed
    const latest = items.find(item => mode === 'standard' || item.breaking)
    if (latest && latest !== this.ticker && now - this.tickerAt >= 10_000) {
      this.ticker = latest
      this.tickerAt = now
      changed = true
    }
    if (now - this.bannerAt >= 30_000) {
      const item = items.find(item => item.breaking && item.id > this.cursor && item.time > 0 &&
        (items[0]?.time ?? 0) - item.time <= 50)
      if (item) {
        this.cursor = item.id
        this.bannerAt = now
        this.banner = item
        changed = true
      }
    }
    return changed
  }

  dismiss() { this.banner = undefined }
}
