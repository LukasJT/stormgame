import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const root = resolve('public')
globalThis.fetch = async input => {
  const path = resolve(root, String(input).replace(/^\//, ''))
  if (!path.startsWith(root + sep)) return new Response(null, { status: 400 })
  try { return new Response(await readFile(path)) } catch { return new Response(null, { status: 404 }) }
}
const locations = {
  Tornado: [[37.69,-97.34],[41.25,-95.93],[35.47,-97.52],[43.65,-79.38],[34.7,-86.6],[40.72,-74],[53.54,-113.49],[64.32,-96.02],[29.42,-98.49],[30,-88]],
  Hurricane: [[21,-87],[24,-86],[25,-83],[27,-94],[18,-72],[15,-54],[32,-73],[28,-80],[31,-81],[37,-72]],
  Blizzard: [[53.54,-113.49],[51,-114],[42,-82],[43,-77],[40,-74],[41,-70],[44,-66],[47,-57],[45,-93],[46,-71]],
  Thunderstorm: [[37.69,-97.34],[50.45,-104.62],[41.25,-95.93],[35.47,-97.52],[43.65,-79.38],[34.7,-86.6],[40.72,-74],[53.54,-113.49],[64.32,-96.02],[30,-88]],
  Wildfire: [[39.76,-121.62],[40.7,-122.5],[37.74,-119.6],[44.1,-121.7],[38.65,-122.5],[51,-114],[35.8,-106.4],[-33.7,150.4],[-37.6,146.4],[-11.6,-55.4]],
}
try {
  const [sim, geo, upgrades, campaign] = await Promise.all(['sim','free-drop','upgrades','campaign'].map(name => server.ssrLoadModule('/src/' + name + '.ts')))
  await geo.loadLocalities()
  const full = process.argv.includes('--full')
  const modes = full ? ['passive', 'focused', 'mixed', 'adaptive'] : ['passive', 'adaptive']
  const rows = []
  const selectedEvent = process.argv.find(arg => arg.startsWith('--event='))?.slice(8)
  for (const [event, starts] of Object.entries(locations)) {
    if (selectedEvent && selectedEvent !== event) continue
    for (const [lat, lon] of full ? starts : starts.slice(0, 2)) {
      const theater = geo.makeDrop(event, lat, lon)
      await geo.loadImpactRegions(theater, 0)
      for (const difficulty of full ? campaign.difficulties : ['Normal']) for (const policy of modes) {
        for (let index = 0; index < (full ? 20 : 2); index++) {
          const seed = sim.defaultSeed + index * 7919
          const run = sim.startRun(theater, 0, difficulty, seed)
          if (run.end) continue
          const tree = upgrades.trees[event]
          const purchases = []
          while (!run.end && run.time < 3600) {
            if (policy !== 'passive') {
              if (run.pickup) sim.collectWeatherPickup(run, run.pickup.time)
              const ready = tree.filter(item => !run.upgrades.includes(item.id) && !sim.upgradeLocked(run, item))
              const trend = policy === 'adaptive' ? sim.conditions(run, run.at).trend : 0
              const value = item => policy === 'focused' ? (item.group === tree[0].group ? 10 : 0)
                : policy === 'mixed' ? -run.upgrades.filter(id => tree.find(node => node.id === id)?.branch === item.branch).length
                : (item.effects.wind ?? 0) / 12 + (item.effects.tornadoIntensity ?? 0) * 4
                  + (item.effects.seaGain ?? 0) * 8 + (item.effects.endurance ?? 0) * (trend < 0 ? 8 : 2)
                  + (item.effects.snowRate ?? 0) * 3 + (item.effects.spread ?? 0) * 3
              ready.sort((a,b) => value(b) - value(a))
              const next = ready[0]
              if (next) {
                const cost = sim.upgradeCost(run, next)
                if (sim.buyUpgrade(run, next.id)) purchases.push({ tick: run.time, id: next.id, cost })
              }
              if (run.time % 15 === 0 && sim.hazardAbilityReady(run)) sim.useAbility(run)
            }
            sim.tick(run)
          }
          const totals = sim.totals(run)
          rows.push({ event, difficulty, policy, seed, lat, lon, ticks: run.time, ending: run.end, censored: !run.end,
            income: run.momentum + purchases.reduce((sum, purchase) => sum + purchase.cost, 0),
            purchases, ...totals, stars: campaign.earnedStars(event, difficulty, totals.damage, !!run.end) })
        }
      }
    }
    console.error('Measured ' + event)
  }
  console.log(JSON.stringify(rows))
} finally {
  await server.close()
}
