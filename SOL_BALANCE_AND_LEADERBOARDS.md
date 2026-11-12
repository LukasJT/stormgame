# Stormwake implementation brief for Sol

Prepared November 11, 2026. Reviewed source commit `62a0d842943a0e9c8847d7fefa4c9bad2a5edf00` on `tornado-gameplay` in `LukasJT/stormgame`.

## Assignment

Improve difficulty, strategy, pacing, upgrade value, and feedback within Stormwake’s existing design. Add shared leaderboards with player-chosen display names, reduce notification spam, add basic sound effects, and introduce English, French, and Spanish language support. Complete the implementation, test the actual player flows, and publish the working release through the existing hosting workflow.

The player’s strongest positive feedback is about thunderstorms dropping individual tornadoes. Treat that action as the reference for enjoyable interaction. The desired loop is to read conditions, choose an investment, time an action, watch its visible consequences, and adapt.

This brief contains verified code findings and proposed tuning targets. Proposed numbers are starting hypotheses that require simulation and playtesting. The review inspected the current source and executed its Momentum schedule and upgrade-tree definitions. It did not perform a fresh multi-seed gameplay balance study or human playtest. Produce that evidence during implementation.

## Product requirements to carry forward

- Keep the five events in their existing order and three-over-two picker layout. Tornado, Hurricane, and Blizzard occupy the top row. Thunderstorm and Wildfire sit below.
- Keep the satellite world map, free placement, temporary marker followed by Begin, map inspection, city names, smooth tracks, connected upgrade trees, named hurricanes, local tornado names, and postgame map exploration.
- Retain Easy, Medium, Hard, Expert, Sandbox, and 1×/2×/4× playback. Medium is currently stored internally as `Normal`; preserve that identifier for save compatibility. Preserve old personal records and campaign unlocks through migration.
- Retain one star for completing a valid forecast and the existing event unlock sequence. Sandbox retains unlimited Momentum. Use campaign scores for competitive rankings and a clearly marked Sandbox showcase if sharing experimental runs.
- Retain the upgrade-removal confirmation, exact refund amount, dependency checks, Cancel, and Escape behavior.
- Keep tornadoes weak initially. Preserve the game rule of zero EF0 fatalities and minimal initial damage. Keep separate injury and death counts and dollar-formatted property damage.
- Hurricanes follow environmental steering from their selected origin. Blizzard steering remains available. Thunderstorm tornado placement and steering develop through upgrades.
- Preserve naturally ending storms and the recent longer thunderstorm, Atlantic Canada blizzard, and larger wildfire experiences. Long-run targets are pacing goals rather than a visible countdown or universal expiry time.
- Preserve the user’s request to omit next-star damage requirements from the live HUD. Keep upgrade purchase announcements within Evolve and factual weather reporting in the news feed.

## Research and how to apply it

