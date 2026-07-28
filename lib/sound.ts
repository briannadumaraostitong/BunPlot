const SOUND_ENABLED_KEY = 'plottr-sound-enabled'
const SOUND_VOLUME_KEY = 'plottr-sound-volume'

export const DEFAULT_SOUND_ENABLED = true
export const DEFAULT_SOUND_VOLUME = 70

let clickAudio: HTMLAudioElement | null = null

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return DEFAULT_SOUND_ENABLED
  const stored = localStorage.getItem(SOUND_ENABLED_KEY)
  return stored === null ? DEFAULT_SOUND_ENABLED : stored === 'true'
}

export function getSoundVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_SOUND_VOLUME
  const stored = localStorage.getItem(SOUND_VOLUME_KEY)
  return stored === null ? DEFAULT_SOUND_VOLUME : Number(stored)
}

export function setSoundPreference(enabled: boolean, volume: number) {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
  localStorage.setItem(SOUND_VOLUME_KEY, String(volume))
}

export function playClickSound() {
  if (typeof window === 'undefined' || !isSoundEnabled()) return
  if (!clickAudio) clickAudio = new Audio('/sounds/click.mp3')
  clickAudio.volume = getSoundVolume() / 100
  clickAudio.currentTime = 0
  clickAudio.play().catch((err) => console.error('[sound] playback failed:', err))
}
