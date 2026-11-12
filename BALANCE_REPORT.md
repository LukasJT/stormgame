# Stormwake balance pilot

The starting reference was commit `e3ca839`. The headless pilot ran two starts, two seeds, and two policies on Medium for each of the five events. That gives 40 forecasts for the baseline and 40 for the first tuning pass. This is a small directional sample of scripted play. The repository includes a larger runner through `node scripts/balance.mjs --full`, with an optional `--event=Blizzard` filter. The full matrix and human playtesting remain outstanding.

The adaptive policy chooses upgrades by event-relevant effects, collects weather pickups, and uses available abilities periodically. Actual players may save abilities for more valuable positions, take different branches, or choose different routes. Earnings below include collected pickups, damage bonuses, and unspent Momentum. One tick equals a second at 1×.

| Event | Baseline adaptive mean ticks / earned | First tuning pass mean ticks / earned |
| --- | ---: | ---: |
| Tornado | 960 / 177.8 | 960 / 178.5 |
| Hurricane | 1,014 / 182.3 | 1,100 / 191.0 |
| Blizzard | 1,485 / 50.5 | 2,644 / 277.0 |
| Thunderstorm | 1,615 / 181.8 | 1,650 / 232.2 |
| Wildfire | 1,208 / 193.0 | 1,252 / 205.8 |

Two of the initial tuned Blizzard runs reached the pilot limit of 3,600 ticks, so the tuned Blizzard row contains censored lifetimes. Gradual late depletion brought the next four adaptive runs to 1,380–1,441 ticks, with 187–192 points and $50–151 million in damage. Blizzard retains lake-fed recovery before the late decline. The shorter routes sampled are sensitive to upgrades and geography, so the revised Blizzard thresholds need more strong and weak routes in the sample.

In the first tuning pass all four adaptive Hurricane runs cleared the old five-star line, with $64.6–92.4 billion damage. Medium’s revised two-through-five-star thresholds are $4B, $22B, $65B, and $110B. The revised thresholds are provisional across all difficulties. Expert has its own targets. Passive runs generally stayed at one star in the pilot.

The simulation now keeps upgrade prices independent of purchase count. The primary economic changes are 12 starting Blizzard points, a more frequent Blizzard schedule, and seeded late rewards for every event. Fixed difficulty multipliers are 1.00, 1.10, 1.20, and 1.35. Shelter baselines are 0%, 50%, 80%, and 92%. Point values and eligibility remain the same at every playback speed.

The release also adds storm actions and score attribution. The pilot predates the final funnel shoreline attribution and hurricane wind/rain split. Use fresh runs for a final percentile study. Keep per-difficulty results distinct and inspect censored forecasts separately. Prioritize varied human starts, strategic ability timing, and the strongest builds on each hazard before claiming five-star calibration.
