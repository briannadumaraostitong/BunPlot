'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from '@/actions/profile'
import { settle } from '@/lib/notify'
import type { Profile } from '@/types/database'

interface ProfileFormProps {
  profile: Profile
  email: string
}

export function ProfileForm({ profile, email }: ProfileFormProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const dirty = displayName.trim() !== (profile.display_name ?? '')

  async function handleSave() {
    setLoading(true)
    setError(null)
    setSaved(false)

    const result = await settle(updateProfile({ display_name: displayName.trim() }))

    if (result && 'error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    setLoading(false)
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1.5">
          <Label htmlFor="display-name" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Display Name
          </Label>
          <Input
            id="display-name"
            className="bg-background max-w-xs"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value)
              setSaved(false)
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Email
        </Label>
        <Input
          className="bg-background max-w-xs"
          value={email}
          disabled
          readOnly
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={loading || !dirty}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Changes'}
        </Button>
        {saved && !dirty && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3 w-3" />
            Saved
          </span>
        )}
      </div>
    </div>
  )
}
