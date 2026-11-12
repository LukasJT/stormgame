import type { Storm } from './world'
import { campaign, difficulties, earnedStars, type CampaignEvent } from './campaign'
import { thunderstormTypes } from './hazards'
import type { Difficulty } from './sim'
import { chooseLocale, type Locale } from './i18n'
import type { NewsMode } from './news'

const settingsKey = 'stormwake.settings'
const recordsKey = 'stormwake.records'
const rankingsKey = 'stormwake.rankings'

export const playbackSpeeds = [1, 2, 4] as const
type Settings = {
  startingSpeed: typeof playbackSpeeds[number]; newsMode: NewsMode; units: 'imperial' | 'metric'
  locale: Locale; muted: boolean; masterVolume: number; effectsVolume: number
}
type RecordTotals = { damage: number; deaths: number }
type Records = Partial<Record<Storm | 'Flooding', RecordTotals | { score: number; deaths: number }>>
type Ranking = RecordTotals & { stars: number }
type Rankings = Partial<Record<CampaignEvent, Partial<Record<Difficulty, Ranking>>>>

function readStorage<T extends object>(key: string): Partial<T> {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? 'null')
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  } catch {
    return {}
  }
}

function writeStorage(key: string, data: object) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Keep the current session usable when browser storage is unavailable.
  }
}

const storedSettings = readStorage<Settings & { breakingNews: boolean }>(settingsKey)
const volume = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(0, Math.min(1, value)) : fallback
export const settings: Settings = {
  units: storedSettings.units === 'metric' ? 'metric' : 'imperial',
  startingSpeed: playbackSpeeds.find(speed => speed === storedSettings.startingSpeed) ?? 1,
  newsMode: storedSettings.newsMode === 'quiet' || storedSettings.newsMode === 'major' ? storedSettings.newsMode
    : storedSettings.breakingNews === false ? 'quiet' : 'standard',
  locale: chooseLocale(storedSettings.locale ?? globalThis.navigator?.language),
  muted: storedSettings.muted === true,
  masterVolume: volume(storedSettings.masterVolume, .55),
  effectsVolume: volume(storedSettings.effectsVolume, .65),
}

export function saveSettings() {
  writeStorage(settingsKey, settings)
}

const rankings = readStorage<Rankings>(rankingsKey)

function validRecord(record: Records[Storm | 'Flooding']): RecordTotals | undefined {
  if (!record || typeof record !== 'object') return
  const damage = 'damage' in record ? record.damage : record.score * 100_000
  if (Number.isSafeInteger(damage) && Number.isSafeInteger(record.deaths)
    && damage >= 0 && record.deaths >= 0) return { damage, deaths: record.deaths }
}

export function legacyRecord(storm: CampaignEvent) {
  const records = readStorage<Records>(recordsKey)
  const names = storm === 'Thunderstorm' ? thunderstormTypes : [storm]
  let totals: RecordTotals | undefined
  for (const name of names) {
    const record = validRecord(records[name])
    if (record) totals = { damage: Math.max(totals?.damage ?? 0, record.damage), deaths: Math.max(totals?.deaths ?? 0, record.deaths) }
  }
  return totals
}

export function stormRecord(storm: CampaignEvent, difficulty: Difficulty) {
  const record = rankings[storm]?.[difficulty]
  if (record && Number.isInteger(record.stars) && record.stars >= 1 && record.stars <= 5
    && validRecord(record)) return record
}

export function difficultyUnlocked(storm: CampaignEvent, difficulty: Difficulty) {
  return difficulty !== 'Expert' || (stormRecord(storm, 'Hard')?.stars ?? 0) >= 3
}

function hasCompletion(storm: CampaignEvent) {
  return difficulties.some(difficulty => stormRecord(storm, difficulty)) || !!legacyRecord(storm)
}

export function eventUnlocked(storm: CampaignEvent) {
  const index = campaign.indexOf(storm)
  return index === 0 || hasCompletion(campaign[index - 1]) || hasCompletion(storm)
}

export const nextEvent = (storm: CampaignEvent): CampaignEvent | undefined => campaign[campaign.indexOf(storm) + 1]

export function recordRun(storm: CampaignEvent, difficulty: Difficulty, totals: RecordTotals) {
  const latest = readStorage<Rankings>(rankingsKey)
  for (const event of campaign) {
    for (const level of difficulties) {
      const saved = latest[event]?.[level]
      if (saved && validRecord(saved) && Number.isInteger(saved.stars) && saved.stars >= 1 && saved.stars <= 5) {
        const prior = stormRecord(event, level)
        rankings[event] = { ...rankings[event], [level]: {
          stars: Math.max(prior?.stars ?? 0, saved.stars),
          damage: Math.max(prior?.damage ?? 0, saved.damage),
          deaths: Math.max(prior?.deaths ?? 0, saved.deaths),
        } }
      }
    }
  }
  const previous = stormRecord(storm, difficulty)
  const stars = earnedStars(storm, difficulty, totals.damage, true)
  rankings[storm] = { ...rankings[storm], [difficulty]: {
    stars: Math.max(stars, previous?.stars ?? 0),
    damage: Math.max(totals.damage, previous?.damage ?? 0),
    deaths: Math.max(totals.deaths, previous?.deaths ?? 0),
  } }
  writeStorage(rankingsKey, rankings)
}
