import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/600.css'
import './style.css'
import { drawRegion, drawWorld, paintMotion } from './map'
import { MapCamera } from './map-camera'
import { coordinates, loadImpactRegions, loadLocalities, makeDrop } from './free-drop'
import { canRemoveUpgrade, removeUpgrade, upgradeCost, upgradeRefund, satelliteCooldown, tornadoLimits, triggerSatellite, abilityCost, activeStorm, buyUpgrade, chooseBlizzardPattern, chooseThunderstormType, collectWeatherPickup, conditions, defaultSeed, difficultyRules, frontSpeed, hazardAbilityReady, hurricaneCategory, impactAreas, leg, nameHurricane, needsThunderstormType, preferredRoute, routeOptions, setCourse, startRun, steer, stormStats, tick, tornadoSupportAt, totals, travelRate, upgradeLocked, useAbility, type Difficulty, type Origin, type Run, type ZoneId } from './sim'
import { makeZones, stormColor, stormRules, theaters, type Storm, type Theater } from './world'
import { hazardFor, hazards, thunderstormTypes, type ThunderstormType } from './hazards'
import { blizzardOptions, blizzardPatterns, type BlizzardPattern } from './blizzard'
import { branches, tornadoBranches, trees, type Branch, type Upgrade } from './upgrades'
import { countries, countryAt, drawInspection, inspectedTotals, type Inspection } from './inspection'
import { getRegions } from './regions'
import { difficultyUnlocked, eventUnlocked, legacyRecord, nextEvent, recordRun, saveSettings, settings, stormRecord } from './profile'
import { campaign, difficulties, difficultyLabel, earnedStars, isCampaignEvent, type CampaignEvent } from './campaign'
import { directionName, isActive, type MapPoint } from './convection'
import { formatDamage } from './damage'
import { escapeName } from './cities'
import { tornadoClimateTiers, tornadoSupportLabel } from './tornado-climate'
import { measurementText, temperature, waterDepth, windSpeed, formatDistance } from './units'
import { tornadoClock, tornadoDate, tornadoDuration, tornadoStartDate, tornadoTickSeconds, tornadoVerdict } from './tornado-report'

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
const num = new Intl.NumberFormat('en-US')

