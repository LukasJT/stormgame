import { canIgnite, fireColors, fireHistoryColors, fireHistoryLabels } from './wildfire'
import { snowfallScale } from './snow-map'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/600.css'
import './style.css'
import { drawRegion, drawWorld, paintMotion } from './map'
import { MapCamera } from './map-camera'
import { coordinates, loadLocalities, makeDrop } from './free-drop'
import { canRemoveUpgrade, upgradeCost, upgradeRefund, satelliteCooldown, tornadoLimits, abilityCost, activeStorm, chooseBlizzardPattern, conditions, defaultSeed, difficultyRules, environmentOutlook, frontSpeed, hazardAbilityReady, hurricaneCategory, impactAreas, leg, nameHurricane, preferredRoute, routeOptions, startRun, stormAbility, stormOrganization, stormStats, tick, tornadoSupportAt, totals, travelRate, upgradeLocked, type Difficulty, type Origin, type Run, type ZoneId } from './sim'
import { evolutionRating, evolutionStats } from './evolution-stats'
import { stormColor, theaters, type Storm, type Theater } from './world'
import { hazardFor, hazards } from './hazards'
import { blizzardCourseAvailable, blizzardCourses, blizzardOptions, blizzardPatterns, type BlizzardCourse, type BlizzardPattern } from './blizzard'
import { branches, tornadoBranches, trees, type Branch, type Upgrade } from './upgrades'
import { countries, countryAt, drawInspection, inspectedTotals, type Inspection } from './inspection'
import { getRegions } from './regions'
import { difficultyUnlocked, eventUnlocked, legacyRecord, nextEvent, playbackSpeeds, recordRun, saveSettings, settings, stormRecord } from './profile'
import { campaign, difficulties, difficultyLabel, earnedStars, isCampaignEvent, type CampaignEvent } from './campaign'
import { directionName, isActive, type MapPoint } from './convection'
import { formatDamage } from './damage'
import { escapeName } from './cities'
import { enableAudio, playSound, syncAudio } from './audio'
import { NewsPresentation } from './news'
import { chooseLocale, getLocale, languages, localizedNumber, setLocale, translateMarkup } from './i18n'
import { applyCommand, commonMetrics, createForecast, eventMetrics, metricLabels, prepareForecast, summarizeRun,
  type Command, type Metric, type Placement, type Replay, type RunSummary, type Ticket } from './replay'
import { getChallenge, getDeviceScores, getScores, issueTicket, pendingScore, saveDeviceScore, savedDisplayName, sharedScoresConfigured, submitScore,
  type Challenge, type ScoreFilters, type ScoreRow } from './scores'
import { tornadoClimateTiers, tornadoSupportLabel } from './tornado-climate'
import { snowfallDepth, measurementText, temperature, windSpeed, formatDistance } from './units'
import { tornadoClock, tornadoDate, tornadoDuration, tornadoStartDate, tornadoTickSeconds, tornadoVerdict } from './tornado-report'
import { cycloneTickSeconds, type Cyclone } from './cyclone'
import { stormClock } from './storm-clock'

const menu = document.querySelector<HTMLElement>('#menu')!
const game = document.querySelector<HTMLElement>('.game')!
const summary = document.querySelector<HTMLElement>('#summary')!
const controls = document.querySelector<HTMLElement>('#controls')!
const map = document.querySelector<HTMLElement>('#map')!
const chart = document.querySelector<HTMLElement>('#chart')!
const weatherToggle = document.querySelector<HTMLButtonElement>('#weather-toggle')!
const weatherCredit = document.querySelector<HTMLElement>('#weather-credit')!
const mapTools = document.querySelector<HTMLElement>('#map-tools')!
const prompt = document.querySelector<HTMLElement>('#prompt')!
const bulletins = document.querySelector<HTMLElement>('#bulletins')!
const transport = document.querySelector<HTMLElement>('#transport')!
const forecastId = document.querySelector<HTMLElement>('#forecast-id')!
const mapTitle = document.querySelector<HTMLElement>('#map-title')!
const mapStatus = document.querySelector<HTMLElement>('#map-status')!
const stats = document.querySelector<HTMLElement>('#storm-stats')!
const inspector = document.querySelector<HTMLElement>('#inspection')!
const breakingNews = document.querySelector<HTMLElement>('#breaking-news')!
const weatherPickup = document.querySelector<HTMLElement>('#weather-pickup')!
const dialog = document.querySelector<HTMLDialogElement>('#panel')!
const refundDialog = document.querySelector<HTMLDialogElement>('#refund-confirmation')!
const refundMessage = document.querySelector<HTMLElement>('#refund-message')!
const num = { format: (value: number) => localizedNumber(value) }
setLocale(settings.locale)
document.documentElement.lang = settings.locale

