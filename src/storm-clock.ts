const shortDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

export function stormClock(startedAt: number, ticks: number, secondsPerTick: number) {
  const stamp = startedAt + ticks * secondsPerTick * 1000
  return { date: shortDate.format(stamp), time: time.format(stamp) }
}