const icons = {
  storm: '<path d="M20 4C12 0 4 6 5 13c1 5 7 6 9 2 2-3-1-6-4-4m-6 9c8 4 16-2 15-9-1-5-7-6-9-2-2 3 1 6 4 4"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
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

type Screen = 'home' | 'weather' | 'difficulty' | 'guide' | 'records' | 'settings' | 'map' | 'results'
let screen: Screen = 'home'
let loadingMap = false
let difficulty: Difficulty | null = null
let seed = defaultSeed
let run: Run | null = null
let storm: Storm = 'Tornado'
let unlockedOnFinish: CampaignEvent | undefined
let mapOrder: 'drop' | 'storm' | 'funnel' | 'burst' | null = null
let selectedFunnel: number | null = null
let mapFeedback = ''
let overview = false
let opening = false
let loadingExposure: Run | null = null
let alternateOpening = false
let showWeather = true
let hurricaneName = ''
let inspected: ZoneId | null = null
let speed = 1
let panel: 'pause' | 'pause-settings' | 'evolve' | 'region' | 'news' | 'history' | 'clipping' | null = null
let evolutionTab: Branch | 'Storm' | 'Tornado' = 'Formation'
let selectedUpgrade: string | null = null
let inspectMode = false
let inspection: Inspection | null = null
let dismissedHeadline: Run['events'][number] | undefined
let panelTrigger: HTMLElement | null = null
let accumulator = 0
let lastFrame = performance.now()
let interactionInProgress = false
const camera = new MapCamera(map, mapTools, render)

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function replace(element: HTMLElement, html: string) {
  if (element.dataset.rendered === html) return
  const previous = element.contains(document.activeElement) ? document.activeElement : null
  const key = previous?.getAttribute('data-key') ?? previous?.getAttribute('data-zone')
  element.innerHTML = html
  element.dataset.rendered = html
  if (key) element.querySelector<HTMLElement>(`[data-key="${key}"], [data-zone="${key}"]`)?.focus({ preventScroll: true })
}

function button(action: string, label: string, value?: string, className = '') {
  return `<button class="${className}" data-key="${action}${value ? `-${value}` : ''}" data-action="${action}"${value ? ` data-value="${value}"` : ''}>${label}</button>`
}

const basicWeather = {
  Hurricane: { icon: 'storm', description: 'Build strength over warm water, then make landfall.' },
  Tornado: { icon: 'tornado', description: 'Touch down as an EF0 funnel. Spend Momentum to shape its track, damage and resilience.' },
  Blizzard: { icon: 'blizzard', description: 'Bank snowpack and spend it on a whiteout.' },
} as const
const weatherCards = { ...basicWeather, ...hazards }
function stars(count: number, level: Difficulty, label = '') {
  const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.09 6.26 6.91 1-5 4.88 1.18 6.89L12 17.78l-6.18 3.25L7 14.14 2 9.26l6.91-1Z"/></svg>'
  return `<span class="rating rating-${level.toLowerCase()}" role="img" aria-label="${label}${count} of 5 stars">${Array.from({ length: 5 }, (_, i) => `<span class="${i < count ? 'earned' : ''}">${star}</span>`).join('')}</span>`
}
const thunderstormLabel = (type: ThunderstormType) => type === 'Thunderstorm' ? 'Tornadic Thunderstorm' : type

const menuSections = {
  guide: 'How to Play',
  records: 'Storm Records',
  settings: 'Settings',
} as const

function settingsContent() {
  return `<div class="menu-setting">
          <label for="starting-speed">Starting speed</label>
          <select id="starting-speed" aria-describedby="speed-help">
            <option value="1" ${settings.startingSpeed === 1 ? 'selected' : ''}>1×</option>
            <option value="2" ${settings.startingSpeed === 2 ? 'selected' : ''}>2×</option>
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
          <label for="breaking-news-setting">Breaking news popups</label>
          <input id="breaking-news-setting" type="checkbox" aria-describedby="news-help" ${settings.breakingNews ? 'checked' : ''}>
          <p id="news-help">Headlines always appear in the news ticker.</p>
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
      <h1 id="menu-title" tabindex="-1">Choose a weather event</h1>
      <p>${unlocked === campaign.length ? 'All eight weather events unlocked.' : `${unlocked} of 8 events unlocked · Earn one star on an event to open the next.`}</p>
    </header>
    <div class="event-grid" role="group" aria-label="Weather events">
      ${campaign.map((kind, index) => {
        const locked = !eventUnlocked(kind)
        const card = weatherCards[kind]
        const description = kind === 'Thunderstorm' ? 'Choose a storm type in Evolve and build its abilities.' : card.description
        const best = difficulties.map(level => ({ level, score: stormRecord(kind, level)?.stars ?? 0 }))
          .sort((a, b) => b.score - a.score || difficulties.indexOf(b.level) - difficulties.indexOf(a.level))[0]
        return `<button class="event-choice" data-action="choose-weather" data-value="${kind}" data-key="weather-${kind}" aria-label="${kind}" aria-describedby="event-detail-${index}" style="--choice-color:${stormColor(kind)}" ${locked ? 'disabled' : ''}>
          <span class="event-emblem">${icon(card.icon)}${locked ? `<span class="event-lock">${icon('lock')}</span>` : ''}</span>
          <strong>${kind}</strong><span class="event-description" id="event-detail-${index}">${description}${locked ? `<span class="unlock-requirement">Earn 1 star in ${campaign[index - 1]}</span>` : best.score ? `<span class="event-best">${difficultyLabel(best.level)} ${stars(best.score, best.level)}</span>` : ''}</span>
        </button>`
      }).join('')}
    </div>
  </section>`
}

function menuContent() {
  if (screen === 'results' && run?.tornado) return tornadoResults(run)
  if (screen === 'home') return `<section class="title-screen" aria-labelledby="menu-title">
    <div class="title-emblem">${icon('storm')}</div>
    <h1 id="menu-title" tabindex="-1">Stormwake</h1>
    <nav class="title-actions" aria-label="Main menu">
      ${button('menu-play', `${icon('play')} Play`, undefined, 'menu-primary')}
      ${(Object.keys(menuSections) as (keyof typeof menuSections)[]).map(section =>
        button('menu-section', `${icon(section)} ${menuSections[section]}`, section, 'menu-secondary')).join('')}
    </nav>
  </section>`

  if (screen === 'guide' || screen === 'records' || screen === 'settings') return menuSection(screen)
  if (screen === 'weather') return weatherPicker()
  const event = isCampaignEvent(storm) ? storm : null
  const choices = difficulties.map(level => {
    const locked = !event || !difficultyUnlocked(event, level)
    return `<button class="menu-option difficulty-option" data-action="choose-difficulty" data-value="${level}" data-key="difficulty-${level}" aria-pressed="${difficulty === level}" ${locked ? 'disabled' : ''}>
        <span><strong>${difficultyLabel(level)}</strong><small>${locked ? 'Earn 3 stars on Hard to unlock' : difficultyRules[level].description}</small></span><span class="difficulty-mark">${stars(event ? stormRecord(event, level)?.stars ?? 0 : 0, level)}<span class="selection-mark">${difficulty === level ? icon('check') : ''}</span></span>
      </button>`
  }).join('')
  return `<section class="setup-screen" aria-labelledby="menu-title">
    <header class="setup-header">${button('menu-back', `${icon('back')} Back`, 'weather', 'menu-back')}<h1 id="menu-title" tabindex="-1">Choose difficulty</h1></header>
    <p class="chosen-weather" style="--choice-color:${stormColor(storm)}">${icon(weatherCards[storm].icon)} ${storm}</p>
    <div class="menu-options" role="group" aria-label="Difficulty">${choices}</div>
    <footer><button class="menu-primary" data-action="start-game" data-key="start-game" ${difficulty && !loadingMap ? '' : 'disabled'} ${loadingMap ? 'aria-busy="true"' : ''}>${icon('play')} Play</button></footer>
  </section>`
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
  const rule = state.theater.storm === 'Blizzard' ? stormRules.Blizzard : null
  const modes = rule
    ? `<div class="origin-switch" role="group" aria-label="Opening move">
      <button class="quiet" data-key="opening-direct" data-action="opening-move" data-value="direct" aria-pressed="${!alternateOpening}">${rule.opening}</button>
      <button class="quiet" data-key="opening-alternate" data-action="opening-move" data-value="alternate" aria-pressed="${alternateOpening}">${rule.alternate}</button>
    </div>`
    : ''
  const forecast = state.blizzardPattern ? `<div class="opening-forecast" role="group" aria-label="Blizzard type">
    ${blizzardOptions(state.theater.places[state.origin]).map((type, index) =>
      `<button class="quiet" data-key="blizzard-type-${type}" data-action="blizzard-type" data-value="${type}" aria-pressed="${state.blizzardPattern === type}"><strong>${type}</strong>${index === 0 ? '<small>Recommended</small>' : ''}</button>`).join('')}
  </div>` : ''
  return `<div class="opening-controls">${forecast}${modes}<div class="orders">
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
  if (state.cyclone) return `<div class="route-status front-orders"><div class="course-caption">
    <strong>${state.name} · Drifting ${directionName(state.front!.heading)}</strong>
    <span>${conditions(state, state.at).name}</span></div>${button('history', 'Track history', undefined, 'route-choice')}</div>`
  if (state.front && state.theater.storm !== 'Tornado') return frontOrders(state)
  const { zones } = state
  const inTransit = state.progress > 0
  const selected = inTransit ? state.queued ?? preferredRoute(state, state.to) : state.to
  const hazard = hazardFor(activeStorm(state))
  const routeHint = inspectMode ? 'Close inspection to steer'
    : overview ? 'Pick a map marker or open Storm view' : 'Pick a route marker on the map'
  const ability = hazard
    ? `<button class="route-choice ability" data-key="ability" data-action="ability" ${!hazardAbilityReady(state) ? 'disabled' : ''}><strong>${hazard.ability.name}</strong><small>${Math.floor(state.charge)} / ${abilityCost(state)} ${hazard.ability.resource}</small></button>`
    : state.theater.storm === 'Blizzard'
      ? `<button class="route-choice ability" data-key="ability" data-action="ability" ${state.whiteout || state.charge < 25 ? 'disabled' : ''}><strong>${state.whiteout ? 'Whiteout active' : 'Trigger whiteout'}</strong><small>${Math.floor(state.charge)} snowpack</small></button>`
      : ''
  const cooldown = satelliteCooldown(state)
  const satellite = state.effects.satelliteTrigger
    ? `<button class="route-choice ability" data-key="satellite" data-action="satellite" ${cooldown || state.overWater ? 'disabled' : ''}><strong>Spawn satellite tornado</strong><small>${cooldown ? `${cooldown}s to recharge` : state.overWater ? 'Available over land' : 'Ready'}</small></button>`
    : ''
  if (state.front) return `<div class="route-status front-orders"><div class="course-caption">
    <strong>${state.name} · Drifting ${directionName(state.front.heading)}</strong>
    <span>${mapFeedback || (mapOrder ? 'Tap the map to set a preferred heading' : 'Follow the projected tornado track')}</span></div>
    <div class="orders">${mapOrder ? button('cancel-map-order', 'Cancel', undefined, 'route-choice')
      : `${state.effects.courseControl ? button('storm-course', 'Set tornado heading', undefined, 'route-choice') : ''}${satellite}${ability}`}</div></div>`
  return `<div class="route-status">
    <div class="course-caption"><strong>Moving toward ${zones[state.to].name}</strong>
    <span>${inTransit ? `Next: ${zones[selected].name} · ` : ''}${Math.ceil((leg - state.progress) / travelRate(state))}s · ${routeHint}</span></div>
    ${ability}</div>`
}

function frontOrders(state: Run) {
  const front = state.front!
  const funnel = front.funnels.find(item => item.id === selectedFunnel && isActive(item, state.time))
  const ability = hazardFor(activeStorm(state))!.ability
  const choosing = needsThunderstormType(state)
  const heading = funnel ? `Tornado ${funnel.id} · EF${funnel.ef}` : `Drifting ${directionName(front.heading)} · ${front.locality.name}`
  const hint = mapFeedback || (mapOrder === 'drop' ? 'Choose land inside the highlighted area'
    : mapOrder === 'burst' ? 'Choose a target on land inside the highlighted range'
    : mapOrder === 'storm' || mapOrder === 'funnel' ? 'Tap the map to set a preferred heading'
    : choosing ? 'Open Evolve to choose a storm type'
    : funnel ? `${formatDistance(funnel.width)} wide · ${funnel.start + funnel.life - state.time}s left · ${state.effects.tornadoSteering ? 'Select again to set heading' : 'Guided Funnels unlocks steering'}`
    : ability.tornado ? (state.effects.precisionDrop ? 'Precision Touchdown available' : 'Touchdown and heading are random')
    : state.effects.targetedBurst ? 'Activate your ability to select a target' : 'Follow the projected storm track')
  const controls = mapOrder
    ? button('cancel-map-order', 'Cancel', undefined, 'route-choice')
    : `${state.effects.courseControl ? button('storm-course', 'Set storm heading', undefined, 'route-choice') : ''}
      ${choosing ? '' : `<button class="route-choice ability" data-key="ability" data-action="ability" ${hazardAbilityReady(state) ? '' : 'disabled'}><strong>${ability.name}</strong><small>${Math.floor(state.charge)} / ${abilityCost(state)} ${ability.resource}</small></button>`}`
  return `<div class="route-status front-orders"><div class="course-caption"><strong>${heading}</strong><span>${hint}</span></div><div class="orders">${controls}</div></div>`
}

function results(state: Run) {
  if (state.tornado) return `<div class="report-heading"><strong>${state.name} · Forecast ended</strong></div>
    <div class="orders">${button('clipping', 'Read news', undefined, 'order')}
    ${button('view-results', 'Next', undefined, 'order hot')}${button('retry', 'Retry', undefined, 'order')}</div>`
  const total = totals(state)
  const kind = state.theater.storm
  if (!isCampaignEvent(kind)) return ''
  const rating = earnedStars(kind, state.difficulty, total.damage, true)
  const upcoming = nextEvent(kind)
  return `<div class="report-heading"><strong>${state.name || kind} · ${difficultyLabel(state.difficulty)}</strong>${stars(rating, state.difficulty)}</div>
    <p class="report-summary">${state.end} ${formatDamage(total.damage)} in property lost.</p>
    ${unlockedOnFinish ? `<p class="event-unlock" role="status">${unlockedOnFinish} unlocked.</p>` : ''}
    <div class="orders">${state.cyclone ? button('history', 'Track history', undefined, 'order') : ''}${upcoming && eventUnlocked(upcoming) ? button('next-event', `Next: ${upcoming}`, upcoming, 'order hot') : ''}
    ${button('retry', 'Retry same forecast', undefined, 'order')}${button('new', 'New forecast', undefined, 'order')}</div>`
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
      <p class="result-name">${state.name}</p>${stars(rating, state.difficulty)}</header>
    <dl class="forecast-stat-sheet">${tornadoReportStats(state).map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
    <div class="forecast-places"><strong>Cities and towns affected</strong><p>${places.length ? places.join(' · ') : 'None reported'}</p></div>
    ${unlockedOnFinish ? `<p class="event-unlock" role="status">${unlockedOnFinish} unlocked.</p>` : ''}
    <footer>${button('retry', 'Retry', undefined, 'order hot')}${button('main-menu', 'Exit', undefined, 'order')}</footer>
  </section>`
}

function tornadoClipping(state: Run) {
  const record = state.tornado!
  const total = tornadoImpact(state)
  const headline = tornadoVerdict(record, total.damage, total.deaths, total.countryDeaths)
  const places = [...record.places]
  const leadPlaces = new Intl.ListFormat('en-US').format(places.slice(0, 5))
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
    <footer>${button('retry', 'Retry', undefined, 'order')}${button('view-results', 'Next', undefined, 'order hot')}</footer>
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
  } else if (panel === 'evolve' && needsThunderstormType(run) && !run.end) {
    title = 'Choose a thunderstorm type'
    content = `<p class="thunderstorm-choice-note">Choose the storm type for this run. It sets your ability and opens its upgrade tree.</p>
      <div class="menu-options thunderstorm-choices" role="group" aria-label="Thunderstorm types">
        ${thunderstormTypes.map(type => `<button class="menu-option" data-action="thunderstorm-type" data-value="${type}" style="--choice-color:${stormColor(type)}">
          <span class="weather-badge">${icon(hazards[type].icon)}</span><span><strong>${thunderstormLabel(type)}</strong><small>${hazards[type].description}</small></span>${icon('arrow')}
        </button>`).join('')}
      </div>`
  } else if (panel === 'evolve') {
    const storm = activeStorm(run)
    const state = run
    const tree = trees[storm]
    const name = state.thunderstormType ? thunderstormLabel(state.thunderstormType) : storm
    const tornado = storm === 'Tornado'
    const tabs = tornado ? ['Tornado', ...tornadoBranches] : ['Storm', ...branches.filter(branch => tree.some(item => item.branch === branch))]
    const choices = tree.filter(item => item.branch === evolutionTab)
    const selected = choices.find(item => item.id === selectedUpgrade) ?? choices[0]
    title = `Evolve ${name.toLowerCase()}`
    const pane = selected
      ? upgradeBoard(state, choices, selected.id) + upgradeDetails(state, selected.id)
      : tornado ? tornadoOverview(state) : `<div class="evolve-tree"><div class="node"><div class="hex installed">${icon('storm')}</div><span>${name}</span></div></div>
        <div class="upgrade-detail"><h3>${name}</h3><p>${run.theater.name} · ${difficultyLabel(run.difficulty)}</p><dl class="region-stats"><div><dt>Strength</dt><dd>${Math.round(run.strength)}%</dd></div><div><dt>Detection</dt><dd>${run.detectedAt === null ? 'Unnoticed' : 'Detected'}</dd></div><div><dt>Upgrades installed</dt><dd>${state.upgrades.length} of ${tree.length}</dd></div></dl></div>`
    content = `<nav class="evolution-tabs ${state.thunderstormType ? 'convection-tabs' : ''}" aria-label="Evolution views">${tabs.map(tab => `<button data-key="evolution-tab-${tab}" data-action="evolution-tab" data-value="${tab}" aria-pressed="${evolutionTab === tab}">${storm === 'Hurricane' && tab === 'Impact' ? 'Damage' : tab}</button>`).join('')}</nav>
      <div class="evolution network-evolution">${pane}</div>
      <div class="panel-status"><strong>${run.momentum} Momentum</strong><div class="strength-meter"><span>${tornado ? 'Inflow reserve' : 'Storm strength'}</span><meter min="0" max="100" value="${tornado ? run.support : run.strength}" aria-label="${tornado ? 'Inflow reserve' : 'Storm strength'}"></meter></div></div>`
  } else if (panel === 'history' && run.cyclone) {
    title = `${run.name} · Track history`
    const history = run.cyclone.history
    const peak = run.cyclone.peakWind
    content = `<p>Peak intensity ${hurricaneCategory(peak)} · ${windSpeed(peak)} sustained wind.</p>
      <ol class="cyclone-history">${history.map(stage => `<li><time>${clock(stage.time)}</time><div><strong>${stage.category}</strong><span>${windSpeed(stage.wind)} · ${stage.location}</span><small>${stage.reason}</small></div></li>`).join('')}</ol>`
  } else if (panel === 'news') {
    title = 'Storm news'
    const record = run.tornado
    content = `<ol class="news-list">${run.events.map(event => `<li><time>${record ? tornadoClock(record.startedAt, event.time).time : clock(event.time)}</time><span>${event.text}</span></li>`).join('')}</ol>`
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

function upgradeNode(state: Run, item: Upgrade, selected: string, connector = '') {
  const installed = state.upgrades.includes(item.id)
  const price = upgradeCost(state, item)
  const status = installed ? 'installed' : upgradeLocked(state, item) ? 'locked' : state.momentum < price ? 'unaffordable' : 'available'
  return `<button class="upgrade-node ${connector} ${item.capstone ? 'capstone' : ''}" data-key="upgrade-${item.id}" data-action="select-upgrade" data-value="${item.id}" aria-pressed="${item.id === selected}" aria-label="${item.name}">
    <span class="hex ${status}">${icon(upgradeIcon(item))}</span>
    <strong>${item.name}</strong><small>${installed ? 'Installed' : `${price} Momentum${status === 'locked' ? ' · Locked' : ''}`}</small>
  </button>`
}

function upgradeBoard(state: Run, choices: Upgrade[], selected: string) {
  const groups = [...new Set(choices.map(item => item.group!))]
  return `<div class="upgrade-tree" role="group" data-branch="${evolutionTab}" aria-label="${state.cyclone && evolutionTab === 'Impact' ? 'Damage' : evolutionTab} upgrades">
    ${groups.map(group => {
      const nodes = choices.filter(item => item.group === group)
      const lanes = [...new Set(nodes.flatMap(item => item.lane ? [item.lane] : []))]
      const merge = nodes.find(item => item.requiresAll)
      return `<section class="upgrade-network ${merge ? 'has-merge' : ''}">
        <h3>${group}</h3>
        <div class="upgrade-network-grid">
          ${lanes.map(lane => `<div class="upgrade-lane"><h4>${lane}</h4>
            ${nodes.filter(item => item.lane === lane).map(item => upgradeNode(state, item, selected, item.requires ? 'linked' : '')).join('')}
          </div>`).join('')}
          ${merge ? `<div class="upgrade-junction">${upgradeNode(state, merge, selected)}</div>` : ''}
        </div>
      </section>`
    }).join('')}
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
    <div><dt>Visibility</dt><dd>${state.effects.rainWrap ? 'Rain-wrapped' : 'Visible funnel'}</dd></div><div><dt>Track guidance</dt><dd>${state.effects.courseControl ? 'Available' : 'Locked'}</dd></div></dl>
  </section>`
}

function upgradeDetails(state: Run, id: string) {
  const tree = trees[activeStorm(state)]
  const item = tree.find(entry => entry.id === id)!
  const installed = state.upgrades.includes(id)
  const prereq = tree.find(entry => entry.id === item.requires)
  const locked = upgradeLocked(state, item)
  const required = item.requiresAll?.map(id => tree.find(entry => entry.id === id)!.name)
  const price = upgradeCost(state, item)
  const refund = upgradeRefund(state, id)
  const cost = locked ? 'Locked' : state.momentum < price ? `Need ${price - state.momentum} more Momentum` : `Buy for ${price} Momentum`
  return `<div class="upgrade-detail"><h3>${item.name}</h3><p>${measurementText(item.description)}</p>
    ${prereq ? `<p class="requirement">Requires ${prereq.name}</p>` : ''}
    ${required ? `<p class="requirement">Requires both ${required.join(' and ')}</p>` : ''}
    ${installed
      ? `<button class="order" data-key="refund" data-action="refund" data-value="${id}" ${canRemoveUpgrade(state, id) ? '' : 'disabled'}>Remove upgrade · ${refund} Momentum back</button>
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
  if (!settings.breakingNews || !run || opening || run.end) return undefined
  const item = run.events.find(event => event.breaking)
  return item && run.time - item.time < 14 && item !== dismissedHeadline ? item : undefined
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

function liveReadings(state: Run) {
  const reading = stormStats(state)
  const hazard = hazardFor(activeStorm(state))
  const mainReading = state.theater.storm === 'Wildfire' ? ['Spread rate', state.zones[state.at].sea ? 'No fuel' : `${Math.round(travelRate(state) * 100 / hazards.Wildfire.speed)}%`]
    : state.theater.storm === 'Flooding' ? ['Water depth', `${waterDepth(state.strength * .045)}`]
    : state.theater.storm === 'Dust Storm' ? ['Visibility', `${formatDistance(2 * (1 - state.strength / 100) ** 2 + .02)}`]
    : state.theater.storm === 'Heat Dome' ? ['Temperature', `${temperature(29 + state.strength * .28 + state.effects.heatDegrees)}`]
    : ['Wind speed', `${windSpeed(reading.windMph)}`]
  const items = [
    ['Width', formatDistance(reading.widthKm)],
    mainReading,
    [hazard ? 'Conditions' : state.theater.storm === 'Hurricane' ? 'Category' : 'Status', reading.category],
  ]
  if (state.blizzardPattern) items.unshift(['Type', state.blizzardPattern])
  if (state.name) items.unshift(['Name', state.name])
  if (state.tornado) {
    if (opening) items.push(['Start support', tornadoSupportLabel(tornadoSupportAt(state.front!.point) * (state.overWater ? .68 : 1))])
    else {
      items.push(['Path length', formatDistance(state.tornado.lengthKm)])
      items.push(['Public awareness', `${Math.round(state.tornado.awareness * 100)}%`])
    }
  }
  if (state.thunderstormType) items.unshift(['Type', thunderstormLabel(state.thunderstormType)])
  if (hazard?.ability.tornado && !needsThunderstormType(state)) items.push(['Active tornadoes', String(state.end ? 0 : state.front?.funnels.filter(funnel => isActive(funnel, state.time)).length ?? 0)])
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
  const showOverlay = !!state && !state.tornado && !opening && !state.end
  weatherToggle.hidden = !showOverlay
  weatherToggle.setAttribute('aria-pressed', String(showWeather))
  chart.dataset.weather = showWeather ? 'on' : 'off'
  const modeled = state && ['Thunderstorm', 'Supercell', 'Wildfire', 'Dust Storm', 'Heat Dome'].includes(activeStorm(state))
  weatherCredit.textContent = showOverlay && showWeather ? state?.theater.storm === 'Heat Dome' ? 'Modeled jet stream and surface heat' : modeled ? 'Modeled weather layer' : 'NOAA archive · weather template' : ''
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
    const timestamp = state?.tornado && !opening ? tornadoClock(state.tornado.startedAt, state.time) : null
    const clockFace = timestamp ? `<span class="clock storm-calendar" aria-label="Storm date and time"><small>${timestamp.date}</small><span>${timestamp.time}</span></span>`
      : state && !opening && !state.end ? `<span class="clock" aria-label="Elapsed time">${clock(state.time)}</span>` : ''
    replace(transport, state && !opening && (!state.end || state.tornado)
      ? clockFace + (state.end ? '' : `<button class="icon-button" data-key="pause" data-action="pause" aria-label="Pause" aria-haspopup="dialog">${icon('pause')}</button><button class="speed" data-key="speed" data-action="speed" aria-label="Speed ${speed}×">${speed}×</button>`)
      : `<span class="run-settings">${storm} · ${difficultyLabel(difficulty)}</span>${!state ? button('main-menu', 'Main menu', undefined, 'speed') : ''}`)
    if (!camera.interacting) {
      const worldView = !state || opening || overview
      const targeting = mapOrder === 'drop' || mapOrder === 'burst' ? mapOrder : null
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
    replace(breakingNews, headline ? `<div role="status"><span>Breaking news</span><strong>${headline.text}</strong></div><button class="icon-button" data-action="dismiss-news" data-key="dismiss-news" aria-label="Dismiss headline">${icon('close')}</button>` : '')
    renderWeatherPickup(state)
  }
  forecastId.textContent = `Forecast ${seed}`
  mapTitle.textContent = state && !opening && !overview ? state.theater.name : 'World satellite map'
  replace(prompt, !state
    ? storm === 'Hurricane'
      ? `<h1 tabindex="-1">Drop your hurricane anywhere</h1><p><i style="--storm-color:${stormColor(storm)}"></i> Cyan areas mark suggested warm-water starts</p>`
      : storm === 'Tornado' ? `<h1 tabindex="-1">Choose where your tornado forms</h1><p>Tap anywhere. Shaded regions offer stronger inflow.</p>
        <ul class="tornado-climate-key" aria-label="Formation conditions">${[...tornadoClimateTiers].reverse().map(tier => `<li><i style="--storm-color:${tier.color}"></i>${tier.label}</li>`).join('')}</ul>`
        : `<h1 tabindex="-1">${storm === 'Wildfire' ? 'Choose where to start your fire' : 'Choose where your storm forms'}</h1><p><i style="--storm-color:${stormColor(storm)}"></i> Tap anywhere. Highlighted regions are suggested starts.</p>`
    : opening && state.blizzardPattern ? `<h1>${state.zones[state.origin].name}</h1><p>${blizzardPatterns[state.blizzardPattern].description}</p>`
    : opening ? state.theater.custom
      ? `<h1>${state.zones[state.origin].name}</h1><p>${coordinates(state.theater.places[0][1], state.theater.places[0][2])} · ${conditions(state, state.origin).name}${storm === 'Tornado' ? '' : conditions(state, state.origin).trend > 0 ? ' · Gains strength' : ' · Weakens here'}</p>`
      : `<h1>${state.zones[state.origin].name}</h1><p>Starting point marked. Press Begin when ready.</p>`
    : '')
  const gain = state?.momentumGain
  replace(mapStatus, state && !opening ? `<div class="hud-chip momentum"><span>${icon('storm')} Momentum</span><strong>${state.momentum}</strong></div>
    ${gain && state.realTime - gain.at < 3200 ? `<output class="momentum-gain">+${gain.points} ${gain.points === 1 ? 'point' : 'points'}</output>` : ''}
    <div class="hud-chip detection ${state.detectedAt !== null && !state.end ? 'tracked' : ''}"><span>${status}</span><strong>${Math.round(storm === 'Tornado' ? state.support : state.strength)}<small>% ${storm === 'Tornado' ? 'inflow' : 'strength'}</small></strong></div>` : '')
  replace(stats, state ? liveReadings(state) : '')
  if (!interactionInProgress) replace(bulletins, `<button class="news-button" data-key="news" data-action="news" ${!state || opening ? 'disabled' : ''}><strong>News</strong><span>${state && !opening ? state.events[0]?.text : 'No headlines yet'}</span></button>`)
}

function chooseOrigin(theater: Theater, origin: Origin = 0, blizzardPattern: BlizzardPattern | null = null) {
  if (!difficulty) return
  run = startRun(theater, origin, difficulty, seed)
  unlockedOnFinish = undefined
  if (blizzardPattern) chooseBlizzardPattern(run, blizzardPattern)
  overview = true
  opening = true
  alternateOpening = false
  mapOrder = null
  selectedFunnel = null
  mapFeedback = ''
  speed = settings.startingSpeed
  inspected = null
  inspectMode = false
  inspection = null
  dismissedHeadline = undefined
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
  await loadImpactRegions(forecast.theater, forecast.origin)
  if (loadingExposure === forecast) loadingExposure = null
  if (screen !== 'map' || run !== forecast || !opening) return
  run.zones = makeZones(run.theater)
  if (run.tornado) run.tornado.startedAt = tornadoStartDate()
  if (alternateOpening) useAbility(run)
  opening = false
  lastFrame = performance.now()
  render()
  transport.querySelector<HTMLElement>('[data-key="pause"]')?.focus({ preventScroll: true })
}

function showPanel(kind: NonNullable<typeof panel>, trigger: HTMLElement) {
  panel = kind
  if (kind === 'evolve') {
    evolutionTab = run?.theater.storm === 'Tornado' ? 'Tornado' : run?.theater.storm === 'Thunderstorm' ? 'Storm Track' : 'Formation'
    selectedUpgrade = null
  }
  panelTrigger = trigger
  renderPanel()
  dialog.showModal()
  const choosingType = kind === 'evolve' && run && needsThunderstormType(run) && !run.end
  const focus = kind === 'pause' ? '.pause-options [data-action="close-panel"]'
    : choosingType ? '#panel-title' : '[data-action="close-panel"]'
  dialog.querySelector<HTMLElement>(focus)?.focus()
}

function selectMap(id: ZoneId) {
  if (!run || inspectMode) return
  if (opening) {
    if (!run.theater.custom && (id === 0 || id === 1) && id !== run.origin) chooseOrigin(run.theater, id)
    return
  }
  if (!run.end && routeOptions(run).includes(id)) {
    steer(run, id)
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
  const abilityTarget = mapOrder === 'drop' || mapOrder === 'burst'
  const done = abilityTarget ? useAbility(run, point) : setCourse(run, point, mapOrder === 'funnel' ? selectedFunnel ?? undefined : undefined)
  if (done) {
    mapFeedback = abilityTarget ? '' : 'Preferred heading set'
    mapOrder = null
  } else mapFeedback = abilityTarget ? 'Choose land inside the highlighted area' : 'Choose a point away from the current position'
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
  const { action, value } = target.dataset
  switch (action) {
    case 'menu-play': void loadLocalities(); return showScreen('weather')
    case 'menu-section':
      if (value === 'guide' || value === 'records' || value === 'settings') return showScreen(value)
      break
    case 'menu-back': return showScreen(value === 'home' ? 'home' : 'weather')
    case 'choose-weather':
    case 'next-event':
      if (!value || !isCampaignEvent(value as Storm) || !eventUnlocked(value as CampaignEvent)) return
      if (storm !== value) difficulty = null
      hurricaneName = ''
      run = null
      storm = value as Storm
      return showScreen('difficulty')
    case 'choose-difficulty':
      if (!isCampaignEvent(storm) || !difficulties.includes(value as Difficulty) || !difficultyUnlocked(storm, value as Difficulty)) return
      difficulty = value as Difficulty
      break
    case 'start-game': if (difficulty && isCampaignEvent(storm) && eventUnlocked(storm) && difficultyUnlocked(storm, difficulty)) return void openForecast(); break
    case 'main-menu':
      if (panel === 'pause') closePause()
      run = null
      difficulty = null
      return showScreen('home')
    case 'view-results':
      if (!run?.tornado || !run.end) return
      closeClipping()
      return showScreen('results')
    case 'opening-move': alternateOpening = value === 'alternate'; break
    case 'blizzard-type': if (run && opening) chooseBlizzardPattern(run, value as BlizzardPattern); break
    case 'launch': return launch()
    case 'restart': {
      if (!run || panel !== 'pause') return
      const openingMove = alternateOpening
      closePause()
      chooseOrigin(run.theater, run.origin, run.blizzardPattern)
      alternateOpening = openingMove
      return launch()
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
    case 'satellite': if (run) triggerSatellite(run); break
    case 'dismiss-news': dismissedHeadline = latestHeadline(); break
    case 'ability':
      if (run?.effects.targetedBurst) return prepareMapOrder('burst')
      if (run?.front && hazardFor(activeStorm(run))?.ability.tornado) {
        if (run.effects.precisionDrop) return prepareMapOrder('drop')
        mapFeedback = useAbility(run) ? '' : 'No land within touchdown range'
        selectedFunnel = null
        if (overview && !inspectMode) overview = false
      } else if (run) useAbility(run)
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
    case 'speed': speed = speed === 1 ? 2 : 1; break
    case 'evolve':
    case 'region':
    case 'history':
    case 'clipping':
    case 'news': return showPanel(action, target)
    case 'close-panel':
      if (panel === 'pause-settings') return backToPause()
      if (panel === 'pause') return closePause()
      return dialog.close()
    case 'thunderstorm-type':
      if (run && panel === 'evolve' && chooseThunderstormType(run, value as ThunderstormType)) {
        render()
        dialog.querySelector<HTMLElement>('[data-key="evolution-tab-Storm Track"]')?.focus({ preventScroll: true })
      }
      return
    case 'evolution-tab': evolutionTab = value as typeof evolutionTab; selectedUpgrade = null; break
    case 'select-upgrade': selectedUpgrade = value ?? null; break
    case 'buy': if (run && value) buyUpgrade(run, value); break
    case 'refund':
      if (run && value && removeUpgrade(run, value)) mapOrder = null
      break
    case 'weather-pickup':
      if (run && !opening && collectWeatherPickup(run, Number(value))) {
        render()
        if (event.detail === 0) map.focus({ preventScroll: true })
      }
      return
    case 'weather-layer': showWeather = !showWeather; break
  }
  render()
  if (action === 'change-origin') prompt.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
})

function updateSettings({ target }: Event) {
  if (target instanceof HTMLSelectElement && target.id === 'units-setting') {
    settings.units = target.value === 'metric' ? 'metric' : 'imperial'
  } else if (target instanceof HTMLSelectElement && target.id === 'starting-speed') {
    settings.startingSpeed = target.value === '2' ? 2 : 1
  } else if (target instanceof HTMLInputElement && target.id === 'breaking-news-setting') {
    settings.breakingNews = target.checked
  } else return
  saveSettings()
  if (panel === 'pause-settings') render()
}
menu.addEventListener('change', updateSettings)
dialog.addEventListener('change', updateSettings)

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
  if (run || !event.target.reportValidity()) return
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
document.addEventListener('visibilitychange', () => { lastFrame = performance.now() })

function frame(now: number) {
  const elapsed = Math.min(100, Math.max(0, now - lastFrame))
  lastFrame = now
  if (run && !opening && !panel && !run.end && !document.hidden) {
    run.realTime += elapsed
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
        mapOrder = null
        if (isCampaignEvent(run.theater.storm)) {
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