const icons = {
  storm: '<path d="M20 4C12 0 4 6 5 13c1 5 7 6 9 2 2-3-1-6-4-4m-6 9c8 4 16-2 15-9-1-5-7-6-9-2-2 3 1 6 4 4"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  infinity: '<path d="M12 12c-2-3-3.5-5-6-5a5 5 0 0 0 0 10c2.5 0 4-2 6-5s3.5-5 6-5a5 5 0 0 1 0 10c-2.5 0-4-2-6-5Z"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  damage: '<path d="m3 10 9-7 9 7M5 9v11h14V9m-6-3-3 5 4 3-3 6"/>',
  deaths: '<path d="M7 17v3h10v-3c3-2 4-4 4-7a9 9 0 0 0-18 0c0 3 1 5 4 7Zm2-6h.01m6 0h.01m-3 6v3"/>',
  tornado: '<path d="M3 5h18M5 9h14M7 13h10m-8 4h6m-4 4h2"/>',
  blizzard: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3m-6 16 3-3 3 3"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2"/>',
  guide: '<path d="M3 5h5c2 0 4 1 4 3v12c0-2-2-3-4-3H3zm18 0h-5c-2 0-4 1-4 3v12c0-2 2-3 4-3h5z"/>',
  records: '<path d="M8 3h8v5a4 4 0 0 1-8 0zm0 2H4v2a4 4 0 0 0 5 4m7-6h4v2a4 4 0 0 1-5 4m-3 1v6m-4 2h8"/>',
  settings: '<path d="M4 6h8m4 0h4M4 12h3m4 0h9M4 18h11m4 0h1M12 4v4m-5 2v4m8 2v4"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  heat: '<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Zm3 2V7"/>',
  bolt: '<path d="M14 2 4 13h7l-1 9 10-12h-7z"/>',
  fire: '<path d="M13 2c0 5 7 7 7 13a8 8 0 0 1-16 0c0-3 2-5 4-7 0 3 1 4 2 4-1-5 2-7 3-10z"/>',
  wind: '<path d="M3 7h11a3 3 0 1 0-3-3M3 12h16a2 2 0 1 1-2 2M3 17h8a3 3 0 1 1-3 3"/>',
  rain: '<path d="M5 13a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4 4 0 1 1 2 9M7 16l-2 4m7-4-2 4m7-4-2 4"/>',
  surge: '<path d="M2 13c4-7 8-10 13-7 3 2 2 5 0 5s-3-1-2-2m-11 8c3-2 5-2 8 0s5 2 8 0 3-2 4-2"/>',
  signal: '<path d="M12 14v7m-4 0h8M8 6a6 6 0 0 0 0 8m8-8a6 6 0 0 1 0 8M5 3a10 10 0 0 0 0 14m14-14a10 10 0 0 1 0 14"/><circle cx="12" cy="10" r="1"/>',
  people: '<path d="M3 20v-3c0-3 2-4 5-4s5 1 5 4v3m1-7c4 0 6 1 6 4v3"/><circle cx="8" cy="7" r="3"/><path d="M15 4a3 3 0 0 1 0 6"/>',
}
const icon = (name: keyof typeof icons) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`

function upgradeIcon(upgrade: Upgrade) {
  const effect = upgrade.effects
  if (effect.coldTolerance || effect.hail) return 'blizzard'
  if (effect.heatTolerance) return 'heat'
  if (effect.rainWrap || effect.floodPower) return 'rain'
  if (effect.shelterBreach) return 'damage'
  if (effect.tornadoSpeed) return 'wind'
  if (effect.seaGain || effect.coldBuffer || effect.hazardGain) return 'heat'
  if (effect.wind || effect.gust || effect.spread) return 'wind'
  if (effect.surge) return 'surge'
  if (effect.rain || effect.rainTrail || effect.hazardBuffer) return 'rain'
  if (effect.chargeGain || effect.burstPower) return 'bolt'
  if (effect.broadcast || effect.outageTime || effect.warningDelay) return 'signal'
  if (effect.panic || effect.gridlock) return 'people'
  return upgrade.branch === 'Formation' ? 'storm' : upgrade.branch === 'Impact' ? 'damage' : 'globe'
}

type Screen = 'home' | 'weather' | 'difficulty' | 'guide' | 'records' | 'settings' | 'leaderboards' | 'map' | 'results'
let screen: Screen = 'home'
let sandbox = false
let loadingMap = false
let difficulty: Difficulty | null = null
let seed = defaultSeed
let run: Run | null = null
let storm: Storm = 'Tornado'
let unlockedOnFinish: CampaignEvent | undefined
let mapOrder: 'drop' | 'storm' | 'funnel' | 'burst' | 'ember' | null = null
let selectedFunnel: number | null = null
let mapFeedback = ''
let overview = false
let opening = false
let loadingExposure: Run | null = null
let showWeather = true
let hurricaneName = ''
let inspected: ZoneId | null = null
let speed: typeof settings.startingSpeed = 1
let panel: 'pause' | 'pause-settings' | 'evolve' | 'region' | 'news' | 'history' | 'clipping' | 'score' | null = null
let evolutionTab: Branch | 'Storm' | 'Tornado' = 'Formation'
let selectedUpgrade: string | null = null
let inspectMode = false
let inspection: Inspection | null = null
let news = new NewsPresentation()
let panelTrigger: HTMLElement | null = null
let accumulator = 0
let lastFrame = performance.now()
let interactionInProgress = false
let ticket: Ticket | undefined
let replay: Replay | undefined
let finishedRun: RunSummary | undefined
let finishedRunId: string | undefined
let scoreMessage = ''
let scoreSubmitting = false
let scoreAccepted = false
let boardChallenge: Challenge | undefined
let runChallenge: Challenge | undefined
let boardLoading = false
let boardError = ''
let boardRows: ScoreRow[] = []
let boardRequest = 0
let boardScope: 'shared' | 'device' = sharedScoresConfigured ? 'shared' : 'device'
const filters: ScoreFilters = { event: 'Tornado', difficulty: 'Normal', metric: 'damage', period: 'all' }
const camera = new MapCamera(map, mapTools, render)

function command(action: string, options: Omit<Command, 'tick' | 'action'> = {}) {
  if (!run || opening) return false
  const input = { tick: run.time, action, ...options }
  if (!applyCommand(run, input)) return false
  replay?.commands.push(input)
  return true
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function cycloneTimestamp(cyclone: Cyclone, ticks: number) {
  return cyclone.startedAt === null ? null : stormClock(cyclone.startedAt, ticks, cycloneTickSeconds)
}

function cycloneEventTime(cyclone: Cyclone, ticks: number) {
  const stamp = cycloneTimestamp(cyclone, ticks)
  return stamp ? `<time class="calendar-entry"><small>${stamp.date}</small>${stamp.time}</time>` : `<time>${clock(ticks)}</time>`
}

function replace(element: HTMLElement, html: string) {
  const renderKey = getLocale() + html
  if (element.dataset.rendered === renderKey) return
  const previous = element.contains(document.activeElement) ? document.activeElement : null
  const key = previous?.getAttribute('data-key') ?? previous?.getAttribute('data-zone')
  element.innerHTML = translateMarkup(html)
  element.dataset.rendered = renderKey
  if (key) element.querySelector<HTMLElement>(`[data-key="${key}"], [data-zone="${key}"]`)?.focus({ preventScroll: true })
}

function button(action: string, label: string, value?: string, className = '') {
  return `<button class="${className}" data-key="${action}${value ? `-${value}` : ''}" data-action="${action}"${value ? ` data-value="${value}"` : ''}>${label}</button>`
}

const basicWeather = {
  Hurricane: { icon: 'storm', description: 'Build strength over warm water, then make landfall.' },
  Tornado: { icon: 'tornado', description: 'Touch down as an EF0 funnel. Spend Momentum to shape its track, damage and resilience.' },
  Blizzard: { icon: 'blizzard', description: 'Build a moving snow band and use cold air and water to deepen snowfall.' },
} as const
const weatherCards = { ...basicWeather, ...hazards }
function stars(count: number, level: Difficulty, label = '') {
  const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.09 6.26 6.91 1-5 4.88 1.18 6.89L12 17.78l-6.18 3.25L7 14.14 2 9.26l6.91-1Z"/></svg>'
  return `<span class="rating rating-${level.toLowerCase()}" role="img" aria-label="${label}${count} of 5 stars">${Array.from({ length: 5 }, (_, i) => `<span class="${i < count ? 'earned' : ''}">${star}</span>`).join('')}</span>`
}

const menuSections = {
  guide: 'How to Play',
  records: 'Storm Records',
  settings: 'Settings',
} as const

function settingsContent() {
  return `<div class="menu-setting">
          <label for="starting-speed">Starting speed</label>
          <select id="starting-speed" aria-describedby="speed-help">
            ${playbackSpeeds.map(rate => `<option value="${rate}" ${settings.startingSpeed === rate ? 'selected' : ''}>${rate}×</option>`).join('')}
          </select>
          <p id="speed-help">You can still change the speed during a run.</p>
        </div>
        <div class="menu-setting">
          <label for="units-setting">Measurement units</label>
          <select id="units-setting">
            <option value="imperial" ${settings.units === 'imperial' ? 'selected' : ''}>Imperial (miles)</option>
            <option value="metric" ${settings.units === 'metric' ? 'selected' : ''}>Metric (kilometers)</option>
          </select>
        </div>
        <div class="menu-setting">
          <label for="news-mode">News alerts</label>
          <select id="news-mode">
            ${(['standard', 'major', 'quiet'] as const).map((mode, index) => `<option value="${mode}" ${settings.newsMode === mode ? 'selected' : ''}>${['Standard', 'Major alerts only', 'Quiet'][index]}</option>`).join('')}
          </select>
        </div>
        <div class="menu-setting">
          <label for="language-setting">Language</label>
          <select id="language-setting">${Object.entries(languages).map(([code, name]) => `<option value="${code}" ${settings.locale === code ? 'selected' : ''}>${name}</option>`).join('')}</select>
        </div>
        <div class="menu-setting">
          <label for="mute-setting">Mute sound</label>
          <input id="mute-setting" type="checkbox" ${settings.muted ? 'checked' : ''}>
        </div>
        <div class="menu-setting">
          <label for="master-volume">Master volume</label>
          <input id="master-volume" type="range" min="0" max="100" value="${Math.round(settings.masterVolume * 100)}">
          <label for="music-volume">Music volume</label>
          <input id="music-volume" type="range" min="0" max="100" value="${Math.round(settings.musicVolume * 100)}">
          <label for="effects-volume">Sound effects volume</label>
          <input id="effects-volume" type="range" min="0" max="100" value="${Math.round(settings.effectsVolume * 100)}">
        </div>`
}

function menuSection(screen: keyof typeof menuSections) {
  let content: string
  switch (screen) {
    case 'guide':
      content = `<ol class="guide-steps">
        <li><strong>Start a hazard</strong><p>Begin with Tornado. Finish any forecast to earn at least one star and unlock the next event. Choose a difficulty, place a marker on the map, then press Begin.</p></li>
        <li><strong>Track and evolve</strong><p>Name your hurricane and choose its origin. Its course follows atmospheric flow. Open Storm view for a closer look, Track history for hurricane classifications, or Evolve to spend Momentum and specialize a thunderstorm.</p></li>
        <li><strong>Collect weather opportunities</strong><p>Momentum arrives at irregular intervals. Tap weather bubbles on the map for bonus points, then spend them in Evolve. Tornadoes also earn Momentum from damage, with larger rewards in populated areas. A wide funnel draws attention, and rain can buy time before people take shelter. Removing an upgrade returns part of what you paid, with smaller refunds after each removal. Expert refunds zero Momentum. Each event has its own upgrade paths. Shared upgrades require both paths in their tree.</p></li>
        <li><strong>Watch for warnings</strong><p>Large storms and storms near cities are easier to detect. On higher difficulties, conditions are tougher and more people follow shelter warnings. Track damage score and total deaths in the bottom bar.</p></li>
        <li><strong>Chase five stars</strong><p>Stars two through five come from property damage. Each event and difficulty has its own targets and personal best. Deaths are tallied separately.</p></li>
      </ol>
      <p>Stormwake is affiliated with <a class="population-source" href="https://www.tornadosimulator.net/" target="_blank" rel="noopener">Tornado Simulator (tornadosimulator.net)</a>. Stormwake uses population and density data from Tornado Simulator and adapts its property damage, shelter, and casualty models for gameplay.</p>
      <p>City labels use <a class="population-source" href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> and <a class="population-source" href="https://www.geonames.org/export/" target="_blank" rel="noopener">GeoNames (CC BY 4.0)</a>.</p>`
      break
    case 'records':
      content = `<p class="menu-note">Personal bests from completed forecasts in this browser.</p>
        <ul class="record-list">${campaign.map(kind => {
          const legacy = legacyRecord(kind)
          return `<li><h2 style="--choice-color:${stormColor(kind)}">${icon(weatherCards[kind].icon)} ${kind}</h2>
            <ul class="rank-list">${difficulties.map(level => {
              const record = stormRecord(kind, level)
              return `<li class="rank-row"><strong>${difficultyLabel(level)}</strong>${stars(record?.stars ?? 0, level, `${difficultyLabel(level)}: `)}
                ${record ? `<dl><div><dt>Best damage</dt><dd>${formatDamage(record.damage)}</dd></div>
                  <div><dt>Most deaths</dt><dd>${num.format(record.deaths)}</dd></div></dl>` : '<span>Unplayed</span>'}</li>`
            }).join('')}</ul>
            ${legacy ? `<p>Earlier best (unranked) · ${formatDamage(legacy.damage)} · ${num.format(legacy.deaths)} deaths</p>` : ''}</li>`
        }).join('')}</ul>`
      break
    case 'settings':
      content = settingsContent()
      break
  }
  return `<section class="setup-screen" aria-labelledby="menu-title">
    <header class="setup-header">${button('menu-back', `${icon('back')} Back`, 'home', 'menu-back')}<h1 id="menu-title" tabindex="-1">${menuSections[screen]}</h1></header>
    <div class="menu-details">${content}</div>
  </section>`
}

function weatherPicker() {
  const unlocked = campaign.filter(eventUnlocked).length
  return `<section class="weather-select" aria-labelledby="menu-title">
    <header class="weather-select-header">
      ${button('menu-back', `${icon('back')} Back`, 'home', 'menu-back')}
      <h1 id="menu-title" tabindex="-1">${sandbox ? 'Sandbox' : 'Choose a weather event'}</h1>
      <p>${sandbox ? 'Choose any weather event and experiment with unlimited Momentum.' : unlocked === campaign.length ? 'All weather events unlocked.' : `${unlocked} of ${campaign.length} events unlocked · Earn one star on an event to open the next.`}</p>
    </header>
    <div class="event-grid" role="group" aria-label="Weather events">
      ${campaign.map((kind, index) => {
        const locked = !sandbox && !eventUnlocked(kind)
        const card = weatherCards[kind]
        const description = kind === 'Thunderstorm' ? 'Choose a storm type in Evolve and build its abilities.' : card.description
        const best = sandbox ? undefined : difficulties.map(level => ({ level, score: stormRecord(kind, level)?.stars ?? 0 }))
          .sort((a, b) => b.score - a.score || difficulties.indexOf(b.level) - difficulties.indexOf(a.level))[0]
        return `<button class="event-choice" data-action="choose-weather" data-value="${kind}" data-key="weather-${kind}" aria-label="${kind}" aria-describedby="event-detail-${index}" style="--choice-color:${stormColor(kind)}" ${locked ? 'disabled' : ''}>
          <span class="event-emblem">${icon(card.icon)}${locked ? `<span class="event-lock">${icon('lock')}</span>` : ''}</span>
          <strong>${kind}</strong><span class="event-description" id="event-detail-${index}">${description}${locked ? `<span class="unlock-requirement">Earn 1 star in ${campaign[index - 1]}</span>` : best?.score ? `<span class="event-best">${difficultyLabel(best.level)} ${stars(best.score, best.level)}</span>` : ''}</span>
        </button>`
      }).join('')}
    </div>
  </section>`
}

function menuContent() {
  if (screen === 'results' && run?.tornado) return tornadoResults(run)
  if (screen === 'leaderboards') return leaderboardContent()
  if (screen === 'home') return `<section class="title-screen" aria-labelledby="menu-title">
    <div class="title-emblem">${icon('storm')}</div>
    <h1 id="menu-title" tabindex="-1">Stormwake</h1>
    <nav class="title-actions" aria-label="Main menu">
      ${button('menu-play', `${icon('play')} Play`, undefined, 'menu-primary')}
      ${button('menu-sandbox', `${icon('infinity')} Sandbox`, undefined, 'menu-secondary')}
      ${button('leaderboards', 'Leaderboards', undefined, 'menu-secondary')}
      ${(Object.keys(menuSections) as (keyof typeof menuSections)[]).map(section =>
        button('menu-section', `${icon(section)} ${menuSections[section]}`, section, 'menu-secondary')).join('')}
    </nav>
  </section>`

  if (screen === 'guide' || screen === 'records' || screen === 'settings') return menuSection(screen)
  if (screen === 'weather') return weatherPicker()
  const event = isCampaignEvent(storm) ? storm : null
  const choices = difficulties.map(level => {
    const locked = !event || (!sandbox && !difficultyUnlocked(event, level))
    return `<button class="menu-option difficulty-option" data-action="choose-difficulty" data-value="${level}" data-key="difficulty-${level}" aria-pressed="${difficulty === level}" ${locked ? 'disabled' : ''}>
        <span><strong>${difficultyLabel(level)}</strong><small>${locked ? 'Earn 3 stars on Hard to unlock' : difficultyRules[level].description}</small></span><span class="difficulty-mark">${sandbox ? '' : stars(event ? stormRecord(event, level)?.stars ?? 0 : 0, level)}<span class="selection-mark">${difficulty === level ? icon('check') : ''}</span></span>
      </button>`
  }).join('')
  return `<section class="setup-screen" aria-labelledby="menu-title">
    <header class="setup-header">${button('menu-back', `${icon('back')} Back`, 'weather', 'menu-back')}<h1 id="menu-title" tabindex="-1">Choose difficulty</h1></header>
    <p class="chosen-weather" style="--choice-color:${stormColor(storm)}">${icon(weatherCards[storm].icon)} ${storm}${sandbox ? ' · Sandbox' : ''}</p>
    <div class="menu-options" role="group" aria-label="Difficulty">${choices}</div>
    <footer><button class="menu-primary" data-action="start-game" data-key="start-game" ${difficulty && !loadingMap ? '' : 'disabled'} ${loadingMap ? 'aria-busy="true"' : ''}>${icon('play')} Play</button></footer>
  </section>`
}

function scoreButton(state: Run) {
  if (state.sandbox || !finishedRun) return ''
  if (scoreAccepted) return button('leaderboards', 'Leaderboards', undefined, 'order')
  return button('score', ticket ? 'Submit score' : 'Save score', undefined, 'order')
}

function scoreValue(metric: Metric, value: number) {
  if (metric === 'damage' || metric === 'surge' || metric.endsWith('Damage')) return formatDamage(value)
  if (metric === 'duration') return new Intl.NumberFormat(getLocale(), { style: 'unit', unit: 'hour', maximumFractionDigits: 2 }).format(value / 3600)
  return localizedNumber(value, 2)
}

function leaderboardContent() {
  const select = <T extends string>(key: keyof ScoreFilters, label: string, options: readonly T[], display: (value: T) => string) =>
    `<label>${label}<select aria-label="${label}" data-score-filter="${key}" data-key="filter-${key}">${options.map(value =>
      `<option value="${value}" ${filters[key] === value ? 'selected' : ''}>${display(value)}</option>`).join('')}</select></label>`
  return `<section class="setup-screen score-screen" aria-labelledby="menu-title">
    <header class="setup-header">${button('menu-back', `${icon('back')} Back`, 'home', 'menu-back')}<h1 id="menu-title" tabindex="-1">Leaderboards</h1></header>
    ${sharedScoresConfigured ? `<div class="score-filters">${(['shared', 'device'] as const).map(scope =>
      `<button class="order" data-action="score-scope" data-key="score-scope-${scope}" data-value="${scope}" aria-pressed="${scope === boardScope}">${scope === 'shared' ? 'Global' : 'This device'}</button>`).join('')}</div>` : ''}
    ${boardScope === 'device' ? '<p>Scores saved on this device</p>' : ''}
    <div class="score-filters">
      ${select('event', 'Event', campaign, event => event)}
      ${select('difficulty', 'Difficulty', difficulties, difficultyLabel)}
      ${select('metric', 'Metric', [...commonMetrics, ...eventMetrics[filters.event], 'mastery'] as Metric[], metric => metricLabels[metric])}
      ${select('period', 'Period', ['all', 'month'] as const, period => period === 'all' ? 'All time' : 'This month')}
      ${boardChallenge ? `<label>Board<select data-score-filter="challenge" data-key="filter-challenge"><option value="">Free placement</option>
        <option value="${boardChallenge.id}" ${filters.challenge ? 'selected' : ''}>Daily challenge · ${boardChallenge.id}</option></select></label>` : ''}
    </div>
    <div class="orders">${boardChallenge && eventUnlocked(filters.event) && difficultyUnlocked(filters.event, filters.difficulty)
      ? button('play-challenge', 'Play daily challenge', undefined, 'order') : ''}
      ${boardScope === 'shared' && pendingScore() ? button('retry-score', 'Retry submission', undefined, 'order') : ''}</div>
    <p role="status">${boardLoading ? 'Loading…' : escapeName(boardError) || (boardRows.length ? '' : 'No ranked runs yet.')}</p>
    ${boardRows.length ? `<div class="score-table"><table><thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Origin</th></tr></thead><tbody>
      ${boardRows.map((row, index) => `<tr><td>${localizedNumber(index + 1)}</td><td data-player-text>${escapeName(row.name)}${row.player ? ` <small>· ${escapeName(row.player)}</small>` : ''}</td>
        <td>${scoreValue(filters.metric, row.score)}</td><td>${coordinates(row.summary.placement.lat, row.summary.placement.lon)}</td></tr>`).join('')}
    </tbody></table></div>` : ''}
  </section>`
}

async function refreshScores() {
  const request = ++boardRequest
  if (boardScope === 'device') {
    boardLoading = false
    boardError = ''
    boardChallenge = undefined
    boardRows = getDeviceScores(filters)
    render()
    return
  }
  boardLoading = true
  boardError = ''
  boardRows = []
  render()
  const [scores, challenge] = await Promise.allSettled([getScores(filters), getChallenge(filters.event)])
  if (request !== boardRequest) return
  boardLoading = false
  boardChallenge = challenge.status === 'fulfilled' ? challenge.value : undefined
  if (scores.status === 'fulfilled') boardRows = scores.value.rows
  else boardError = scores.reason instanceof Error && scores.reason.name === 'Error'
    ? scores.reason.message : 'Shared scores are unavailable right now.'
  if (screen === 'leaderboards') render()
}

async function sendScore(submission: Parameters<typeof submitScore>[0], fromBoard = false) {
  if (scoreSubmitting) return
  scoreSubmitting = true
  scoreMessage = 'Submitting…'
  if (fromBoard) { boardError = scoreMessage; render() } else renderPanel()
  try {
    await submitScore(submission)
    if (ticket?.id === submission.ticket.id) scoreAccepted = true
    scoreMessage = 'Score submitted.'
    if (fromBoard) void refreshScores()
  } catch (error) {
    scoreMessage = error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'TypeError'
      ? error.message : 'Shared scores are unavailable right now.'
  } finally {
    scoreSubmitting = false
    if (fromBoard && screen === 'leaderboards') { boardError = scoreMessage; render() }
    else if (panel === 'score') { render(); renderPanel() }
  }
}

function showScreen(next: Screen) {
  screen = next
  if (next === 'map') {
    overview = false
    mapOrder = null
    inspectMode = false
    inspection = null
  }
  render()
  if (next === 'map') {
    camera.reset()
    prompt.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
  }
  else menu.querySelector<HTMLElement>('#menu-title')?.focus({ preventScroll: true })
}

function openingOptions(state: Run) {
  if (state.cyclone) return `<form class="hurricane-name-form" id="hurricane-name-form">
    <label for="hurricane-name">Hurricane name</label><input id="hurricane-name" name="name" maxlength="32" required autocomplete="off" value="${escapeName(hurricaneName)}">
    <button type="submit" class="order hot" ${loadingExposure === state ? 'disabled aria-busy="true"' : ''}><strong>Begin</strong></button>
    <button type="button" class="quiet" data-key="change-origin" data-action="change-origin">Clear marker</button>
  </form>`
  const forecast = state.blizzardPattern ? `<div class="opening-forecast" role="group" aria-label="Blizzard type">
    ${blizzardOptions(state.theater.places[state.origin]).map((type, index) =>
      `<button class="quiet" data-key="blizzard-type-${type}" data-action="blizzard-type" data-value="${type}" aria-pressed="${state.blizzardPattern === type}"><strong>${type}</strong>${index === 0 ? '<small>Recommended</small>' : ''}</button>`).join('')}
  </div>` : ''
  return `<div class="opening-controls">${forecast}<div class="orders">
    <button class="order hot" data-key="launch" data-action="launch" ${loadingExposure === state ? 'disabled aria-busy="true"' : ''}><strong>Begin</strong></button>
    ${button('change-origin', 'Clear marker', undefined, 'quiet')}
  </div></div>`
}

function worldOptions() {
  return `<details class="coordinate-drop"><summary>Enter coordinates</summary><form id="coordinate-form">
      <label>Latitude <input name="latitude" type="number" min="-90" max="90" step="any" required></label>
      <label>Longitude <input name="longitude" type="number" min="-180" max="180" step="any" required></label>
      <button type="submit" class="quiet">Set drop point</button>
    </form></details>`
}

function routeOrders(state: Run) {
  if (state.fire) return `<div class="route-status front-orders"><div class="course-caption">
    <strong>${state.fire.active} burning ${state.fire.active === 1 ? 'hex' : 'hexes'} · ${Math.round(state.fire.containment * 100)}% contained</strong>
    <span>${mapFeedback || (mapOrder === 'ember' ? 'Choose a highlighted downwind cell' : state.fire.aircraft ? 'Ground crews and aircraft responding' : state.fire.responseAt !== null ? 'Ground crews building fireline' : 'Wind carries embers into new fuel')}</span></div>
    ${mapOrder === 'ember' ? button('cancel-map-order', 'Cancel', undefined, 'route-choice') :
      `<button class="route-choice ability" data-key="ability" data-action="ability" ${hazardAbilityReady(state) ? '' : 'disabled'}><strong>Send embers</strong><small>${Math.floor(state.charge)} / ${abilityCost(state)} embers</small></button>`}</div>`

  if (state.cyclone) {
    const weather = conditions(state, state.at)
    const trend = weather.trend > .005 ? 'Strengthening' : weather.trend < -.005 ? 'Weakening' : 'Steady'
    return `<div class="route-status front-orders"><div class="course-caption">
      <strong>${state.name} · Drifting ${directionName(state.front!.heading)}</strong>
      <span>${weather.name} · ${trend}</span></div><div class="orders">${button('history', 'Track history', undefined, 'route-choice')}${resourceAbility(state)}</div></div>`
  }
  if (state.snow) return `<div class="route-status front-orders"><div class="course-caption">
    <strong>${state.blizzardPattern} · Drifting ${directionName(state.front!.heading)}</strong>
    <span>${state.whiteout ? 'Whiteout conditions' : state.snow.source === 'ocean' ? 'Ocean moisture feeding the band'
      : state.snow.source ? `Moisture from ${escapeName(state.snow.source)}` : conditions(state, state.at).name}</span></div>
    <div class="orders blizzard-steering ${state.blizzardPattern === "Nor'easter" ? 'wide-steering' : ''}" role="group" aria-label="Blizzard course">
      ${Object.entries(blizzardCourses).filter(([course]) => blizzardCourseAvailable(course as BlizzardCourse, state.blizzardPattern)).map(([course, { label, name, degrees }]) =>
        `<button class="route-choice" data-key="blizzard-course-${course}" data-action="blizzard-course" data-value="${course}" aria-label="${name}" aria-pressed="${state.snow?.steering.course === course}">${label}<small>${degrees ? `${Math.abs(degrees)}°` : '0°'}</small></button>`).join('')}
    </div>${resourceAbility(state)}</div>`
  if (state.front && state.theater.storm !== 'Tornado') return frontOrders(state)
  const { zones } = state
  const inTransit = state.progress > 0
  const selected = inTransit ? state.queued ?? preferredRoute(state, state.to) : state.to
  const hazard = hazardFor(activeStorm(state))
  const routeHint = inspectMode ? 'Close inspection to steer'
    : overview ? 'Pick a map marker or open Storm view' : 'Pick a route marker on the map'
  const ability = hazard
    ? `<button class="route-choice ability" data-key="ability" data-action="ability" ${!hazardAbilityReady(state) ? 'disabled' : ''}><strong>${hazard.ability.name}</strong><small>${Math.floor(state.charge)} / ${abilityCost(state)} ${hazard.ability.resource}</small></button>`
    : ''
  const cooldown = satelliteCooldown(state)
  const satellite = state.effects.satelliteTrigger
    ? `<button class="route-choice ability" data-key="satellite" data-action="satellite" ${cooldown || state.overWater ? 'disabled' : ''}><strong>Spawn satellite tornado</strong><small>${cooldown ? `${tornadoDuration(cooldown)} to recharge` : state.overWater ? 'Available over land' : 'Ready'}</small></button>`
    : ''
  if (state.front) return `<div class="route-status front-orders"><div class="course-caption">
    <strong>${state.name} · Drifting ${directionName(state.front.heading)}</strong>
    <span>${mapFeedback || (mapOrder ? 'Tap the map to set a preferred heading' : 'Follow the projected tornado track')}</span></div>
    <div class="orders">${mapOrder ? button('cancel-map-order', 'Cancel', undefined, 'route-choice')
      : `${state.effects.courseControl ? button('storm-course', 'Set tornado heading', undefined, 'route-choice') : ''}${satellite}`}</div></div>`
  return `<div class="route-status">
    <div class="course-caption"><strong>Moving toward ${zones[state.to].name}</strong>
    <span>${inTransit ? `Next: ${zones[selected].name} · ` : ''}${Math.ceil((leg - state.progress) / travelRate(state))}s · ${routeHint}</span></div>
    ${ability}</div>`
}

function resourceAbility(state: Run) {
  const ability = stormAbility(state)
  if (!ability) return ''
  return `<button class="route-choice ability" data-key="ability" data-action="ability" ${hazardAbilityReady(state) ? '' : 'disabled'}>
    <strong>${ability.name}</strong><small>${state.time < state.boostUntil ? 'Active' : `${Math.floor(state.charge)} / ${abilityCost(state)} ${ability.resource}`}</small></button>`
}

function frontOrders(state: Run) {
  const front = state.front!
  const funnel = front.funnels.find(item => item.id === selectedFunnel && isActive(item, state.time))
  const ability = stormAbility(state)!
  const heading = funnel ? `Tornado ${funnel.id} · EF${funnel.ef}` : `Drifting ${directionName(front.heading)} · ${front.locality.name}`
  const hint = mapFeedback || (mapOrder === 'drop' ? 'Choose land inside the highlighted area'
    : mapOrder === 'burst' ? 'Choose a target on land inside the highlighted range'
    : mapOrder === 'storm' || mapOrder === 'funnel' ? 'Tap the map to set a preferred heading'
    : funnel ? `${formatDistance(funnel.width)} wide · ${formatDamage(funnel.damage)} damage · ${funnel.start + funnel.life - state.time}s left · ${state.effects.tornadoSteering ? 'Select again to set heading' : 'Guided Funnels unlocks steering'}`
    : ability.tornado ? `${state.effects.precisionDrop ? 'Precision Touchdown available' : 'Touchdown and heading are random'} · ${activeStorm(state) === 'Supercell' ? 'Supercell can spawn violent tornadoes' : 'EF0–EF2'}`
    : state.effects.targetedBurst ? 'Activate your ability to select a target' : 'Follow the projected storm track')
  const controls = mapOrder
    ? button('cancel-map-order', 'Cancel', undefined, 'route-choice')
    : `${state.effects.courseControl ? button('storm-course', 'Set storm heading', undefined, 'route-choice') : ''}
      <button class="route-choice ability" data-key="ability" data-action="ability" ${hazardAbilityReady(state) ? '' : 'disabled'}><strong>${ability.name}</strong><small>${Math.floor(state.charge)} / ${abilityCost(state)} ${ability.resource}</small></button>`
  return `<div class="route-status front-orders"><div class="course-caption"><strong>${heading}</strong><span>${hint}</span></div><div class="orders">${controls}</div></div>`
}

function results(state: Run) {
  if (state.tornado) return `<div class="report-heading"><strong>${state.name} · Forecast ended</strong></div>
    <p class="report-summary">Pan or zoom to inspect the damage track.</p>
    <div class="orders">${button('clipping', 'Read news', undefined, 'order')}
    ${button('view-results', 'Next', undefined, 'order hot')}${scoreButton(state)}${button('retry', 'Retry', undefined, 'order')}</div>`
  const total = totals(state)
  const kind = state.theater.storm
  if (!isCampaignEvent(kind)) return ''
  const rating = earnedStars(kind, state.difficulty, total.damage, true)
  const upcoming = nextEvent(kind)
  const snowfall = state.snow ? snowfallSummary(state.snow) : ''
  return `<div class="report-heading"><strong>${state.name || kind} · ${difficultyLabel(state.difficulty)}</strong>${state.sandbox ? '<span>Sandbox</span>' : stars(rating, state.difficulty)}</div>
    <p class="report-summary">${state.end} ${formatDamage(total.damage)} in property lost.</p>${snowfall}
    <p class="report-summary">Pan or zoom to inspect the final map.${total.damage && !state.fire ? ' Amber dots mark recorded property damage.' : ''}</p>
    ${unlockedOnFinish ? `<p class="event-unlock" role="status">${unlockedOnFinish} unlocked.</p>` : ''}
    <div class="orders">${state.cyclone ? button('history', 'Track history', undefined, 'order') : ''}${!state.sandbox && upcoming && eventUnlocked(upcoming) ? button('next-event', `Next: ${upcoming}`, upcoming, 'order hot') : ''}
    ${scoreButton(state)}${button('retry', 'Retry same forecast', undefined, 'order')}${button('new', 'New forecast', undefined, 'order')}</div>`
}

function snowfallSummary(snow: NonNullable<Run['snow']>) {
  const places = new Map<string, number>()
  for (const { place, cm } of snow.deposits.values()) places.set(place, Math.max(cm, places.get(place) ?? 0))
  const highest = [...places].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const depths = highest.map(([place, cm]) => `${place} ${snowfallDepth(cm)}`).join(' · ')
  return `<p class="report-summary">${depths ? `Snowiest areas · ${depths}. ` : ''}Longest whiteout · ${clock(snow.longestWhiteout)} of forecast time.</p>`
}

function eventText(event: Run['events'][number]) {
  if (getLocale() !== 'en' && event.kind === 'touchdown' && event.locality) {
    const place = escapeName(event.locality)
    return getLocale() === 'fr' ? `Tornade signalée · ${place}` : `Tornado detectado · ${place}`
  }
  if (getLocale() !== 'en' && event.kind === 'shelter' && event.locality) {
    const place = escapeName(event.locality)
    return getLocale() === 'fr' ? `${place} · Consigne de mise à l’abri` : `${place} · Orden de refugiarse`
  }
  if (getLocale() !== 'en' && event.snowfall) {
    const { place, cm } = event.snowfall
    return getLocale() === 'fr' ? `${place} signale ${snowfallDepth(cm)} de neige.` : `${place} informa de ${snowfallDepth(cm)} de nieve.`
  }
  return event.snowfall ? `${event.snowfall.place} reports ${snowfallDepth(event.snowfall.cm)} ${event.text}` : event.text
}

function tornadoImpact(state: Run) {
  const total = totals(state)
  const countryDeaths = new Map<string, number>()
  let injured = 0
  for (const { country, site } of impactAreas(state)) {
    injured += site.injured
    if (country && site.deaths) countryDeaths.set(country, (countryDeaths.get(country) ?? 0) + site.deaths)
  }
  return { ...total, injured, countryDeaths }
}

function tornadoReportStats(state: Run) {
  const record = state.tornado!
  const total = tornadoImpact(state)
  return [
    ['Damage score', formatDamage(total.damage)], ['Deaths', num.format(total.deaths)], ['Injured', num.format(total.injured)],
    ['Lifetime', tornadoDuration(state.time)], ['Time on ground', tornadoDuration(record.groundTicks)],
    ['Path length', formatDistance(record.lengthKm)], ['Peak width', formatDistance(record.maxWidthKm)],
    ['Peak rating', record.peakEf === null ? 'Waterspout' : `EF${record.peakEf}`],
  ]
}

function tornadoResults(state: Run) {
  const rating = earnedStars('Tornado', state.difficulty, totals(state).damage, true)
  const places = [...state.tornado!.places]
  return `<section class="forecast-results" aria-labelledby="menu-title">
    <header><p>Tornado · ${difficultyLabel(state.difficulty)} · ${tornadoDate(state.tornado!.startedAt)}</p><h1 id="menu-title" tabindex="-1">Forecast complete</h1>
      <p class="result-name">${state.name}</p>${state.sandbox ? '<p>Sandbox</p>' : stars(rating, state.difficulty)}</header>
    <dl class="forecast-stat-sheet">${tornadoReportStats(state).map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
    <div class="forecast-places"><strong>Cities and towns affected</strong><p>${places.length ? places.join(' · ') : 'None reported'}</p></div>
    ${unlockedOnFinish ? `<p class="event-unlock" role="status">${unlockedOnFinish} unlocked.</p>` : ''}
    <footer>${button('explore-damage', 'Explore damage', undefined, 'order')}${scoreButton(state)}${button('retry', 'Retry', undefined, 'order hot')}${button('main-menu', 'Exit', undefined, 'order')}</footer>
  </section>`
}

function tornadoClipping(state: Run) {
  const record = state.tornado!
  const total = tornadoImpact(state)
  const headline = tornadoVerdict(record, total.damage, total.deaths, total.countryDeaths)
  const places = [...record.places]
  const leadPlaces = new Intl.ListFormat(getLocale()).format(places.slice(0, 5))
  const where = places.length ? `Damage was reported in or near ${leadPlaces}${places.length > 5 ? ` and ${places.length - 5} other communities` : ''}.`
    : total.damage ? 'Damage was reported outside named towns and cities.' : 'No damage was reported in named towns or cities.'
  const timing = tornadoClock(record.startedAt, 0)
  const ending = tornadoClock(record.startedAt, state.time)
  return `<article class="tornado-clipping">
    <div class="clipping-masthead"><strong>The Stormwake Dispatch</strong><span>${tornadoDate(record.startedAt)} · Simulation report</span></div>
    <h3>${headline}</h3>
    <p class="clipping-byline">Final storm survey · ${timing.time} to ${ending.time}</p>
    <p>${state.name} formed on ${tornadoDate(record.startedAt)} and lasted ${tornadoDuration(state.time)}. It ${record.peakEf === null
      ? 'remained over water' : `reached EF${record.peakEf} and cut a ${formatDistance(record.lengthKm)} path on land`}.${record.maxWidthKm ? ` At its widest, it measured ${formatDistance(record.maxWidthKm)} across.` : ''}</p>
    <p>${where} The storm caused ${num.format(total.deaths)} deaths and ${num.format(total.injured)} injuries, with property losses estimated at ${formatDamage(total.damage)}.</p>
    <footer>${button('explore-damage', 'Explore damage', undefined, 'order')}${button('retry', 'Retry', undefined, 'order')}${button('view-results', 'Next', undefined, 'order hot')}</footer>
  </article>`
}

function renderPanel() {
  if (!panel || !run) return
  let content: string
  let title: string
  if (panel === 'pause') {
    title = 'Paused'
    content = `<div class="pause-options">
      ${button('close-panel', 'Resume', undefined, 'order hot')}
      ${button('restart', 'Restart', undefined, 'order')}
      ${button('pause-settings', 'Settings', undefined, 'order')}
      ${button('main-menu', 'Main menu', undefined, 'order')}
    </div>`
  } else if (panel === 'pause-settings') {
    title = 'Settings'
    content = `<div class="pause-settings">${settingsContent()}${button('pause-back', 'Back to pause menu', undefined, 'order')}</div>`
  } else if (panel === 'clipping' && run.tornado) {
    title = 'Final storm report'
    content = tornadoClipping(run)
  } else if (panel === 'score' && finishedRun) {
    const { placement, metrics } = finishedRun
    title = ticket ? 'Submit score' : 'Save score'
    content = `<form id="score-form" class="score-submit">
      <dl class="region-stats"><div><dt>Event</dt><dd>${placement.event}</dd></div><div><dt>Difficulty</dt><dd>${difficultyLabel(placement.difficulty)}</dd></div>
        <div><dt>Damage</dt><dd>${formatDamage(metrics.damage ?? 0)}</dd></div><div><dt>Deaths</dt><dd>${num.format(metrics.deaths ?? 0)}</dd></div></dl>
      <label for="score-name">Display name</label><input id="score-name" name="displayName" data-key="score-name" required maxlength="48" value="${escapeName(savedDisplayName())}">
      ${!ticket ? '<p>Scores saved on this device</p>' : ''}
      <button class="order hot" type="submit" ${scoreSubmitting || scoreAccepted ? 'disabled' : ''}>${title}</button>
      <p role="status">${escapeName(scoreMessage)}</p></form>`
  } else if (panel === 'evolve') {
    const storm = run.theater.storm
    const state = run
    const tree = trees[storm]
    const tornado = storm === 'Tornado'
    const evolvingStorm = storm === 'Thunderstorm'
    const tabs = tornado || storm === 'Blizzard' || storm === 'Wildfire' || evolvingStorm ? [tornado ? 'Tornado' : 'Storm', ...tornadoBranches] : ['Storm', ...branches.filter(branch => tree.some(item => item.branch === branch))]
    const choices = tree.filter(item => item.branch === evolutionTab)
    const selected = choices.find(item => item.id === selectedUpgrade) ?? choices[0]
    title = `Evolve ${storm.toLowerCase()}`
    const pane = selected
      ? upgradeBoard(state, choices, selected.id) + upgradeDetails(state, selected.id)
      : tornado ? tornadoOverview(state) : `<div class="evolve-tree"><div class="node"><div class="hex installed">${icon('storm')}</div><span>${storm}</span></div></div>
        <div class="upgrade-detail"><h3>${evolvingStorm ? stormOrganization(run) : storm}</h3><p>${run.theater.name} · ${difficultyLabel(run.difficulty)}</p>${evolvingStorm ? '<p>The strongest of Rotation and touchdown, Straight-line winds, and Cell regeneration determines the storm type. Drop Tornado stays available in all three forms.</p>' : ''}<dl class="region-stats"><div><dt>Strength</dt><dd>${Math.round(run.strength)}%</dd></div><div><dt>Detection</dt><dd>${run.detectedAt === null ? 'Unnoticed' : 'Detected'}</dd></div><div><dt>Upgrades installed</dt><dd>${state.upgrades.length} of ${tree.length}</dd></div></dl></div>`
    content = `<nav class="evolution-tabs" aria-label="Evolution views">${tabs.map(tab => `<button data-key="evolution-tab-${tab}" data-action="evolution-tab" data-value="${tab}" aria-pressed="${evolutionTab === tab}">${storm === 'Hurricane' && tab === 'Impact' ? 'Damage' : tab}</button>`).join('')}</nav>
      <div class="evolution network-evolution">${pane}</div>
      ${evolutionFooter(state, selected)}`
  } else if (panel === 'history' && run.cyclone) {
    title = `${run.name} · Track history`
    const cyclone = run.cyclone
    const peak = cyclone.peakWind
    content = `<p>Peak intensity ${hurricaneCategory(peak)} · ${windSpeed(peak)} sustained wind.</p>
      <ol class="cyclone-history">${cyclone.history.map(stage => `<li>${cycloneEventTime(cyclone, stage.time)}<div><strong>${stage.category}</strong><span>${windSpeed(stage.wind)} · ${stage.location}</span><small>${stage.reason}</small></div></li>`).join('')}</ol>`
  } else if (panel === 'news') {
    title = 'Storm news'
    const { tornado, cyclone } = run
    content = `<ol class="news-list">${run.events.map(event => {
      const timestamp = cyclone ? cycloneEventTime(cyclone, event.time)
        : `<time>${tornado ? tornadoClock(tornado.startedAt, event.time).time : clock(event.time)}</time>`
      return `<li>${timestamp}<span>${eventText(event)}</span></li>`
    }).join('')}</ol>`
  } else {
    const id = inspected ?? run.at
    const zone = run.front?.current.zone ?? run.zones[id]
    const site = run.front?.current.site ?? run.sites[id]
    const living = (zone.population ?? 0) - site.deaths
    title = run.front?.locality.name ?? zone.name
    content = !zone.sea
      ? `<p>${site.warnedAt === null ? 'No active warning' : 'Shelter warning active'} · ${zone.source}</p><dl class="region-stats"><div><dt>Population remaining</dt><dd>${num.format(living)}</dd></div><div><dt>People per square mile</dt><dd>${num.format(zone.density)}</dd></div><div><dt>In shelter</dt><dd>${num.format(site.sheltered)}</dd></div><div><dt>Injured</dt><dd>${num.format(site.injured)}</dd></div><div><dt>Deaths</dt><dd>${num.format(site.deaths)}</dd></div><div><dt>Property lost</dt><dd>${formatDamage(site.loss)}</dd></div></dl>`
      : `<p>${conditions(run, id).name}. ${conditions(run, id).trend > 0 ? 'The storm can gain strength here.' : 'The storm loses strength here.'}</p>`
  }
  dialog.dataset.view = panel
  const oldTree = dialog.querySelector<HTMLElement>('.upgrade-tree')
  const treeScroll = oldTree?.dataset.branch === evolutionTab ? { left: oldTree.scrollLeft, top: oldTree.scrollTop } : null
  replace(dialog, `<header class="panel-header"><h2 id="panel-title" tabindex="-1">${title}</h2><button class="icon-button" data-key="close-panel" data-action="close-panel" aria-label="${panel === 'pause-settings' ? 'Back' : 'Close'}">${icon('close')}</button></header>${content}`)
  if (treeScroll) dialog.querySelector<HTMLElement>('.upgrade-tree')?.scrollTo(treeScroll)
}

function evolutionFooter(state: Run, selected?: Upgrade) {
  const preview = selected && !state.upgrades.includes(selected.id) && !state.end ? selected : undefined
  const labels = { damage: 'Damage', lifespan: 'Lifespan', resistance: 'Resistance' }
  const descriptions = { damage: 'Potential to cause damage', lifespan: 'Ability to stay active', resistance: 'Tolerance to adverse conditions' }
  const stats = evolutionStats.map(stat => {
    const { current, projected } = evolutionRating(state.theater.storm, stat, state.effects, preview)
    const gain = projected - current
    const label = labels[stat]
    return `<div class="evolution-stat" data-stat="${stat}" title="${descriptions[stat]}">
      <div class="evolution-stat-label"><span>${label}</span><span class="evolution-stat-value">${num.format(current)}${gain > 0 ? ` <b>+${num.format(gain)}</b>` : ''}</span></div>
      <div class="evolution-stat-track" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${current}"
        ${gain > 0 ? `aria-valuetext="${current} of 100. Selected upgrade adds ${gain}."` : ''}>
        <div class="evolution-stat-fill" style="width:${current}%"></div>
        ${gain > 0 ? `<div class="evolution-stat-preview" style="left:${current}%;width:${gain}%"></div>` : ''}
      </div>
    </div>`
  }).join('')
  return `<footer class="panel-status">
    <strong>${state.sandbox ? 'Unlimited Momentum' : `${num.format(state.momentum)} Momentum`}</strong>
    <div class="evolution-stats">${stats}</div>
  </footer>`
}

function upgradeNode(state: Run, item: Upgrade, selected: string, connector = '') {
  const installed = state.upgrades.includes(item.id)
  const price = upgradeCost(state, item)
  const status = installed ? 'installed' : upgradeLocked(state, item) ? 'locked' : state.momentum < price ? 'unaffordable' : 'available'
  return `<button class="upgrade-node ${connector} ${item.capstone ? 'capstone' : ''}" data-key="upgrade-${item.id}" data-action="select-upgrade" data-value="${item.id}" aria-pressed="${item.id === selected}" aria-label="${item.name}">
    <span class="hex ${status}">${icon(upgradeIcon(item))}</span>
    <strong>${item.name}</strong><small>${installed ? 'Installed' : `${state.sandbox ? 'Free' : `${price} Momentum`}${status === 'locked' ? ' · Locked' : ''}`}</small>
  </button>`
}

function upgradeBoard(state: Run, choices: Upgrade[], selected: string) {
  if (state.tornado && evolutionTab === 'Damage') return tornadoDamageBoard(state, choices, selected)
  const groups = [...new Set(choices.map(item => item.group!))]
  return `<div class="upgrade-tree" role="group" data-branch="${evolutionTab}" aria-label="${state.cyclone && evolutionTab === 'Impact' ? 'Damage' : evolutionTab} upgrades">
    ${groups.map(group => {
      const nodes = choices.filter(item => item.group === group)
      const lanes = [...new Set(nodes.flatMap(item => item.lane ? [item.lane] : []))]
      const merge = nodes.find(item => item.requiresAll)
      return `<section class="upgrade-network ${merge ? 'has-merge' : ''}">
        <h3>${group}</h3>
        <div class="upgrade-network-grid">
          ${lanes.map(lane => `<div class="upgrade-lane">${state.tornado && lanes.length === 1 ? '' : `<h4>${lane}</h4>`}
            ${nodes.filter(item => item.lane === lane).map(item => upgradeNode(state, item, selected, item.requires ? 'linked' : '')).join('')}
          </div>`).join('')}
          ${merge ? `<div class="upgrade-junction">${upgradeNode(state, merge, selected)}</div>` : ''}
        </div>
      </section>`
    }).join('')}
  </div>`
}

function tornadoDamageBoard(state: Run, choices: Upgrade[], selected: string) {
  const rows = [
    [null, 'rain-wrapped', 'tornado-rain-core', 'tornado-rain-swath', 'tornado-runoff'],
    ['wide-funnel', 'satellite', 'wedge', null, 'multi-vortex'],
    ['vortex', 'rear-flank', 'tornado-vortex-breakdown', 'tornado-inner-core'],
    [null, null, 'tornado-debris', 'tornado-debris-load', 'tornado-debris-barrage'],
    [null, null, 'tornado-low-jet', 'tornado-ground-jet'],
  ]
  const windRow = 2
  const nodeWidth = 104
  const nodeHeight = 94
  const columnPitch = 116
  const rowPitch = 118
  const boardWidth = 4 * columnPitch + nodeWidth
  const boardHeight = 4 * rowPitch + nodeHeight
  const positions = new Map(rows.flatMap((row, y) => row.flatMap((id, x) => id ? [[id, { x, y }] as const] : [])))
  const center = ({ x, y }: { x: number; y: number }) => ({
    x: x * columnPitch + nodeWidth / 2,
    y: y * rowPitch + nodeHeight / 2,
  })
  const links = choices.flatMap(item => (item.requiresAll ?? (item.requires ? [item.requires] : [])).map(id => {
    const { x, y } = center(positions.get(id)!)
    const { x: endX, y: endY } = center(positions.get(item.id)!)
    const halfWidth = nodeWidth / 2
    const halfHeight = nodeHeight / 2
    const rightGutter = x + columnPitch / 2
    let path: string
    if (item.id === 'rain-wrapped') {
      path = `M${x + halfWidth} ${y - 18}H${rightGutter}V${endY + rowPitch / 2}H${endX}V${endY + halfHeight}`
    } else if (id === 'tornado-inner-core' && item.id === 'multi-vortex') {
      path = `M${x} ${y - halfHeight}V${endY + rowPitch / 2}H${endX}V${endY + halfHeight}`
    } else if (item.id === 'tornado-debris' || item.id === 'tornado-low-jet') {
      const lowerGutter = endY - rowPitch / 2
      const laneX = rightGutter + (item.id === 'tornado-debris' ? 0 : -4)
      path = `M${x + halfWidth} ${y + (item.id === 'tornado-debris' ? 18 : 26)}H${laneX}V${lowerGutter}H${endX}V${endY - halfHeight}`
    } else if (id === 'tornado-ground-jet' && item.id === 'tornado-debris-barrage') {
      path = `M${x + halfWidth} ${y}H${endX}V${endY + halfHeight}`
    } else if (x === endX) {
      const direction = Math.sign(endY - y)
      path = `M${x} ${y + direction * halfHeight}V${endY - direction * halfHeight}`
    } else {
      path = `M${x + halfWidth} ${y}H${endX - halfWidth}`
    }
    return `<path d="${path}" class="${state.upgrades.includes(id) ? 'earned' : ''}"/>`
  })).join('')
  const order = rows[windRow]
  const ordered = [...order.map(id => choices.find(item => item.id === id)!), ...choices.filter(item => !order.includes(item.id))]
  return `<div class="upgrade-tree" role="group" data-branch="Damage" aria-label="Damage upgrades">
    <div class="tornado-damage-tree" style="--node-width:${nodeWidth}px;--node-height:${nodeHeight}px;--column-gap:${columnPitch - nodeWidth}px;--row-gap:${rowPitch - nodeHeight}px">
      <div class="tornado-wind-track" style="grid-row:${windRow + 1}" aria-hidden="true"></div>
      <svg class="tornado-tree-links" viewBox="0 0 ${boardWidth} ${boardHeight}" aria-hidden="true">${links}</svg>
      <h3 class="tornado-branch-name tornado-wind-heading" style="grid-area:3/1">Wind speed</h3>
      <h3 class="tornado-branch-name" style="grid-area:2/1">Path width</h3>
      <h3 class="tornado-branch-name" style="grid-area:1/2">Rain and hail</h3>
      <h3 class="tornado-branch-name tornado-debris-heading" style="grid-area:3/3">Debris</h3>
      ${ordered.map(item => {
        const { x, y } = positions.get(item.id)!
        return `<div class="tornado-tree-slot ${y === windRow ? 'wind-spine' : ''}" style="grid-area:${y + 1}/${x + 1}">${upgradeNode(state, item, selected)}</div>`
      }).join('')}
    </div>
  </div>`
}

function tornadoOverview(state: Run) {
  const stats = stormStats(state)
  const weather = conditions(state, state.at)
  const limits = tornadoLimits(state)
  return `<section class="tornado-overview">
    <div class="tornado-profile"><div class="hex installed">${icon('wind')}</div><div><h3>${state.name}</h3><p>${state.front!.locality.name} · ${difficultyLabel(state.difficulty)}</p></div></div>
    <p>Wind and width increase through Damage upgrades. Inflow and local conditions determine how long the circulation holds together.</p>
    <dl class="region-stats"><div><dt>Intensity</dt><dd>${stats.category}</dd></div><div><dt>Peak winds</dt><dd>${windSpeed(stats.windMph)}</dd></div>
    <div><dt>Damage path width</dt><dd>${formatDistance(stats.widthKm)}</dd></div><div><dt>Forward speed</dt><dd>${windSpeed(frontSpeed(state) * 3600 / tornadoTickSeconds / 1.609344)}</dd></div>
    <div><dt>Path length</dt><dd>${formatDistance(state.tornado!.lengthKm)}</dd></div>
    <div><dt>Travel limit</dt><dd>${formatDistance(limits.km)}</dd></div><div><dt>Lifetime limit</dt><dd>${tornadoDuration(limits.ticks)}</dd></div><div><dt>Time on ground</dt><dd>${tornadoDuration(state.tornado!.groundTicks)}</dd></div>
    <div><dt>Local conditions</dt><dd>${weather.name}</dd></div><div><dt>Detection</dt><dd>${state.detectedAt === null ? 'Unnoticed' : 'Detected'}</dd></div>
    <div><dt>Visibility</dt><dd>${state.effects.rainWrap ? 'Rain-wrapped' : 'Visible funnel'}</dd></div><div><dt>Track guidance</dt><dd>${state.effects.courseControl >= 1 ? 'Any heading' : state.effects.courseControl ? `±${Math.round(state.effects.courseControl * 180)}° from natural heading` : 'Locked'}</dd></div></dl>
  </section>`
}

function upgradeDetails(state: Run, id: string) {
  const tree = trees[state.theater.storm]
  const item = tree.find(entry => entry.id === id)!
  const installed = state.upgrades.includes(id)
  const prereq = tree.find(entry => entry.id === item.requires)
  const locked = upgradeLocked(state, item)
  const required = item.requiresAll?.map(id => tree.find(entry => entry.id === id)!.name)
  const price = upgradeCost(state, item)
  const refund = upgradeRefund(state, id)
  const cost = locked ? 'Locked' : state.momentum < price ? `Need ${price - state.momentum} more Momentum` : state.sandbox ? 'Install upgrade' : `Buy for ${price} Momentum`
  return `<div class="upgrade-detail"><h3>${item.name}</h3><p>${measurementText(item.description)}</p>
    ${prereq ? `<p class="requirement">Requires ${prereq.name}</p>` : ''}
    ${installed
      ? `<button class="order" data-key="refund" data-action="refund" aria-haspopup="dialog" data-value="${id}" ${canRemoveUpgrade(state, id) ? '' : 'disabled'}>Remove upgrade${state.sandbox ? '' : ` · ${refund} Momentum back`}</button>
        ${!state.end && !canRemoveUpgrade(state, id) ? '<p class="requirement">Remove dependent upgrades first.</p>' : ''}`
      : `<button class="order hot" data-key="buy" data-action="buy" data-value="${id}" ${locked || state.momentum < price || state.end ? 'disabled' : ''}>${cost}</button>`}
  </div>`
}

function renderInspection() {
  if (!inspectMode || !inspection) {
    replace(inspector, '')
    return
  }
  const selection = inspection
  const entry = selection && inspectedTotals(selection, opening ? null : run)
  replace(inspector, `<header><strong>Population</strong><button class="icon-button" aria-label="Close inspection" data-key="inspect-close" data-action="inspect-close">${icon('close')}</button></header>
    <label>Country<select aria-label="Country" data-inspect="country" data-key="inspect-country">
      <option value=""${selection ? '' : ' selected'}>Choose a country</option>
      ${countries.map(country => `<option value="${country.code}"${country.code === selection?.code ? ' selected' : ''}>${country.name}</option>`).join('')}
    </select></label>
    ${selection?.regions?.length ? `<label>State, province or region<select aria-label="State, province or region" data-inspect="region" data-key="inspect-region">
      <option value="">Whole country</option>${selection.regions.map(region => `<option value="${region.id}"${region.id === selection.regionId ? ' selected' : ''}>${region.name}</option>`).join('')}
    </select></label>` : ''}
    <div id="inspection-figures"></div>
    ${selection?.regionId ? '<a class="population-source" href="https://www.geonames.org/export/" target="_blank" rel="noopener">GeoNames estimates</a>' : ''}
    ${selection?.error ? '<p>Regional outlines could not load. Click the country to retry.</p>' : selection && !selection.regions ? '<p>Loading regional outlines…</p>' : selection?.regions?.length === 0 ? '<p>Regional outlines unavailable.</p>' : ''}`)
  replace(inspector.querySelector<HTMLElement>('#inspection-figures')!, entry
    ? `<h2>${entry.name}</h2><dl><div><dt>Population</dt><dd>${entry.population != null ? num.format(entry.population) : 'Unavailable'}</dd></div><div><dt>Injured</dt><dd>${num.format(entry.injured)}</dd></div><div><dt>Deaths</dt><dd>${num.format(entry.deaths)}</dd></div></dl>`
    : '<p>Tap a country on the world map.</p>')
}

async function inspectCountry(code: string) {
  if (!countries.some(country => country.code === code)) return
  inspectMode = true
  const selection: Inspection = { code, regions: null, regionId: null, error: false }
  inspection = selection
  render()
  try { selection.regions = await getRegions(code) }
  catch { selection.error = true }
  if (inspection === selection) render()
}

function latestHeadline() {
  return run && !opening && !run.end && !panel && settings.newsMode !== 'quiet' ? news.banner : undefined
}

function renderWeatherPickup(state: Run | null) {
  const pickup = state && !opening && !state.end ? state.pickup : null
  replace(weatherPickup, pickup ? button('weather-pickup',
    `${icon('wind')}<span><strong>${pickup.label}</strong><small>+${pickup.points} Momentum</small></span>`, String(pickup.time), 'weather-pickup-button') : '')
  if (!pickup) return
  const marker = map.querySelector<SVGGElement>('[data-storm-position]')?.getScreenCTM()
  const chart = map.getBoundingClientRect()
  if (!marker || marker.e < chart.left || marker.e > chart.right || marker.f < chart.top || marker.f > chart.bottom) {
    weatherPickup.style.removeProperty('left')
    weatherPickup.style.removeProperty('top')
    return
  }
  const halfWidth = weatherPickup.offsetWidth / 2
  const x = marker.e - chart.left
  const beside = x + halfWidth + 18
  const rightLimit = chart.width - halfWidth - 51
  const left = beside <= rightLimit ? beside : Math.min(rightLimit, Math.max(halfWidth + 9, x - halfWidth - 18))
  const top = Math.min(chart.height - 128, Math.max(82, marker.f - chart.top - 24))
  weatherPickup.style.left = `${left}px`
  weatherPickup.style.top = `${top}px`
}

function fireArea(km2: number) {
  return settings.units === 'metric' ? `${km2.toFixed(1)} km²` : `${Math.round(km2 * 247.105)} acres`
}

function liveReadings(state: Run) {
  const reading = stormStats(state)
  const hazard = hazardFor(activeStorm(state))
  const mainReading = state.fire ? ['Burned area', fireArea(state.fire.areaKm2)]
    : state.theater.storm === 'Dust Storm' ? ['Visibility', `${formatDistance(2 * (1 - state.strength / 100) ** 2 + .02)}`]
    : state.theater.storm === 'Heat Dome' ? ['Temperature', `${temperature(29 + state.strength * .28 + state.effects.heatDegrees)}`]
    : ['Wind speed', `${windSpeed(reading.windMph)}`]
  const items = [
    ['Width', formatDistance(reading.widthKm)],
    mainReading,
    [hazard ? 'Conditions' : state.theater.storm === 'Hurricane' ? 'Category' : 'Status', reading.category],
  ]
  if (state.fire) {
    items[0] = ['Wind toward', ['E', 'SE', 'SW', 'W', 'NW', 'NE'][state.fire.wind]]
    if (!opening) items.push(['Spot fires', String(state.fire.spotfires)])
  }
  if (state.blizzardPattern) items.unshift(['Type', state.blizzardPattern])
  if (state.snow && !opening) {
    const peak = Array.from(state.snow.deposits.values()).reduce((max, report) => Math.max(max, report.cm), 0)
    items.push(['Peak snowfall', snowfallDepth(peak)], ['Visibility', formatDistance(state.snow.visibilityMiles * 1.609344)])
  }
  if (state.name) items.unshift(['Name', state.name])
  if (state.tornado) {
    if (opening) items.push(['Start support', tornadoSupportLabel(tornadoSupportAt(state.front!.point) * (state.overWater ? .68 : 1))])
    else {
      items.push(['Path length', formatDistance(state.tornado.lengthKm)])
      items.push(['Public awareness', `${Math.round(state.tornado.awareness * 100)}%`])
    }
  }
  if (state.theater.storm === 'Thunderstorm') items.unshift(['Type', stormOrganization(state)])
  if (stormAbility(state)?.tornado) items.push(['Active tornadoes', String(state.end ? 0 : state.front?.funnels.filter(funnel => isActive(funnel, state.time)).length ?? 0)])
  const outlook = !opening && !state.end ? environmentOutlook(state) : undefined
  if (outlook) items.push(['Outlook', outlook])
  return items.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')
}

function render() {
  menu.hidden = screen === 'map'
  game.hidden = screen !== 'map'
  if (screen !== 'map' || !difficulty) {
    menu.dataset.screen = screen
    replace(menu, menuContent())
    return
  }
  const state = run
  const total = state ? totals(state) : { deaths: 0, damage: 0 }
  const showOverlay = !!state && !state.tornado && !state.fire && !opening && (!state.end || !!state.snow)
  weatherToggle.hidden = !showOverlay
  weatherToggle.setAttribute('aria-pressed', String(showWeather))
  chart.dataset.weather = showWeather ? 'on' : 'off'
  const modeled = state && ['Supercell', 'Dust Storm', 'Heat Dome'].includes(activeStorm(state))
  const snowLayer = showOverlay && showWeather && !!state?.snow
  const fireLayer = !!state?.fire && !opening
  weatherCredit.classList.toggle('snow-legend', snowLayer || fireLayer)
  weatherToggle.setAttribute('aria-label', state?.snow ? 'Snowfall overlay' : 'Weather overlay')
  weatherToggle.title = state?.snow ? 'Snowfall overlay' : 'Weather overlay'
  if (fireLayer) {
    replace(weatherCredit, `<strong>Fire perimeter</strong><div>${Object.entries(fireColors).map(([label, color]) =>
      `<span style="--snow-color:${color}">${label}</span>`).join('')}</div>`)
  } else if (snowLayer) {
    const labels = [1, 4, 8, 14, 24, 30]
    replace(weatherCredit, `<strong>Storm-total snowfall</strong><div>${labels.map(inches =>
      `<span style="--snow-color:${snowfallScale.find(([value]) => value === inches)?.[1]}">${snowfallDepth(inches * 2.54)}${inches === 30 ? '+' : ''}</span>`).join('')}</div>`)
  } else replace(weatherCredit, showOverlay && showWeather ? state?.theater.storm === 'Heat Dome' ? 'Modeled jet stream and surface heat'
    : modeled ? 'Modeled weather layer' : 'NOAA archive · weather template' : '')
  const status = !state ? 'Select an origin' : state.end ? 'Forecast ended' : opening ? 'Ready to form' : state.detectedAt === null ? 'Unnoticed' : 'Detected'
  const label = state ? state.front && !opening ? state.front.locality.name : state.zones[inspected ?? state.at].name : 'World'
  map.classList.toggle('is-inspecting', inspectMode)
  map.classList.toggle('is-aiming', !!mapOrder)
  document.body.dataset.phase = state ? opening ? 'opening' : state.end ? 'results' : 'play' : 'setup'
  document.body.dataset.storm = storm
  if (!interactionInProgress) {
    replace(summary, `<button class="dock-action evolve" data-key="evolve" data-action="evolve" ${!state || opening ? 'disabled' : ''}>${icon('storm')}<strong>Evolve</strong></button>
      <div class="metric damage"><span>${icon('damage')} Damage score</span><strong>${formatDamage(total.damage)}</strong></div>
      <button class="map-tab" data-key="overview" data-action="overview" aria-label="${overview && !opening ? 'Storm view' : 'World map'}" ${!state || opening ? 'disabled' : ''}>${icon('globe')}<strong>${overview && !opening ? 'Storm view' : 'World'}</strong></button>
      <div class="metric deaths"><span>${icon('deaths')} Total deaths</span><strong>${num.format(total.deaths)}</strong></div>
      <button class="dock-action region" data-key="region" data-action="region" ${!state || opening ? 'disabled' : ''}>${icon('map')}<span><strong>Region</strong><small>${label}</small></span></button>`)
    const timestamp = !state || opening ? null : state.cyclone ? cycloneTimestamp(state.cyclone, state.time)
      : state.tornado ? tornadoClock(state.tornado.startedAt, state.time) : null
    const clockFace = timestamp ? `<span class="clock storm-calendar" aria-label="Storm date and time"><small>${timestamp.date}</small><span>${timestamp.time}</span></span>`
      : state && !opening && !state.end ? `<span class="clock" aria-label="Elapsed time">${clock(state.time)}</span>` : ''
    replace(transport, state && !opening && (!state.end || timestamp)
      ? clockFace + (state.end ? '' : `<button class="icon-button" data-key="pause" data-action="pause" aria-label="Pause" aria-haspopup="dialog">${icon('pause')}</button><button class="speed" data-key="speed" data-action="speed" aria-label="Speed ${speed}×">${speed}×</button>`)
      : `<span class="run-settings">${storm} · ${difficultyLabel(difficulty)}</span>${!state ? button('main-menu', 'Main menu', undefined, 'speed') : ''}`)
    if (!camera.interacting) {
      const worldView = !state || opening || overview
      const targeting = mapOrder === 'drop' || mapOrder === 'burst' || mapOrder === 'ember' ? mapOrder : null
      replace(map, worldView
        ? drawWorld(storm, opening ? null : state, opening ? state : null, inspection && inspectMode ? drawInspection(inspection) : '', inspectMode, targeting, selectedFunnel)
        : drawRegion(state.theater, state, inspected, targeting, selectedFunnel))
      camera.attach(worldView ? 'world' : state.theater.id, worldView ? undefined : state.front?.point)
      if (state && !opening) paintMotion(map, state, state.end ? 0 : accumulator / 1000)
    }
    replace(controls, !state ? worldOptions()
      : opening ? openingOptions(state) : state.end ? results(state) : routeOrders(state))
    renderPanel()
    renderInspection()
    const headline = latestHeadline()
    replace(breakingNews, headline ? `<div role="status"><span>Breaking news</span><strong>${eventText(headline)}</strong></div><button class="icon-button" data-action="dismiss-news" data-key="dismiss-news" aria-label="Dismiss headline">${icon('close')}</button>` : '')
    renderWeatherPickup(state)
  }
  forecastId.textContent = sandbox ? 'Sandbox' : `Forecast ${seed}`
  mapTitle.textContent = state && !opening && !overview ? state.theater.name : 'World satellite map'
  replace(prompt, !state
    ? storm === 'Hurricane'
      ? `<h1 tabindex="-1">Drop your hurricane anywhere</h1><p><i style="--storm-color:${stormColor(storm)}"></i> Cyan areas mark suggested warm-water starts</p>`
      : storm === 'Tornado' ? `<h1 tabindex="-1">Choose where your tornado forms</h1><p>Tap anywhere. Shaded regions offer stronger inflow.</p>
        <ul class="tornado-climate-key" aria-label="Formation conditions">${[...tornadoClimateTiers].reverse().map(tier => `<li><i style="--storm-color:${tier.color}"></i>${tier.label}</li>`).join('')}</ul>`
        : storm === 'Wildfire' ? `<h1 tabindex="-1">Choose where to start your fire</h1><p role="status">${mapFeedback || 'Choose shaded land. Fires spread more easily where burning was recorded more often.'}</p>
          <ul class="tornado-climate-key" aria-label="Historical burn frequency">${fireHistoryLabels.map((label, index) => `<li><i style="--storm-color:${fireHistoryColors[index]}"></i>${label}</li>`).join('')}</ul>`
        : `<h1 tabindex="-1">Choose where your storm forms</h1><p><i style="--storm-color:${stormColor(storm)}"></i> Tap anywhere. Highlighted regions are suggested starts.</p>`
    : opening && state.fire ? `<h1>${state.zones[state.origin].name}</h1><p role="status">${mapFeedback || conditions(state, state.origin).name}</p>`
    : opening && state.blizzardPattern ? `<h1>${state.zones[state.origin].name}</h1><p>${blizzardPatterns[state.blizzardPattern].description}</p>`
    : opening ? state.theater.custom
      ? `<h1>${state.zones[state.origin].name}</h1><p>${coordinates(state.theater.places[0][1], state.theater.places[0][2])} · ${conditions(state, state.origin).name}${storm === 'Tornado' ? '' : conditions(state, state.origin).trend > 0 ? ' · Gains strength' : ' · Weakens here'}</p>`
      : `<h1>${state.zones[state.origin].name}</h1><p>Starting point marked. Press Begin when ready.</p>`
    : '')
  const gain = state?.momentumGain
  replace(mapStatus, state && !opening ? `<div class="hud-chip momentum"><span>${icon('storm')} Momentum</span><strong${state.sandbox ? ' aria-label="Unlimited Momentum"' : ''}>${state.sandbox ? '∞' : state.momentum}</strong></div>
    ${gain && state.realTime - gain.at < 3200 ? `<output class="momentum-gain">+${gain.points} ${gain.points === 1 ? 'point' : 'points'}</output>` : ''}
    <div class="hud-chip detection ${state.detectedAt !== null && !state.end ? 'tracked' : ''}"><span>${status}</span><strong>${Math.round(storm === 'Tornado' ? state.support : state.strength)}<small>% ${storm === 'Tornado' ? 'inflow' : 'strength'}</small></strong></div>` : '')
  replace(stats, state ? liveReadings(state) : '')
  if (!interactionInProgress) replace(bulletins, `<button class="news-button" data-key="news" data-action="news" ${!state || opening ? 'disabled' : ''}><strong>News</strong><span>${settings.newsMode === 'quiet' ? 'News paused' : news.ticker ? eventText(news.ticker) : 'No headlines yet'}</span></button>`)
}

function chooseOrigin(theater: Theater, origin: Origin = 0, blizzardPattern: BlizzardPattern | null = null) {
  if (!difficulty) return
  if (theater.storm === 'Wildfire') {
    const [, lat, lon] = theater.places[origin]
    if (!canIgnite({ x: (lon + 180) * 10, y: (90 - lat) * 10 })) {
      mapFeedback = 'No eligible historical burning here. Choose shaded land.'
      render()
      return
    }
  }
  run = startRun(theater, origin, difficulty, seed, sandbox)
  ticket = undefined
  replay = undefined
  finishedRun = undefined
  finishedRunId = undefined
  runChallenge = undefined
  scoreMessage = ''
  scoreAccepted = false
  unlockedOnFinish = undefined
  if (blizzardPattern) chooseBlizzardPattern(run, blizzardPattern)
  overview = true
  opening = true
  mapOrder = null
  selectedFunnel = null
  mapFeedback = ''
  speed = settings.startingSpeed
  inspected = null
  inspectMode = false
  inspection = null
  news = new NewsPresentation()
  accumulator = 0
  render()
  controls.querySelector<HTMLElement>('[data-key="launch"]')?.focus({ preventScroll: true })
  controls.querySelector<HTMLInputElement>('#hurricane-name')?.focus({ preventScroll: true })
}

async function launch() {
  const forecast = run
  if (!forecast || !opening || loadingExposure === forecast) return
  if (forecast.cyclone && !nameHurricane(forecast, hurricaneName)) return
  loadingExposure = forecast
  render()
  const event = forecast.theater.storm
  if (!isCampaignEvent(event)) return
  const [, lat, lon] = forecast.theater.places[forecast.origin]
  const placement: Placement = { event, difficulty: forecast.difficulty, lat, lon,
    theaterId: forecast.theater.custom ? undefined : forecast.theater.id, origin: forecast.origin }
  const [prepared, issued] = await Promise.all([
    prepareForecast(placement), forecast.sandbox ? undefined : issueTicket(placement, runChallenge?.id).catch(() => undefined),
  ])
  if (loadingExposure === forecast) loadingExposure = null
  if (screen !== 'map' || run !== forecast || !opening) return
  ticket = prepared.complete ? issued : undefined
  const startedAt = ticket?.issuedAt ?? Date.now()
  const name = forecast.cyclone ? hurricaneName : undefined
  const pattern = forecast.blizzardPattern ?? undefined
  run = createForecast(placement, prepared, ticket?.seed ?? forecast.seed, startedAt, name, pattern, forecast.sandbox)
  replay = { placement, seed: run.seed, startedAt, name, pattern, ticks: 0, commands: [] }
  if (run.tornado) run.tornado.startedAt = tornadoStartDate()
  opening = false
  news.update(run.events, settings.newsMode, 0, false)
  playSound('confirm')
  if (run.fire) {
    overview = false
    run.front?.areas.clear()
  }
  lastFrame = performance.now()
  render()
  transport.querySelector<HTMLElement>('[data-key="pause"]')?.focus({ preventScroll: true })
}

function showPanel(kind: NonNullable<typeof panel>, trigger: HTMLElement) {
  panel = kind
  if (kind === 'evolve') {
    evolutionTab = run?.theater.storm === 'Tornado' ? 'Tornado' : run?.snow || run?.fire || run?.theater.storm === 'Thunderstorm' ? 'Storm' : 'Formation'
    selectedUpgrade = null
  }
  panelTrigger = trigger
  renderPanel()
  dialog.showModal()
  const focus = kind === 'pause' ? '.pause-options [data-action="close-panel"]'
    : '[data-action="close-panel"]'
  dialog.querySelector<HTMLElement>(focus)?.focus()
}

function selectMap(id: ZoneId) {
  if (!run || inspectMode) return
  if (opening) {
    if (!run.theater.custom && (id === 0 || id === 1) && id !== run.origin) chooseOrigin(run.theater, id)
    return
  }
  if (!run.end && routeOptions(run).includes(id)) {
    command('steer', { value: id })
    render()
    return
  }
  inspected = id
  const marker = map.querySelector<HTMLElement>(`[data-zone="${id}"]`)!
  showPanel('region', marker)
}

function selectTheater(id: string) {
  const theater = theaters.find(item => item.id === id && item.storm === storm)
  if (theater && (!run || opening)) chooseOrigin(theater)
}

function mapPoint(svg: SVGSVGElement, event: MouseEvent) {
  const transform = svg.getScreenCTM()
  if (!transform) return
  const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse())
  if ((svg.classList.contains('world-atlas') && (x < 0 || x > 3600)) || y < 0 || y > 1800) return
  return { x, y }
}

function selectFunnel(id: number) {
  if (!run?.front || run.end || inspectMode) return
  selectedFunnel = id
  mapOrder = run.effects.tornadoSteering ? 'funnel' : null
  mapFeedback = ''
  render()
  if (mapOrder) map.focus({ preventScroll: true })
}

function applyMapOrder(point: MapPoint) {
  if (!run || !mapOrder) return
  const abilityTarget = mapOrder === 'drop' || mapOrder === 'burst' || mapOrder === 'ember'
  const done = abilityTarget ? command('ability', { point })
    : command('course', { point, funnel: mapOrder === 'funnel' ? selectedFunnel ?? undefined : undefined })
  if (done) {
    if (abilityTarget) playSound('ability')
    mapFeedback = abilityTarget ? '' : 'Preferred heading set'
    mapOrder = null
  } else mapFeedback = mapOrder === 'ember' ? 'Choose a highlighted downwind cell'
    : abilityTarget ? 'Choose land inside the highlighted area' : 'Choose a point away from the current position'
  render()
}

function prepareMapOrder(order: NonNullable<typeof mapOrder>) {
  mapOrder = order
  if (order !== 'funnel') selectedFunnel = null
  mapFeedback = ''
  if (overview) overview = false
  inspectMode = false
  inspection = null
  render()
  if (order === 'drop' || order === 'burst') camera.reset()
  map.focus({ preventScroll: true })
}

async function openForecast() {
  loadingMap = true
  render()
  await loadLocalities()
  loadingMap = false
  if (screen === 'difficulty' && difficulty) showScreen('map')
  else render()
}

document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return
  const atlas = event.target.closest<SVGSVGElement>('.atlas')
  if (atlas && mapOrder && event.detail > 0) {
    const point = mapPoint(atlas, event)
    if (point) applyMapOrder(point)
    return
  }
  const funnel = event.target.closest<SVGElement>('[data-funnel]')
  if (funnel && !inspectMode) return selectFunnel(Number(funnel.dataset.funnel))
  const marker = event.target.closest<SVGElement>('[data-zone]')
  if (marker && !inspectMode) return selectMap(Number(marker.dataset.zone) as ZoneId)
  const world = event.target.closest<SVGSVGElement>('.world-atlas')
  const region = event.target.closest<SVGElement>('[data-theater]')
  if (!inspectMode && region?.dataset.theater && !world?.hasAttribute('data-precise')) return selectTheater(region.dataset.theater)
  if (world && event.detail > 0) {
    if (loadingExposure && loadingExposure === run) return
    const point = mapPoint(world, event)
    if (point && (inspectMode || (run && !opening))) {
      const code = countryAt(point.x, point.y)
      if (code && inspection && code !== inspection.code) {
        inspection = null
        inspectMode = false
        return render()
      }
      const admin = event.target.closest<SVGElement>('[data-region]')?.dataset.region
      if (admin && inspection) {
        inspection.regionId = admin
        return render()
      }
      if (code) void inspectCountry(code)
      return
    }
    if (point && (!run || opening)) {
      return chooseOrigin(makeDrop(storm, 90 - point.y / 10, point.x / 10 - 180))
    }
  }
  const target = event.target.closest<HTMLButtonElement>('button[data-action]')
  if (!target || target.disabled) return
  enableAudio()
  const { action, value } = target.dataset
  switch (action) {
    case 'leaderboards':
      if (finishedRun && run?.end && screen !== 'leaderboards') {
        filters.event = finishedRun.placement.event
        filters.difficulty = finishedRun.placement.difficulty
        filters.metric = 'damage'
        filters.challenge = undefined
        filters.period = 'all'
        boardScope = ticket && scoreAccepted ? 'shared' : 'device'
      }
      showScreen('leaderboards')
      return void refreshScores()
    case 'score-scope':
      boardScope = value === 'shared' ? 'shared' : 'device'
      filters.challenge = undefined
      return void refreshScores()
    case 'play-challenge':
      if (!boardChallenge || !eventUnlocked(filters.event) || !difficultyUnlocked(filters.event, filters.difficulty)) return
      sandbox = false
      storm = filters.event
      difficulty = filters.difficulty
      hurricaneName = ''
      showScreen('map')
      chooseOrigin(makeDrop(storm, boardChallenge.lat, boardChallenge.lon))
      runChallenge = boardChallenge
      return
    case 'retry-score': {
      const pending = pendingScore()
      if (pending) void sendScore(pending, true)
      return
    }
    case 'score':
      if (finishedRun && !run?.sandbox) return showPanel('score', target)
      break
    case 'menu-play':
    case 'menu-sandbox':
      sandbox = action === 'menu-sandbox'
      difficulty = null
      void loadLocalities()
      return showScreen('weather')
    case 'menu-section':
      if (value === 'guide' || value === 'records' || value === 'settings') return showScreen(value)
      break
    case 'menu-back': return showScreen(value === 'home' ? 'home' : 'weather')
    case 'choose-weather':
    case 'next-event':
      if (!value || !isCampaignEvent(value as Storm) || (!sandbox && !eventUnlocked(value as CampaignEvent))) return
      if (storm !== value) difficulty = null
      hurricaneName = ''
      run = null
      storm = value as Storm
      return showScreen('difficulty')
    case 'choose-difficulty':
      if (!isCampaignEvent(storm) || !difficulties.includes(value as Difficulty) || (!sandbox && !difficultyUnlocked(storm, value as Difficulty))) return
      difficulty = value as Difficulty
      break
    case 'start-game':
      if (difficulty && isCampaignEvent(storm) && (sandbox || (eventUnlocked(storm) && difficultyUnlocked(storm, difficulty)))) return void openForecast()
      break
    case 'main-menu':
      if (panel === 'pause') closePause()
      run = null
      difficulty = null
      return showScreen('home')
    case 'view-results':
      if (!run?.tornado || !run.end) return
      closeClipping()
      return showScreen('results')
    case 'explore-damage':
      if (!run?.end) return
      closeClipping()
      screen = 'map'
      render()
      map.focus({ preventScroll: true })
      return
    case 'blizzard-type': if (run && opening) chooseBlizzardPattern(run, value as BlizzardPattern); break
    case 'blizzard-course':
      if (value) command('blizzard-course', { value })
      break
    case 'launch': return launch()
    case 'restart': {
      if (!run || panel !== 'pause') return
      closePause()
      run = null
      opening = false
      mapFeedback = ''
      return showScreen('map')
    }
    case 'retry':
      if (!run) return
      closeClipping()
      screen = 'map'
      return chooseOrigin(run.theater, run.origin, run.blizzardPattern)
    case 'new':
      seed = crypto.getRandomValues(new Uint32Array(1))[0] % 90000 + 10000
      hurricaneName = ''
      run = null
      difficulty = null
      return showScreen('home')
    case 'change-origin': run = null; opening = false; overview = false; break
    case 'overview':
      overview = !overview
      if (!overview) { inspectMode = false; inspection = null }
      break
    case 'inspect-close': inspectMode = false; inspection = null; break
    case 'satellite': if (command('satellite')) playSound('ability'); break
    case 'dismiss-news': news.dismiss(); break
    case 'ability':
      if (run?.fire) {
        if (run.effects.fireSpot >= 2) return prepareMapOrder('ember')
        const ignited = command('ability')
        if (ignited) playSound('ability')
        mapFeedback = ignited ? '' : 'No receptive fuel within ember range.'
        break
      }
      if (run?.effects.targetedBurst) return prepareMapOrder('burst')
      if (run?.front && stormAbility(run)?.tornado) {
        if (run.effects.precisionDrop) return prepareMapOrder('drop')
        const dropped = command('ability')
        if (dropped) playSound('ability')
        mapFeedback = dropped ? '' : 'No land within touchdown range'
        selectedFunnel = null
        if (overview && !inspectMode) overview = false
      } else if (command('ability')) playSound('ability')
      break
    case 'storm-course': return prepareMapOrder('storm')
    case 'cancel-map-order': mapOrder = null; mapFeedback = ''; break
    case 'pause': return showPanel('pause', target)
    case 'pause-settings':
      panel = 'pause-settings'
      renderPanel()
      dialog.querySelector<HTMLElement>('#panel-title')?.focus()
      return
    case 'pause-back': return backToPause()
    case 'speed': speed = playbackSpeeds[(playbackSpeeds.indexOf(speed) + 1) % playbackSpeeds.length]; break
    case 'evolve':
    case 'region':
    case 'history':
    case 'clipping':
    case 'news': return showPanel(action, target)
    case 'close-panel':
      if (panel === 'pause-settings') return backToPause()
      if (panel === 'pause') return closePause()
      return dialog.close()
    case 'evolution-tab': evolutionTab = value as typeof evolutionTab; selectedUpgrade = null; break
    case 'select-upgrade': selectedUpgrade = value ?? null; break
    case 'buy': if (value && command('buy', { value })) playSound('purchase'); break
    case 'refund': {
      if (!run || panel !== 'evolve' || !value || !canRemoveUpgrade(run, value)) return
      const upgrade = trees[run.theater.storm].find(item => item.id === value)
      if (!upgrade) return
      const refund = run.sandbox ? '' : ` You’ll get ${upgradeRefund(run, value)} Momentum back.`
      refundMessage.textContent = `Are you sure you want to remove ${upgrade.name}?${refund}`
      refundDialog.dataset.upgrade = value
      target.focus({ preventScroll: true })
      refundDialog.showModal()
      return
    }
    case 'cancel-refund': return refundDialog.close()
    case 'confirm-refund': {
      if (!refundDialog.open) return
      const id = refundDialog.dataset.upgrade
      refundDialog.close()
      if (!run || panel !== 'evolve' || !id || !command('remove', { value: id })) return
      playSound('removal')
      mapOrder = null
      render()
      dialog.querySelector<HTMLElement>('[data-action="buy"]')?.focus({ preventScroll: true })
      return
    }
    case 'weather-pickup':
      if (command('pickup', { value: Number(value) })) {
        playSound('pickup')
        render()
        if (event.detail === 0) map.focus({ preventScroll: true })
      }
      return
    case 'weather-layer': showWeather = !showWeather; break
  }
  render()
  if (action === 'change-origin') prompt.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
})

const volumeControls = {
  'master-volume': 'masterVolume',
  'music-volume': 'musicVolume',
  'effects-volume': 'effectsVolume',
} as const

function updateVolume({ target }: Event) {
  if (!(target instanceof HTMLInputElement) || !Object.hasOwn(volumeControls, target.id)) return false
  settings[volumeControls[target.id as keyof typeof volumeControls]] = target.valueAsNumber / 100
  syncAudio()
  return true
}

function updateSettings(event: Event) {
  if (updateVolume(event)) {
    saveSettings()
    return
  }
  const { target } = event
  if (target instanceof HTMLSelectElement && target.id === 'units-setting') {
    settings.units = target.value === 'metric' ? 'metric' : 'imperial'
  } else if (target instanceof HTMLSelectElement && target.id === 'starting-speed') {
    settings.startingSpeed = playbackSpeeds.find(rate => String(rate) === target.value) ?? 1
  } else if (target instanceof HTMLSelectElement && target.id === 'news-mode') {
    settings.newsMode = target.value === 'major' || target.value === 'quiet' ? target.value : 'standard'
    news.dismiss()
  } else if (target instanceof HTMLSelectElement && target.id === 'language-setting') {
    settings.locale = chooseLocale(target.value)
    setLocale(settings.locale)
    document.documentElement.lang = settings.locale
  } else if (target instanceof HTMLInputElement && target.id === 'mute-setting') {
    settings.muted = target.checked
    syncAudio()
  } else return
  saveSettings()
  render()
}
menu.addEventListener('change', updateSettings)
dialog.addEventListener('change', updateSettings)
menu.addEventListener('input', updateVolume)
dialog.addEventListener('input', updateVolume)
menu.addEventListener('change', event => {
  if (!(event.target instanceof HTMLSelectElement) || !event.target.dataset.scoreFilter) return
  const { scoreFilter } = event.target.dataset
  const value = event.target.value
  if (scoreFilter === 'event') {
    filters.event = value as CampaignEvent
    filters.metric = 'damage'
    filters.challenge = undefined
    boardChallenge = undefined
  } else if (scoreFilter === 'metric') filters.metric = value as Metric
  else if (scoreFilter === 'difficulty') filters.difficulty = value as Difficulty
  else if (scoreFilter === 'period') filters.period = value as ScoreFilters['period']
  else if (scoreFilter === 'challenge') filters.challenge = value || undefined
  void refreshScores()
})
dialog.addEventListener('submit', event => {
  if (!(event.target instanceof HTMLFormElement) || event.target.id !== 'score-form') return
  event.preventDefault()
  if (!finishedRun || !finishedRunId || scoreAccepted || scoreSubmitting) return
  const displayName = String(new FormData(event.target).get('displayName') ?? '').normalize('NFC').trim()
  if ([...displayName].length < 2 || [...displayName].length > 24 || /[\p{Cc}\p{Cf}]/u.test(displayName)) {
    scoreMessage = 'Use 2 to 24 characters for the display name.'
    renderPanel()
    return
  }
  const saved = saveDeviceScore(finishedRunId, displayName, finishedRun)
  if (ticket && replay) {
    void sendScore({ ticket, replay, displayName })
  } else {
    scoreAccepted = saved
    scoreMessage = saved ? 'Score saved on this device.' : 'This browser could not save the score.'
    render()
    renderPanel()
  }
})

inspector.addEventListener('change', event => {
  if (!(event.target instanceof HTMLSelectElement)) return
  if (event.target.dataset.inspect === 'country') {
    if (event.target.value) void inspectCountry(event.target.value)
    else { inspection = null; inspectMode = false; render() }
  } else if (inspection) {
    inspection.regionId = event.target.value || null
    render()
  }
})

controls.addEventListener('submit', event => {
  if (!(event.target instanceof HTMLFormElement)) return
  event.preventDefault()
  if (event.target.id === 'hurricane-name-form') {
    const input = event.target.querySelector<HTMLInputElement>('#hurricane-name')!
    hurricaneName = input.value
    if (!hurricaneName.trim()) {
      input.setCustomValidity('Enter a hurricane name.')
      input.reportValidity()
      return
    }
    return launch()
  }
  if (event.target.id !== 'coordinate-form') return
  if ((run && !opening) || !event.target.reportValidity()) return
  const data = new FormData(event.target)
  chooseOrigin(makeDrop(storm, Number(data.get('latitude')), Number(data.get('longitude'))))
})

controls.addEventListener('input', event => {
  if (event.target instanceof HTMLInputElement && event.target.id === 'hurricane-name') {
    hurricaneName = event.target.value
    event.target.setCustomValidity('')
  }
})

function closeClipping() {
  if (panel !== 'clipping') return
  panel = null
  panelTrigger = null
  dialog.close()
}

dialog.addEventListener('close', () => {
  if (dialog.open || !panel) return
  clearPanel()
})

function clearPanel() {
  panel = null
  panelTrigger?.focus({ preventScroll: true })
  panelTrigger = null
  lastFrame = performance.now()
}

function closePause() {
  dialog.close()
  clearPanel()
}

function backToPause() {
  panel = 'pause'
  renderPanel()
  dialog.querySelector<HTMLElement>('[data-action="pause-settings"]')?.focus()
}

dialog.addEventListener('cancel', event => {
  if (panel === 'pause-settings') {
    event.preventDefault()
    backToPause()
  } else if (panel === 'pause') {
    event.preventDefault()
    closePause()
  }
})

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || event.repeat || event.defaultPrevented || panel ||
    screen !== 'map' || !run || opening || run.end) return
  const pauseButton = transport.querySelector<HTMLElement>('[data-action="pause"]')
  if (!pauseButton) return
  event.preventDefault()
  showPanel('pause', pauseButton)
})

map.addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const { zone, theater, funnel } = (event.target as SVGElement).dataset
  if (event.target === map && mapOrder) {
    const view = map.querySelector<SVGSVGElement>('.atlas')?.viewBox.baseVal
    if (view) applyMapOrder({ x: view.x + view.width / 2, y: view.y + view.height / 2 })
    event.preventDefault()
    return
  }
  if (zone === undefined && !theater && funnel === undefined) return
  event.preventDefault()
  if (funnel !== undefined) selectFunnel(Number(funnel))
  else if (zone !== undefined) selectMap(Number(zone) as ZoneId)
  else if (theater) selectTheater(theater)
})

function releaseInteraction() {
  if (!interactionInProgress) return
  interactionInProgress = false
  requestAnimationFrame(render)
}
document.addEventListener('pointerdown', event => { interactionInProgress = event.target instanceof Element && !!event.target.closest('button, [data-zone], [data-theater]') })
document.addEventListener('pointerup', releaseInteraction)
document.addEventListener('pointercancel', releaseInteraction)
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && event.target instanceof HTMLButtonElement) interactionInProgress = true
})
document.addEventListener('keyup', event => { if (event.code === 'Space') releaseInteraction() })
window.addEventListener('blur', releaseInteraction)
document.addEventListener('visibilitychange', () => {
  lastFrame = performance.now()
  syncAudio()
})

function frame(now: number) {
  const elapsed = Math.min(100, Math.max(0, now - lastFrame))
  lastFrame = now
  if (run && !opening && !panel && !run.end && !document.hidden) {
    run.realTime += elapsed
    const priorBanner = news.banner
    if (news.update(run.events, settings.newsMode, run.realTime, false)) {
      if (news.banner && news.banner !== priorBanner) playSound('news')
      render()
    }
    accumulator += elapsed * speed
    while (accumulator >= 1000 && !run.end) {
      accumulator -= 1000
      tick(run)
      if (selectedFunnel !== null && !run.front?.funnels.some(funnel => funnel.id === selectedFunnel && isActive(funnel, run!.time))) {
        selectedFunnel = null
        if (mapOrder === 'funnel') mapOrder = null
        mapFeedback = ''
      }
      if (run.end) {
        playSound('finish')
        if (replay) {
          replay.ticks = run.time
          finishedRun = summarizeRun(run, replay.placement, replay.startedAt)
          finishedRunId = ticket?.id ?? Array.from(crypto.getRandomValues(new Uint32Array(4)),
            value => value.toString(16).padStart(8, '0')).join('')
        }
        mapOrder = null
        if (!run.sandbox && isCampaignEvent(run.theater.storm)) {
          const upcoming = nextEvent(run.theater.storm)
          unlockedOnFinish = upcoming && !eventUnlocked(upcoming) ? upcoming : undefined
          recordRun(run.theater.storm, run.difficulty, totals(run))
        }
      }
      render()
      if (run.end && run.tornado) {
        const trigger = controls.querySelector<HTMLElement>('[data-action="clipping"]') ?? controls
        showPanel('clipping', trigger)
      }
    }
    if (!run.end) paintMotion(map, run, accumulator / 1000)
  }
  requestAnimationFrame(frame)
}

render()
requestAnimationFrame(frame)