Plague Inc. centers its premise on evolving a threat while adapting to humanity’s defenses. For Stormwake, connect growth to visibility, warnings, sheltering, evacuation, and suppression. A larger storm should create additional opportunities and a more capable response. This is a design inference from the game’s premise, not a claim that Stormwake should reproduce its formulas. [Ndemic’s Plague Inc. description](https://www.ndemiccreations.com/en/22-plague-inc)

Ndemic’s Rebel Inc. Arcade update explicitly made lower difficulties more forgiving, slowed defeated enemies’ recovery, and used win rates and player feedback to guide adjustments. Apply that lesson by preserving time to react on Easy and Medium, limiting sudden adverse-condition combinations, and evaluating actual results across skill levels. [Rebel Inc. Arcade and balance update](https://www.ndemiccreations.com/en/news/247-rebel-inc-arcade-mode-update)

Into the Breach reveals enemy attacks before resolution. Stormwake can borrow the clarity through a forecast of approaching dry air, colder water, lake moisture, or suppression. Forecasts should provide enough information for a purchase or ability choice while retaining uncertainty about exact storm outcomes. [Subset Games’ Into the Breach description](https://store.steampowered.com/app/590380/Into_the_Breach/)

FTL presents several possible responses to a developing crisis and supports tactical orders during real-time play. Apply that principle through meaningful choices between intensity, persistence, coverage, and recovery. Continue pausing during Evolve so strategic thought remains comfortable. [Subset Games’ FTL description](https://store.steampowered.com/app/212680/FTL_Faster_Than_Light/)

Keep meteorological cause and effect intelligible. The EF scale estimates wind from damage indicators. Label the game’s wind-derived EF rating as modeled intensity where appropriate, particularly in reports and explanations. Hurricane category describes wind and does not summarize rainfall or surge. Make these hazards useful distinct strategies. [NWS EF scale](https://www.weather.gov/oun/efscale), [NOAA hurricane hazards](https://www.noaa.gov/explainers/explainer-understanding-hurricane-hazards)

## Verified code findings

### Economy and upgrade pricing

Every current event has 44 upgrade nodes. `src/upgrades.ts` contains the definitions. `src/momentum.ts` supplies fixed arrays of income and pickups. The following totals were computed directly with default seed `80417`. They include starting Momentum and all pickups available by that tick, assuming collection. They exclude damage awards, spending, and early dissipation. At 1×, 300 ticks correspond to five minutes and 900 ticks to fifteen minutes.

| Event | Starting points | Points available by 300 ticks | By 900 ticks | Last passive award tick | Sum of all base upgrade costs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Tornado | 10 | 60 | 170 | 916 | 332 |
| Hurricane | 20 | 135 | 178 | 1047 | 259 |
| Blizzard | 5 | 19 | 45 | 985 | 233 |
| Thunderstorm | 10 | 62 | 169 | 917 | 286 |
| Wildfire | 10 | 64 | 181 | 910 | 245 |

Tornado, Thunderstorm, and Wildfire can additionally earn up to 32 damage-derived points through `damageMomentum` in `src/sim.ts`. That income favors dense, valuable starting areas. Blizzard and Hurricane lack that particular income source. Blizzard is markedly more constrained than the other events even before difficulty pricing.

`upgradeCost` adds `floor(purchases × difficultyIncrease)` to every upgrade, with increases of 0, 0.5, 1, and 2. Across the first twenty purchases, that adds 0, 90, 190, or 380 points above base costs. Refunds preserve the purchase counter and have additional diminishing returns. This can make a late switch of strategy unaffordable.

For example, Thunderstorm’s four-node Track control tree costs 24 points at base. On Hard, purchasing it first costs 30. Purchasing it after ten other upgrades costs 70. Expert raises those figures to 36 and 116. The player may perceive this as being punished for experimenting.

### Difficulty and timing

`difficultyRules` currently uses shelter baselines of 0%, 50%, 90%, and 98%. Favorable-condition values are 0.65, 0.45, 0.25, and 0.12, while hostile-condition values are 0.10, 0.20, 0.35, and 0.48. These values feed different event-specific models, so they are not directly comparable probabilities for every event.

`main.ts::frame` advances one simulation tick per accumulated second, multiplied by playback speed. It clamps each frame’s elapsed contribution to 100 ms. Meanwhile, standalone tornado satellite actions and automatic satellite opportunities use `run.realTime` in `sim.ts`. At higher playback speeds this changes the number of satellite opportunities during the same simulated storm. It also complicates replay verification.

Tornado date/time advances 15 simulated seconds per tick. Hurricane date/time advances six simulated minutes per tick. Warning lead time currently uses `(run.time - warnedAt) / 60` in the shared impact model. Its meaning needs an explicit unit contract before changes to calendar time or defenses.

Blizzards and thunderstorms lose support through `develop`. A depleted support pool creates a strong additional weakening term. Wildfire drying includes an age-based decline after tick 820. Hurricane shear increases with distance traveled over water after 850 km, including warm water. These are gameplay abstractions that can look like unexplained decline if the player sees only current intensity.

### Damage and scoring

`impact.ts` provides a shared wind fragility and casualty model adapted from the project’s Tornado Simulator source. Other hazards sometimes convert their effects to an equivalent impact wind. For example, blizzard snow accumulation raises the impact wind argument, and wildfire heat also feeds a wind argument. This makes the model reusable but can create implausible relationships between hazards, protection, and deaths.

`applyImpact` already caps local property loss at the zone’s assets and deaths at its remaining population. Preserve those constraints. Audit repeated overlaps, especially multiple burning hexes or hazard samples sharing one exposure zone, before adjusting damage multipliers.

`campaign.ts` uses fixed dollar thresholds and maps Expert to Hard’s thresholds. Current three-star thresholds include Thunderstorm at $2.5 billion on Easy, $800 million on Medium, and $170 million on Hard. Blizzard’s corresponding targets are $22 billion, $12.5 billion, and $4.3 billion. Thresholds can be lower on a harder mode if modeled opportunities are lower, but the current figures lack an accompanying calibration dataset.

`profile.ts::recordRun` takes independent maximums for damage, deaths, and stars across runs. That is suitable for displaying personal bests but does not describe one historical run. A leaderboard entry must derive from a single immutable result.

### News and localization

`sim.ts::log` retains only about twelve entries. Snow reports can cross six thresholds independently for each place. Tornado touchdown and shelter messages can repeatedly be marked as breaking news. `main.ts::latestHeadline` selects a recent breaking event younger than fourteen simulation ticks. There is no global presentation cooldown or aggregation layer. At 4× the display window is only 3.5 real seconds, and several events may replace each other rapidly.

Text is embedded in `main.ts`, `sim.ts`, upgrade definitions, and other modules. `Intl` formatters in `main.ts`, `storm-clock.ts`, `units.ts`, and `tornado-report.ts` hardcode `en-US`. Events store English sentences rather than message IDs and structured parameters. Address this once for both notification quality and translation.

## Implementation order

Work in reviewable stages. Use the existing TypeScript/Vite architecture and established UI. Recheck the current branch before editing because this review is pinned to a specific commit.

1. Establish baseline measurements, canonical timing, immutable run summaries, and replayable commands.
2. Fix income continuity and upgrade pricing, then calibrate event-specific difficulty and stars.
3. Improve the storm action loop and environmental feedback.
4. Replace notification spam with structured, prioritized news. Use the same event definitions for sound and localization.
5. Build the shared leaderboard service and submission UI.
6. Finish English/French/Spanish coverage and audio settings, test the complete flows, and publish.

## 1. Measure before tuning

Create a headless balance runner that uses the same simulation and loaded geographic data as gameplay. Record event, difficulty, seed, coordinates, upgrades with purchase ticks and prices, actions, income sources, lifetime, damage, deaths, injuries, affected settlements, and ending cause.

Use at least ten representative starts per event across all four difficulties and twenty deterministic seeds per start. Include favorable rural, favorable urban, marginal, water, and geographic boundary cases where supported. Include Kansas/Saskatchewan thunderstorms, coastal and inland wildfire starts, the Gulf, Atlantic hurricane tracks, a land crossing followed by warm water, an Alberta Clipper toward the Great Lakes, and a Nor’easter toward Newfoundland.

Compare passive play, a simple focused build, a mixed build, and an adaptive policy. Scripted policies establish reproducible differences. Actual human sessions establish fun and understandability. Use a small initial pilot to estimate runtime before running the complete matrix.

Report median and 10th/90th percentiles for lifetime, income, upgrade count, first capstone time, longest period without an affordable useful upgrade, damage, and star rating. Record which starts and seeds end early. Report runs that are still active at the harness limit as censored, rather than completed forecasts.

Add game and balance version IDs, plus the population/geography dataset version, to each run. Retain the dataset used to verify published leaderboard seasons.

## 2. Economy and difficulty changes

### Replace global purchase inflation

Use stable tier pricing with a modest explicit difficulty multiplier. Start with these base-cost ranges and difficulty multipliers, then adjust using the baseline results.

| Node role | Suggested base price |
| --- | ---: |
| Starter with an immediately visible effect | 3–4 |
| Second investment in a branch | 5–7 |
| Strong specialization | 8–11 |
| Major control or branch capstone | 12–16 |
| Exceptional combined endpoint | 18–22 |

Begin with price multipliers of Easy 1.00, Medium 1.10, Hard 1.20, and Expert 1.35, rounded consistently to whole points. Remove the purchase-count surcharge. Preserve current prerequisite graphs and paid-price refund accounting. Preserve confirmation before removal. Avoid introducing hard branch exclusivity unless playtesting demonstrates a specific need.

Document total prerequisite-inclusive costs for every capstone. Aim for the first defining specialization around three to five minutes at 1× on a viable Medium start, and a meaningful second direction around eight to twelve minutes. A successful player should reach useful late upgrades while still choosing between paths.

### Keep points arriving

Replace finite income arrays with a deterministic schedule that continues while the run is alive. Use event-specific generation state and seeded randomness. Existing early hurricane generosity should remain strong enough for short offshore approaches.

Begin testing with total available Momentum by fifteen minutes, including ordinary pickup collection, in these ranges. Keep the existing damage bonus separately measured.

| Event | Initial total-income target |
| --- | ---: |
| Tornado | 140–175 |
| Hurricane | 175–200 |
| Blizzard | 125–160 |
| Thunderstorm | 155–180 |
| Wildfire | 155–190 |

Favor Blizzard income improvements first. Allow at least two useful early choices without waiting several minutes. Aim for a meaningful income event every twenty to thirty-five simulation ticks and a pickup about every forty-five to sixty ticks. Scale point values by event instead of flooding the screen with more bubbles.

Continue reduced late income after the opening phase. Test for indefinite income farming together with event lifetime and scoring. Retain the existing cap and diminishing returns on damage-based income until evidence supports changing it.

Support keyboard pickup activation and large touch targets. At 4×, keep pickups readable and reachable. An optional pause-on-opportunity setting can help. Record pickup collection at its simulation tick for replay. Avoid changing reward amounts with playback speed.

### Make difficulty change decisions

Use environment, response speed, and forecast uncertainty as the main difficulty dimensions. Begin by retaining the present Easy shelter policy and testing shelter baselines around 50%, 80%, and 92% for Medium, Hard, and Expert. Treat those as game balance parameters. Measure actual casualty behavior before shipping them.

Tune favorable and hostile condition distributions separately for each event. On Easy and Medium, provide a readable warning before a major adverse change and enough time for a reasonable response. Hard and Expert may shorten recovery windows and demand preparation. Avoid combining severe income scarcity, steep price inflation, and abrupt deterioration in the same mode.

Keep geography meaningful. A central Plains tornado should be easier to sustain than one in northern Nunavut. Explain marginal starts before Begin and show the relevant cause during play. Weather resistance should mitigate a disadvantage while preserving a reason to care about starting conditions.

## 3. Timing, realism, and storm actions

### Establish one gameplay clock

Use simulation ticks for abilities, automatic opportunities, income, damage, and decisions. Reserve wall time for presentation, UI animation, and audio cooldowns. Convert current 60/70-second satellite rules to explicit simulation-tick durations calibrated at 1×. Preserve smooth movement and pause behavior.

Store an explicit meteorological seconds-per-tick value for event calendars and duration reports. Define whether warning effectiveness uses normalized gameplay time or modeled weather time and calibrate it per event. A direct multiplication of hurricane lead time by 360 could otherwise eliminate casualties through the current linear formula.

Run equivalent command sequences at 1×, 2×, and 4×. End states must match. Verify low-frame-rate behavior and hidden-tab pause behavior. Avoid simulation work or audio continuing unexpectedly behind a paused upgrade screen.

### Give every event a recognizable action

| Event | Build on current behavior | Proposed first improvement |
| --- | --- | --- |
| Thunderstorm | Rotation charge, random nearby tornado drops, independent red tracks | Show drop readiness and expected intensity range, expose the future drop area clearly, and highlight a selected funnel’s lifetime and damage |
| Tornado | Wind/width upgrades, lifetime, late steering and satellite trigger | Improve steering preview and satellite feedback, with optional short inflow-concentration ability that trades a brief strength boost for support consumption |
| Hurricane | Early formation decisions, natural track, warm-water recovery | Add a modest timed intensification action eligible over warm water, funded by ocean heat accumulated while the environment supports it |
| Blizzard | Steering, moisture collection, lake/ocean feeding | Add a Snowburst action that spends stored moisture for a short, visible snowfall increase, then requires recharge |
| Wildfire | Send embers, visible burning hexes, fuel and suppression | Preview a downwind ember sector and allow a later upgrade to choose a valid target inside it |

Implement the lowest-risk improvements to existing actions first. Add the proposed new actions after measuring the pacing of the current loops. Each new action needs a clear eligibility condition, a visible resource cost, a visible consequence, and a reason to save it for a better moment. Keep the resource presentation compact by showing only the active event’s resource.

For Thunderstorm, preserve immediate access to the first weak tornado and random nearby drops until Precision Touchdown. Target subsequent basic drops roughly every twenty to thirty-five simulation ticks in suitable conditions. Powerful builds can shorten this moderately. Clamp costs above zero and test maximum upgrade combinations. Keep weak and violent tornado probabilities distinct, and preserve steering as a late investment.

Support three viable thunderstorm approaches using the existing trees. Rotation specializes in individual funnels, outflow specializes in broad wind damage, and regeneration/rain specializes in persistence and flooding. Existing subtype changes are inferred from upgrade totals. Make the currently leading specialization understandable and avoid sudden unexplained switches when two totals tie.

### Natural endings and understandable deterioration

Use these initial viable-Medium-start pacing targets at 1×. Tornado roughly 8–16 minutes with a strong specialized run approaching its existing four modeled hours. Hurricane roughly 12–20 minutes, Thunderstorm roughly 15–24 minutes, Blizzard roughly 12–22 minutes depending on pattern and route, and Wildfire roughly 15–22 minutes. Marginal starts may end much earlier.

Expose the dominant reason for strengthening or weakening in the existing storm panel. Examples include available inflow, dry air, cold water, land friction, moisture depletion, fuel exhaustion, and suppression. Keep brief forecast cues for approaching changes. Recovery should be possible when the cause actually reverses, within the event’s physical bounds.

Audit hurricane age/distance-driven shear so the player can distinguish an actual adverse environment from a warm-water recovery opportunity. Audit wildfire’s age-driven drying and blizzard support exhaustion. Preserve the ability for an appropriately upgraded Clipper to reach the Great Lakes and a Nor’easter to continue toward Newfoundland.

Keep the exaggerated wildfire footprint requested by the player. Make growth look responsive while suppression gradually gains ground. Intensity, duration, and footprint should each have useful upgrades. Avoid turning every longer-lived fire into an inevitable five-star outcome.

### Improve impact calculations incrementally

Keep the shared exposure, population, asset, and damage-accounting data. Separate hazard severity from equivalent wind where it creates bad outcomes. Add focused calculations for snowfall load/transport disruption, flooding, and fire exposure, then feed them into shared bounded loss accounting. Preserve the tornado fragility baseline.

Deduplicate sampled cells before applying one hazard’s per-tick effect. For simultaneous hazards, cap combined losses at remaining assets and combined deaths/injuries at valid population totals. Test repeated paths, multiple funnels, burning hexes in the same exposure zone, and coastline transitions. Cumulative injury definitions must be explicit if people can later die.

## 4. Stars and strategy calibration

Keep stars per event and difficulty. One star means a valid naturally completed run. Two stars should represent a modest full run, three competent play, four strong execution, and five exceptional play. A brief weak storm usually earns one star.

After changing the economy and damage logic, derive new dollar targets from the measured runs. Use tentative pooled percentiles around 30th, 60th, 85th, and 97th as an initial calibration aid. Define the reference cohort of viable starts and active play policies, then validate with human sessions. Freeze targets per balance version. Player scores must not change retroactively as leaderboard populations grow.

Calibrate Expert independently. Maintain separate boards by difficulty and event. Use explicit seeded challenges for comparisons under equal starting conditions. Free-placement damage boards naturally reward valuable locations, so show origin and route with each run.

Require at least three competitive builds for Thunderstorm and two for each other event across the test matrix. Investigate any build that wins almost every suitable start. Compare active decisions against an unattended run on the same seed. If passive play reliably earns four or five stars, adjust the relevant damage or threshold model.

## 5. News with fewer interruptions

Introduce structured events containing a stable ID, type, simulation tick, priority, locality identifier, typed parameters, and a deduplication key. Store semantic values such as snowfall depth and tornado ID. Render localized prose at display time. Keep gameplay event emission independent of presentation throttling.

Use three presentation levels.

- Ordinary reporting goes to the ticker and news history. Group nearby shelter orders and repeated snowfall reports into regional summaries.
- Major developments get a brief nonmodal banner. Examples include first confirmed detection, meaningful landfall, first violent tornado, or crews establishing significant containment.
- Opening and final reports use the existing deliberate report flow. Upgrade purchases get feedback within Evolve.

Start with one ordinary ticker item every eight to twelve real seconds, a major-banner cooldown of at least thirty real seconds, and a maximum of two nonterminal major banners per minute. Use presentation time so 4× does not quadruple interruptions. Keep banner dwell time around six to eight seconds. Pause rotation while the player is reading the history or another dialog. Final results take priority over the queue.

Deduplicate by event type and locality. Combine snowfall milestones crossed during one update into the highest current milestone. When several places cross milestones together, report the regional maximum or a short grouped summary. Ordinary tornado drops should normally receive immediate map/action feedback and a history entry. Reserve major banners for genuinely exceptional drops or outcomes.

Use a bounded history of roughly 200 structured items, preserving opening, major milestones, and final summaries. Keep leaderboard/replay data separately. The current twelve-item news history is insufficient for a long run. Default live announcements to polite accessibility behavior and avoid repeated screen-reader interruptions.

Add concise Settings choices for Standard news, Major alerts only, and Quiet. Migrate the current breaking-news boolean. Respect the player’s quiet preference. Test a dense thunderstorm outbreak and a long blizzard at 4× to verify the real-time notification budget.

## 6. Basic sound effects

Add original lightweight effects for button confirmation, upgrade purchase, confirmed removal, pickup collection, ability activation/tornado touchdown, a major bulletin, and the final result. Use short synthesized Web Audio effects or small properly licensed files with attribution. Favor restrained wind, radio, and weather textures. Keep sound tied to actions and meaningful events.

Create or resume the audio context from a player gesture such as Play. Browsers restrict autoplay. Use one audio manager, a master volume, an effects volume, and mute. Persist settings and provide an easy sound toggle in pause/settings. Suspend or fade audio when the tab is hidden. Audio failure must not interrupt gameplay. [MDN autoplay guidance](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

Use a modest default volume, a maximum of four simultaneous effects, and cooldowns for repeated sounds. Purchase/removal effects fire after the operation succeeds. Canceling removal has only ordinary UI feedback. Major-news audio follows the same throttled presentation event as the banner. At 4×, sound timing and pitch remain comfortable and effects do not queue into a long backlog.

Verify muted startup, browser autoplay rejection, volume persistence, rapid repeated actions, mobile playback, and cancellation. Preserve visual equivalents for all audio cues.

## 7. Languages

Ship complete English, French, and Spanish catalogs in the first release. These are initial choices for this brief. Use locale keys such as `en`, `fr`, and `es`, with English fallback and a Settings selector labeled in each language’s own name. Use the supported browser locale on first launch, then honor the saved choice.

Extract strings from menus, upgrade names/descriptions, live stats, errors, accessibility labels, news, confirmations, final reports, leaderboard flows, and settings. Introduce stable message keys with named parameters and plural handling. Keep event and upgrade IDs independent of translated labels. English event IDs can remain internal for existing saves and API compatibility.

Use locale-aware dates, times, lists, numbers, and plural rules. Preserve the game’s dollar denomination while localizing amounts and large-number words. Keep units as a separate player preference. Store UTC timestamps/elapsed quantities and raw numeric values, then format for the selected language. Recreate or cache formatters by locale when language changes. [MDN Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)

Render user names, storm names, and location parameters as escaped text. Allow Unicode names. Leave real place names in the data’s native form unless a supported translation exists. Prefer whole message templates over stitched fragments so French and Spanish grammar can differ naturally.

Test longer translations at 320px width and enlarged text, including the five-event picker and connected upgrade trees. Check missing keys, plural forms, keyboard labels, live language switching, and loading older settings. Mark translations as provisional in the implementation report until reviewed by fluent speakers.

## 8. Shared leaderboards

### Submission and browsing

Add Leaderboards to the main menu and Submit score to the completed-run summary for every active event. Preserve access to Explore damage. Submission is an explicit player action. Show the exact run, event, difficulty, score, and editable display name before sending it. Remember the last chosen name locally, support roughly 2–24 Unicode characters, reject empty/control-only names, and render names as plain text.

Show submitting, verification pending, accepted with rank, and actionable retry/error states. Prevent duplicate clicks from creating duplicate entries. If offline, retain a pending submission with the exact immutable run and explicit user intent. Retrying sends the same run ID. A rejected submission must retain the reason and the player’s local result.

Display names are labels. Use a separate server-generated player/guest identity so two people choosing the same name do not overwrite one another. Append a short identifier in the UI when needed. Permit the same player to choose a different display name for a later run. If cross-device identity is added, use an explicit account or recovery mechanism.

### Boards and metrics

Provide a compact filterable screen with event, difficulty, metric, time period, and challenge/free-placement filters. Start with Damage as the default. Offer all-time-within-version and monthly results, plus daily or weekly fixed-seed challenges. Region filters describe origin or affected geography explicitly.

| Scope | Useful rankings |
| --- | --- |
| Every event | Property damage, deaths, injuries, unique settlements affected, modeled lifetime |
| Tornado | Ground path length, peak damage width, area swept at EF3+, longest continuous ground track |
| Hurricane | Wind damage, surge damage, rainfall/flood damage, peak sustained wind, time at major-hurricane strength, affected land area |
| Blizzard | Peak snowfall, land area above a published snowfall threshold, longest whiteout, snow-related damage |
| Thunderstorm | Tornado count, combined tornado ground path, tornado damage, strongest individual tornado, longest individual tornado track, hail damage, flood damage, largest simultaneous outbreak |
| Wildfire | Unique burned area, fire damage, verified spot ignitions, largest active perimeter area, burning duration |
| Overall mastery | Sum of best current-version campaign stars across five events and four difficulties, maximum 100 |

Define units and eligibility for each metric. Track individual tornado records even after they expire. Peak intensity boards may have many ties, so use an appropriate secondary metric such as duration at that intensity, then submission time and run ID for stable ordering. Lifetime is a dedicated metric, not a bonus added indiscriminately to damage.

Show only relevant metrics for the selected event. Implement hazard attribution during damage application so per-hazard leaderboards are measured rather than guessed. Attribute only the incremental loss actually added after caps. Individual funnel attribution must not inflate combined storm loss.

Keep separate event/difficulty/version partitions. Raw all-event dollar totals would be dominated by wide-footprint disasters. The mastery board aggregates stars across verified runs for one player identity. Sandbox sharing can use a labeled experimental gallery with no contribution to mastery or campaign rankings.

### Store individual run results

Add a serializable immutable `RunSummary` produced at natural completion. Include run ID, player ID after submission, display name snapshot, event, subtype/pattern, difficulty, mode, seed, coordinates, storm name, start timestamp, simulation duration, game/balance/data versions, damage, deaths, injuries, stars, ending cause, event-specific metrics, and replay reference/hash.

Freeze it when the simulation ends. Exploring the final map, changing language, retrying, or submitting must not modify it. Existing merged personal bests remain personal-best data. Backfill global scores only when a complete historical run can actually be verified.

### Backend and verification

GitHub Pages serves static files, so shared writes require an external API and database. A reasonable default is a small Cloudflare Worker API with D1 storage, usable by both the GitHub Pages and Sites frontends. Confirm available account access and actual execution limits before provisioning. Reuse an appropriate existing service if available. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/)

Use tables for players, issued runs, submissions, verified run metrics, and challenge definitions. Index leaderboard filters and score ordering. Store large replays in suitable object storage when needed. Keep credentials and administrative capabilities server-side. Use prepared statements, bounded requests, rate limits, exact allowed frontend origins, and safe rendering of display names. Origin checks alone do not authenticate a submission.

Suggested API flow is `POST /runs/start`, `POST /runs/{id}/submit`, `GET /submissions/{id}`, and `GET /leaderboards`. Starting a competitive run returns a server-issued ID, rules version, seed, origin/challenge constraints, and a token bound to the player session. For freely placed runs, issuance happens after the player confirms placement. Daily challenges use server-defined fixed starts and seeds.

Record commands as tick, sequence, action, and validated parameters. Include purchases, confirmed removals, pickups, abilities, steering, and any gameplay-affecting choice. The server reconstructs the run with the pinned simulation and datasets and calculates its own result. Validate affordability, prerequisites, cooldowns, target bounds, command ordering, natural ending, and Sandbox exclusion. A checksum generated by the same untrusted browser is insufficient proof.

Replay verification detects impossible outcomes and tampering with submitted totals. It does not prove human play or prevent an optimizer from generating a legal command sequence. Describe competitive claims accordingly. Limit concurrent issued runs and submission frequency without disrupting ordinary retries.

Measure replay cost before choosing synchronous verification. If complete replays exceed the API host’s execution budget, use a bounded background verifier and explicit pending status. Enforce command, tick, memory, and replay-size limits with defined rejection reasons. Unusually long valid runs need a supported verification path. Avoid silently truncating their results.

Use a unique run ID/idempotency constraint and an atomic acceptance operation so network retries cannot award multiple scores. Show each player’s best eligible run per selected board, with a separate run-history view. Store server timestamps. Freeze older balance seasons and open a new version when scoring changes. Test both deployed origins against the same database.

If backend credentials or provisioning access are unavailable, finish the client, API implementation, schema, migrations, and tests and report the exact deployment dependency. Treat shared cross-device submission as incomplete until it works against the real service.

## Acceptance checks and delivery

Use the existing tests as the starting point. Update assertions intentionally changed by the new economy and campaign rules. Add focused regression coverage for the following behavior.

- At least two useful early purchases per event on viable Medium starts, continued late income, and reachable specialization capstones.
- Stable game outcomes for identical commands across playback speeds, pauses, browser/server execution, and locale changes.
- Weak initial tornadoes, bounded population/assets, safe overlapping impacts, natural expiration, and warm-water hurricane recovery.
- Preserved random tornado drops, valid precision targeting, independent paths, fair steering costs, and a strong visible reward for successful placement.
- Gradual wildfire suppression and tested long blizzard routes with the relevant upgrades.
- Notification and audio cooldowns at 1× and 4×, aggregation under heavy activity, quiet/mute preferences, and readable localized reports.
- Submission confirmation, custom Unicode display names, forged scores, invalid commands, duplicate retries, concurrent submissions, stale versions, offline retry, and safe name rendering.
- Sandbox isolation, old personal-record migration, coherent per-run summaries, and preservation of the existing removal confirmation.

Run `npm run typecheck`, the appropriate unit suite, targeted Playwright flows, the production build, and a GitHub Pages base-path build. Exercise a real submission from one browser and read it from a separate browser/device. Confirm the deployed frontend and leaderboard API versions match. Performance-test the maximum supported tornado outbreak, large wildfire, and long snowfall map on a representative phone.

Deliver the code, documented final tuning values, the before/after balance report, backend schema and deployment instructions, replay/leaderboard threat limitations, translation coverage, sound asset provenance, and working release links. Report which changes were verified by automated simulation and which received human playtesting. The player should experience the familiar Stormwake game with more understandable decisions, better-paced upgrades, fewer interruptions, and shareable results.
