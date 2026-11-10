import type { Difficulty } from './sim'
import type { Storm } from './world'

export const campaign = ['Tornado', 'Hurricane', 'Blizzard', 'Thunderstorm', 'Wildfire', 'Dust Storm', 'Heat Dome'] as const
export type CampaignEvent = typeof campaign[number]
export const difficulties: Difficulty[] = ['Easy', 'Normal', 'Hard', 'Expert']

export const difficultyLabel = (difficulty: Difficulty) => difficulty === 'Normal' ? 'Medium' : difficulty

// Damage benchmarks for stars two through five, in millions of dollars.
const targets: Record<CampaignEvent, Record<Exclude<Difficulty, 'Expert'>, readonly [number, number, number, number]>> = {
  Tornado: {
    Easy: [160, 480, 1050, 1750], Normal: [120, 400, 850, 1400], Hard: [90, 300, 675, 1200],
  },
  Hurricane: {
    Easy: [1800, 5500, 11000, 22000], Normal: [2100, 6100, 12000, 24000], Hard: [2600, 6800, 13000, 26000],
  },
  Blizzard: {
    Easy: [6000, 22000, 70000, 225000], Normal: [3500, 12500, 68000, 170000], Hard: [800, 4300, 32000, 85000],
  },
  Thunderstorm: {
    Easy: [120, 2500, 17000, 44000], Normal: [30, 800, 6500, 18000], Hard: [12, 170, 1200, 5700],
  },
  Wildfire: {
    Easy: [.5, 5, 30, 100], Normal: [.3, 2.5, 10, 50], Hard: [.2, 1.4, 4, 15],
  },
  'Dust Storm': {
    Easy: [3500, 5500, 16500, 16976], Normal: [2800, 4500, 9000, 16976], Hard: [2300, 3200, 6500, 16600],
  },
  'Heat Dome': {
    Easy: [91000, 93000, 97000, 100000], Normal: [85000, 92000, 97000, 99500], Hard: [18000, 55000, 75000, 94000],
  },
}

export function damageTargets(storm: CampaignEvent, difficulty: Difficulty) {
  return targets[storm][difficulty === 'Expert' ? 'Hard' : difficulty].map(target => Math.round(target * 1_000_000))
}

export function earnedStars(storm: CampaignEvent, difficulty: Difficulty, damage: number, completed: boolean) {
  return completed ? 1 + damageTargets(storm, difficulty).filter(target => damage >= target).length : 0
}

export function isCampaignEvent(storm: Storm): storm is CampaignEvent {
  return campaign.some(event => event === storm)
}
