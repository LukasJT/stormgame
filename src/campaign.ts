import type { Difficulty } from './sim'
import type { Storm } from './world'

export const campaign = ['Tornado', 'Hurricane', 'Blizzard', 'Thunderstorm', 'Wildfire'] as const
export type CampaignEvent = typeof campaign[number]
export const difficulties: Difficulty[] = ['Easy', 'Normal', 'Hard', 'Expert']

export const difficultyLabel = (difficulty: Difficulty) => difficulty === 'Normal' ? 'Medium' : difficulty

// Damage benchmarks for stars two through five, in millions of dollars.
const targets: Record<CampaignEvent, Record<Difficulty, readonly [number, number, number, number]>> = {
  Tornado: {
    Easy: [160, 480, 1050, 1750], Normal: [120, 400, 850, 1400], Hard: [90, 300, 675, 1200], Expert: [65, 225, 540, 1000],
  },
  Hurricane: {
    Easy: [3500, 18000, 60000, 100000], Normal: [4000, 22000, 65000, 110000],
    Hard: [4500, 25000, 70000, 115000], Expert: [5000, 27000, 74000, 120000],
  },
  Blizzard: {
    Easy: [120, 1000, 5500, 18000], Normal: [85, 750, 4500, 15000],
    Hard: [70, 600, 3900, 13000], Expert: [55, 475, 3200, 11000],
  },
  Thunderstorm: {
    Easy: [120, 2500, 17000, 44000], Normal: [75, 950, 6500, 18000],
    Hard: [55, 620, 4200, 12000], Expert: [40, 440, 3100, 9000],
  },
  Wildfire: {
    Easy: [1800, 8500, 55000, 190000], Normal: [1600, 6000, 40000, 145000],
    Hard: [1100, 4200, 26000, 100000], Expert: [850, 3500, 20000, 80000],
  },
}

export function damageTargets(storm: CampaignEvent, difficulty: Difficulty) {
  return targets[storm][difficulty].map(target => Math.round(target * 1_000_000))
}

export function earnedStars(storm: CampaignEvent, difficulty: Difficulty, damage: number, completed: boolean) {
  return completed ? 1 + damageTargets(storm, difficulty).filter(target => damage >= target).length : 0
}

export function isCampaignEvent(storm: Storm): storm is CampaignEvent {
  return campaign.some(event => event === storm)
}
