import { expect, it } from 'vitest'
import { appendNews, NewsPresentation, type NewsItem } from '../src/news'

it('replaces repeated snowfall reports for a place with the highest recent measurement', () => {
  const items: NewsItem[] = []
  appendNews(items, { time: 15, text: '', kind: 'snowfall', locality: 'Buffalo', snowfall: { place: 'Buffalo', cm: 15 } })
  appendNews(items, { time: 16, text: '', kind: 'snowfall', locality: 'Buffalo', snowfall: { place: 'Buffalo', cm: 10 } })
  appendNews(items, { time: 24, text: '', kind: 'snowfall', locality: 'Buffalo', snowfall: { place: 'Buffalo', cm: 24 } })
  expect(items.map(item => item.snowfall?.cm)).toEqual([24])
})

it('throttles breaking banners in elapsed real time even if simulation ticks arrive in bursts', () => {
  const items: NewsItem[] = []
  const news = new NewsPresentation()
  appendNews(items, { time: 4, text: 'First', breaking: true })
  news.update(items, 'standard', 0, false)
  expect(news.banner?.text).toBe('First')
  appendNews(items, { time: 36, text: 'Second', breaking: true })
  news.update(items, 'standard', 7400, false)
  expect(news.banner?.text).toBe('First')
  news.update(items, 'standard', 7500, false)
  expect(news.banner).toBeUndefined()
  news.update(items, 'standard', 29_999, false)
  expect(news.banner).toBeUndefined()
  news.update(items, 'standard', 30_000, true)
  expect(news.banner).toBeUndefined()
  news.update(items, 'standard', 30_000, false)
  expect(news.banner?.text).toBe('Second')
  news.update(items, 'quiet', 30_001, false)
  expect(news.banner).toBeUndefined()
})
