import { getLocale } from './i18n'

const formatters = new Map<string, Intl.DateTimeFormat>()
export function dateFormatter(key: 'short' | 'long' | 'time') {
  const locale = getLocale()
  const id = locale + key
  let formatter = formatters.get(id)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : locale, key === 'time'
      ? { hour: 'numeric', minute: '2-digit' } : { dateStyle: key === 'short' ? 'medium' : 'long' })
    formatters.set(id, formatter)
  }
  return formatter
}

export function stormClock(startedAt: number, ticks: number, secondsPerTick: number) {
  const stamp = startedAt + ticks * secondsPerTick * 1000
  return { date: dateFormatter('short').format(stamp), time: dateFormatter('time').format(stamp) }
}
