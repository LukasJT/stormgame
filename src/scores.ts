import { rulesVersion, type Metric, type Placement, type Replay, type RunSummary, type Ticket } from './replay'
import type { CampaignEvent } from './campaign'
import type { Difficulty } from './sim'

const configured = import.meta.env.VITE_LEADERBOARD_URL as string | undefined
const sameOrigin = !import.meta.env.DEV && import.meta.env.BASE_URL === '/' && !location.hostname.endsWith('.chatgpt.site')
const base = (configured || (sameOrigin ? new URL('api/', document.baseURI).href : '')).replace(/\/$/, '')
export const sharedScoresConfigured = !!base
const pendingKey = 'stormwake.pendingScore'
const nameKey = 'stormwake.displayName'
const deviceKey = 'stormwake.deviceScores'
let guest = ''
function read(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* Storage may be unavailable. */ }
}
function identity() {
  if (!guest) {
    guest = read('stormwake.scoreGuest') ?? ''
    if (!/^[a-f0-9]{64}$/.test(guest)) {
      guest = [...crypto.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, '0')).join('')
      write('stormwake.scoreGuest', guest)
    }
  }
  return guest
}

async function request<T>(route: string, data?: object, timeout = 4000): Promise<T> {
  if (!base) throw Error('Shared scores need a configured server.')
  const result = await fetch(base + route, {
    signal: AbortSignal.timeout(timeout),
    ...(data ? { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + identity() }, body: JSON.stringify(data) } : {}),
  })
  const content = await result.json().catch(() => null)
  if (!result.ok || !content) throw Object.assign(new Error(content?.error || 'Shared scores are unavailable right now.'), { status: result.status })
  return content
}

export type Challenge = { id: string; event: CampaignEvent; lat: number; lon: number; seed: number }
export const getChallenge = (event: CampaignEvent) => request<Challenge>('/challenge?event=' + encodeURIComponent(event))
export const issueTicket = (placement: Placement, challenge?: string) => request<Ticket>('/runs/start', { placement, rulesVersion, challenge }, 1800)
export type ScoreFilters = { event: CampaignEvent; difficulty: Difficulty; metric: Metric; period: 'all' | 'month'; challenge?: string }
export type ScoreRow = { id: string; name: string; player: string; score: number; submitted: number; summary: RunSummary }
export const getScores = (filters: ScoreFilters) => request<{ rows: ScoreRow[]; version: string }>(
  '/leaderboards?' + new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined)))

type DeviceEntry = Omit<ScoreRow, 'score' | 'player'>

function deviceEntries(): DeviceEntry[] {
  try {
    const entries: unknown = JSON.parse(read(deviceKey) ?? '[]')
    return Array.isArray(entries) ? entries.filter(entry => entry?.summary?.mode === 'campaign' &&
      typeof entry.id === 'string' && typeof entry.name === 'string' && Number.isFinite(entry.submitted) &&
      entry.summary.placement && entry.summary.metrics) : []
  } catch { return [] }
}

export function saveDeviceScore(id: string, name: string, summary: RunSummary) {
  if (summary.mode !== 'campaign') return false
  const entries = deviceEntries()
  if (entries.some(entry => entry.id === id)) return true
  const entry = { id, name, summary, submitted: Date.now() }
  try {
    localStorage.setItem(deviceKey, JSON.stringify([entry, ...entries].slice(0, 250)))
    write(nameKey, name)
    return true
  } catch { return false }
}

export function getDeviceScores(filters: ScoreFilters): ScoreRow[] {
  const now = new Date()
  const since = filters.period === 'month' ? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) : 0
  const eligible = deviceEntries().filter(entry => entry.summary.rulesVersion === rulesVersion && entry.submitted >= since)
  if (filters.metric === 'mastery') {
    const byName = new Map<string, { entry: DeviceEntry; best: Map<string, number> }>()
    for (const entry of eligible) {
      const { event, difficulty } = entry.summary.placement
      const key = event + ':' + difficulty
      const player = byName.get(entry.name) ?? { entry, best: new Map<string, number>() }
      player.best.set(key, Math.max(player.best.get(key) ?? 0, entry.summary.stars))
      byName.set(entry.name, player)
    }
    return orderScores([...byName.values()].map(({ entry, best }) => ({
      ...entry, player: '', score: [...best.values()].reduce((sum, stars) => sum + stars, 0),
    })))
  }
  return orderScores(eligible.flatMap(entry => {
    const { event, difficulty } = entry.summary.placement
    const score = entry.summary.metrics[filters.metric]
    return event === filters.event && difficulty === filters.difficulty && score !== undefined && Number.isFinite(score)
      ? [{ ...entry, player: '', score }] : []
  }))
}

function orderScores(rows: ScoreRow[]) {
  return rows.sort((a, b) => b.score - a.score || a.submitted - b.submitted || a.id.localeCompare(b.id)).slice(0, 50)
}

export type Submission = { ticket: Ticket; replay: Replay; displayName: string }
export function pendingScore(): Submission | null {
  try { return JSON.parse(read(pendingKey) ?? 'null') } catch { return null }
}
export const savedDisplayName = () => read(nameKey) ?? ''
export async function submitScore(submission: Submission) {
  const { ticket, replay, displayName } = submission
  write(nameKey, displayName)
  write(pendingKey, JSON.stringify(submission))
  const result = await request<{ id: string; summary: RunSummary }>('/runs/' + ticket.id + '/submit',
    { token: ticket.token, replay, displayName }, 95_000)
  if (pendingScore()?.ticket.id === ticket.id) write(pendingKey, 'null')
  return result
}
