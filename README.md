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

Choose **Sandbox** on the main menu to try any event and difficulty with unlimited Momentum. Upgrade prerequisites still apply. Sandbox runs have their own results and do not award campaign stars or unlocks.

Tornado, Thunderstorm, and Wildfire forecasts start with ten Momentum. Hurricanes start with twenty and get larger, more frequent awards and pickups during the first four minutes at 1×, giving you time to invest before landfall. Other forecasts start with five. Spend Momentum in **Evolve**. During a forecast, the speed button cycles through 1×, 2×, and 4×. Set your preferred starting speed in **Settings**.

**Thunderstorm** starts as a developing cell. Use **Evolve** to invest in Movement, Damage, and Abilities. The strongest investment in Rotation and touchdown, Straight-line winds, or Cell regeneration organizes it into a supercell, squall line, or multicell cluster. Ties favor rotation, then outflow. Hail, lightning, flooding, and warning disruption offer separate upgrades. **Drop tornado** works in every form. Supercells can spawn stronger and longer-lived tornadoes. **Guided Funnels** allows steering individual funnels, **Precision Touchdown** allows targeting land within the drop area, and **Course Control** lets you steer the parent storm. Thunderstorm uses the same Momentum award and pickup cadence as Tornado, plus capped rewards for damaging populated areas.

Name your hurricane before **Begin**. Its course follows a smooth, basin-based flow with gradual recurvature. The starting position determines its environment and trajectory. Warm seas strengthen the storm slowly. Invest in Formation to raise its warm-water potential, or buy sustained wind upgrades in Damage for an immediate boost while the core holds together. Damage also covers storm size and reach, rainfall, coastal surge, and structural damage from gusts. Cool water, shear, and inland friction weaken the storm. The hurricane clock starts at your current local date and time and advances six storm minutes per simulation step. **Track history** and **Storm news** use those same dates. Fifteen minutes of play at 1× covers about four simulated days.

Standalone and dropped tornadoes generally track southwest to northeast. A standalone tornado starts at EF0 and gets stronger only through upgrades. Air conditions affect weakening and how long the circulation lasts. A water start is called a waterspout until it comes ashore. Land starts take the name of the nearest mapped city. Open **Settings** to switch from miles to metric units. At close zoom, the damage path uses stronger wind bands in the core and weaker bands toward its edges. Dark marks within the broader severe swaths show potential ground scouring.

Standalone tornadoes begin at 3:00 PM on the player's current calendar date. Each simulation step advances the storm clock by 15 seconds. In favorable regions, the completed Travel limit and Lifetime limit branches allow a four-hour, 400 km (249 mi) run. Track distance counts the portions over land. At dissipation the Dispatch reports the track, peak width and intensity, estimated casualties and damage, and affected towns. **Next** opens the score breakdown, where **Retry** repeats the forecast and **Exit** returns to the main menu.

The Tornado tab describes the active funnel. **Movement** upgrades forward speed, track stability, travel distance, and lifetime, with a capstone for map steering. The **Damage** wind branch can reach EF5 on its own. Satellite tornadoes branch off in random directions, and Vortex Split adds a manual trigger that recharges after 60 real seconds of active play. **Abilities** covers inflow, communications, and shelter disruption. Damage in populated areas earns Momentum faster, with diminishing returns and a cap of 32 damage points per forecast. Medium prices rise by one after every two purchases. Hard prices rise by one per purchase, and Expert prices rise by two. Removing an upgrade returns a fraction of its paid price, with smaller refunds on higher difficulties and after repeated removals. Expert returns no Momentum. Wider, stronger tornadoes draw attention and casualty reports send more people to shelter. Rain wrapping delays detection. Every weather event uses connected upgrade trees. Shared upgrades require both incoming paths, and different trees can be completed within the same forecast if you have the Momentum.

With a blizzard, placing a marker shows the local pattern options and recommends one. Pick a pattern before **Begin** to preview its track. The Mid-Atlantic Coast and New England offer a **Nor’easter** that follows an offshore corridor toward Atlantic Canada. During the run, **Curve left** and **Curve right** gradually nudge the heading by up to 18 degrees. **Far left** and **Far right** extend that to 36 degrees. Nor’easters also have **Hard left** (60 degrees) and **Max left** (90 degrees). **Natural** eases back to the pattern's normal heading. Snow and whiteouts develop automatically. Cold air can gather moisture over lakes and oceans, and the snow band releases that moisture as it moves inland. The snowfall overlay shows modeled storm totals in inches or centimeters.

An **Alberta Clipper** tracks east-southeast across the prairies toward the Great Lakes. Buy **Steady Cold Feed**, **Cold-Air Reserve**, and **Polar Lock** to preserve strength across the dry leg. **Lake Inflow** and **Long Lake Fetch** let the storm recover circulation and produce heavier snow when it crosses the Great Lakes.

A **Nor’easter** can follow the Atlantic coast past New England to Newfoundland. Coastal inflow keeps the storm going on the way north, then the system weakens as it moves out into the North Atlantic. Thunderstorms retain their inflow longer and weaken more gradually in adverse conditions.

After dissipation, pan and zoom the final map to inspect the damage. A tornado’s newspaper and score screen both have an **Explore damage** button. Snowfall and wildfire perimeters remain visible, and amber markers indicate recorded property losses for events that use them.

**Wildfire** uses a global historical burn map. Shaded land recorded vegetation or peat burning in GFED5 during 2001–2020. More frequent burning gives a stronger start. Fire spreads rapidly across large hexes for an exaggerated footprint. Favorable starts can burn for 15–20 minutes at 1×. Crews and aircraft take longer to gain control, and the wildfire star targets reflect the larger damage totals. **Send embers** can start a new downwind fire on receptive ground. Crews build firelines and aircraft drop retardant as the response grows. The perimeter shows yellow for ignition or cooling, orange for burning, red for intense fire, green for contained ground, and black for fuel that has burned out. Evolve across Movement, Damage, and Abilities to change how the fire spreads and responds to suppression.

The **Weather overlay** control toggles imagery for events that use it. Layers use map scale and fade at wide zooms. Supercell uses modeled reflectivity. Developing cells and other thunderstorm forms use representative archived echoes. Standalone tornadoes are represented by the track and damage swath. Hurricane rainbands and several precipitation patterns are derived from archived NOAA radar images. Blizzard uses a snowfall accumulation map with a palette adapted from NWS Albany storm-total snowfall maps. Hurricane imagery rotates with simulated sustained wind. Dust and heat layers are modeled in the game. See [data sources](DATA_SOURCES.md) for attribution.

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
