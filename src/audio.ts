import { settings } from './profile'

const effects = {
  confirm: [440, 590, .10],
  purchase: [440, 880, .19],
  removal: [440, 280, .14],
  pickup: [660, 990, .18],
  ability: [180, 72, .28],
  news: [310, 450, .23],
  finish: [350, 175, .50],
} as const
let context: AudioContext | undefined
let voices = 0
const lastPlayed = new Map<keyof typeof effects, number>()

export function enableAudio() {
  if (document.hidden || settings.muted || typeof AudioContext === 'undefined') return
  try {
    context ??= new AudioContext()
    if (context.state !== 'running') void context.resume().catch(() => {})
  } catch { /* Audio is optional. */ }
}

export function hideAudio() {
  if (context?.state === 'running') void context.suspend().catch(() => {})
}

export function playSound(effect: keyof typeof effects) {
  if (!context || context.state !== 'running' || document.hidden || settings.muted || voices >= 4) return
  const now = context.currentTime
  const volume = settings.masterVolume * settings.effectsVolume * .17
  if (!volume || now - (lastPlayed.get(effect) ?? -Infinity) < .14) return
  lastPlayed.set(effect, now)
  const [start, end, duration] = effects[effect]
  const tone = context.createOscillator()
  const gain = context.createGain()
  tone.type = effect === 'ability' ? 'triangle' : 'sine'
  tone.frequency.setValueAtTime(start, now)
  tone.frequency.exponentialRampToValueAtTime(end, now + duration)
  gain.gain.setValueAtTime(.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(.0001, volume), now + .025)
  gain.gain.exponentialRampToValueAtTime(.0001, now + duration)
  tone.connect(gain).connect(context.destination)
  voices++
  tone.onended = () => { voices--; tone.disconnect(); gain.disconnect() }
  tone.start()
  tone.stop(now + duration)
}
