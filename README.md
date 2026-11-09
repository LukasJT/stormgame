# Stormwake

Stormwake is a pausable, single-player severe-weather strategy game. Choose an event, place a starting marker on the satellite map, then steer, evolve and compare deaths and damage after the run.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Select **Play**, choose an event and difficulty, then select **Play** again to open the map. Tap the world map or enter coordinates to place a temporary marker. Shaded tornado regions and pins for other events show suggested starts. Tap another point to move the marker, then select **Begin**. Open **Storm view** for regional detail and **Evolve** to buy upgrades.

The campaign starts with **Tornado**. Finish a forecast on any difficulty to earn one star and open the next weather event. Four property-damage thresholds award the rest of the stars. Targets vary by event and difficulty. **Storm Records** keeps separate Easy, Normal and Hard ratings. Older records without a difficulty appear as unranked bests and count as completed events.

Tornado forecasts start with ten Momentum, earn two or three at irregular intervals, and offer map pickups worth three to five. Other forecasts start with five Momentum, with weather pickups worth two or three. Spend Momentum in **Evolve**.

Start as **Thunderstorm** and open **Evolve** to pick a type. The developing storm drifts east or southeast, leaving a blue track. **Drop tornado** picks a random touchdown within the storm's nearby land area and the tornado leaves its own red track. With **Guided Funnels**, select a tornado and tap the map to bias its heading. The **Precision Touchdown** capstone lets you choose where a tornado lands within the highlighted area. The **Course Control** capstone lets you direct the parent storm. Lightning, Pulse, and the other non-tornadic types each have a Severe Impact path that unlocks aiming their active ability. Invest in Storm Track, Tornadoes, Severe Impact, Flooding, or Longevity.

Name your hurricane before **Begin**. Its course follows a smooth, basin-based flow with gradual recurvature. The starting position determines its environment and trajectory. Warm seas can fuel intensification, while cool water, shear, and inland friction weaken it. **Track history** records the changes in sustained winds, classification and environment, from formation through landfall and dissipation. An upgraded Gulf run can take around fifteen minutes at 1×. The clock shows elapsed time, and other hazards also run until their environmental support gives out.

Standalone and dropped tornadoes generally track southwest to northeast. A standalone tornado starts at EF0 and gets stronger only through upgrades. Air conditions affect weakening and how long the circulation lasts. A water start is called a waterspout until it comes ashore. Land starts take the name of the nearest mapped city. Open **Settings** to switch from miles to metric units. At close zoom, the damage path uses stronger wind bands in the core and weaker bands toward its edges. Dark marks within the broader severe swaths show potential ground scouring.

Standalone tornadoes begin at 3:00 PM on the player's current calendar date. Each simulation step advances the storm clock by 15 seconds. In favorable regions, the completed Travel limit and Lifetime limit branches allow a four-hour, 400 km (249 mi) run. Track distance counts the portions over land. At dissipation the Dispatch reports the track, peak width and intensity, estimated casualties and damage, and affected towns. **Next** opens the score breakdown, where **Retry** repeats the forecast and **Exit** returns to the main menu.

The Tornado tab describes the active funnel. **Movement** upgrades forward speed, track stability, travel distance, and lifetime, with a capstone for map steering. The **Damage** wind branch can reach EF5 on its own. Satellite tornadoes branch off in random directions, and Vortex Split adds a manual trigger that recharges after 60 real seconds of active play. **Abilities** covers inflow, communications, and shelter disruption. Damage in populated areas earns Momentum faster, with diminishing returns and a cap of 32 damage points per forecast. Medium prices rise by one after every two purchases. Hard prices rise by one per purchase, and Expert prices rise by two. Removing an upgrade returns a fraction of its paid price, with smaller refunds on higher difficulties and after repeated removals. Expert returns no Momentum. Wider, stronger tornadoes draw attention and casualty reports send more people to shelter. Rain wrapping delays detection. Every weather event uses connected upgrade trees. Shared upgrades require both incoming paths, and different trees can be completed within the same forecast if you have the Momentum.

With a blizzard, placing a marker shows the local pattern options and recommends one. Pick a pattern before **Begin** to set its snowband appearance, track speed, snowfall, and whiteout duration.

The **Weather overlay** control toggles imagery for events that use it. Layers use map scale and fade at wide zooms. Thunderstorm and Supercell use modeled reflectivity. Standalone tornadoes are represented by the track and damage swath. Hurricane rainbands and several precipitation patterns are derived from archived NOAA radar images. Hurricane imagery rotates with simulated sustained wind. Wildfire smoke, dust, and heat layers are modeled in the game. See [data sources](DATA_SOURCES.md) for attribution.

## Verify

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

The production build goes to `dist/`. The simulation runs with bundled satellite and population data. Routes and storm impacts are tuned for gameplay. See [data sources](DATA_SOURCES.md) for attribution and the population model.

Use the wheel or pinch to zoom the world or regional map, and drag to pan. Closer zoom levels reveal smaller cities and load more detailed satellite imagery when available. The map buttons zoom in, zoom out and reset the view. With the map focused, use the arrow keys to pan, **+** and **−** to zoom, and **0** to reset.

The event's live readings appear in the upper-right corner. **Evolve** opens the upgrade tree. Click a country on the world map during a run to see its population and administrative boundaries. Click a boundary to drill into regional population, injuries and deaths. Clicking a different country clears the selection. Click it again to inspect it.
