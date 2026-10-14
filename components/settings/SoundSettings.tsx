'use client'

import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { updateProfile } from '@/actions/profile'
import { reportResult, settle } from '@/lib/notify'
import { setSoundPreference } from '@/lib/sound'
import type { Profile } from '@/types/database'

interface SoundSettingsProps {
  profile: Profile
}

export function SoundSettings({ profile }: SoundSettingsProps) {
  const [enabled, setEnabled] = useState(profile.sound_enabled)
  const [volume, setVolume] = useState(profile.sound_volume)

  // Keeps this device's localStorage (what lib/sound.ts actually reads
  // when playing a click) in sync with the DB value whenever Settings
  // loads — covers the case where the preference was last changed on
  // another device.
  useEffect(() => {
    setSoundPreference(profile.sound_enabled, profile.sound_volume)
  }, [profile.sound_enabled, profile.sound_volume])

  function handleEnabledChange(next: boolean) {
    setEnabled(next)
    setSoundPreference(next, volume)
    // Toast only: the setting already applies on this device (localStorage);
    // a failed save only means other devices won't pick it up. Fixed id so
    // repeated toggles show one toast.
    settle(updateProfile({ sound_enabled: next })).then((result) =>
      reportResult(result, "Couldn't save the click sound setting. It still applies on this device.", {
        id: 'sound-enabled',
      })
    )
  }

  // Fires on every tick while dragging — keeps the slider position and the
  // sound's actual volume responsive without hitting the database per-tick.
  function handleVolumeChange(next: number) {
    setVolume(next)
    setSoundPreference(enabled, next)
  }

  // Fires once the drag (or keyboard adjustment) settles — this is the only
  // point the volume is persisted to the profiles row.
  function handleVolumeCommit(next: number) {
    settle(updateProfile({ sound_volume: next })).then((result) =>
      reportResult(result, "Couldn't save the volume. It still applies on this device.", {
        id: 'sound-volume',
      })
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between max-w-sm">
        <span className="text-sm font-medium">Click Sound</span>
        <Switch checked={enabled} onCheckedChange={handleEnabledChange} />
      </div>

      <div className="flex items-center justify-between max-w-sm gap-4">
        <span className="text-sm font-medium">Volume</span>
        <Slider
          className="w-32"
          min={0}
          max={100}
          step={5}
          disabled={!enabled}
          value={[volume]}
          onValueChange={([v]) => handleVolumeChange(v)}
          onValueCommit={([v]) => handleVolumeCommit(v)}
        />
      </div>
    </div>
  )
}
