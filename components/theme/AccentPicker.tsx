'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from './ThemeProvider'
import { ACCENT_COLORS } from '@/lib/theme.config'
import type { AccentColor } from '@/types/database'

interface AccentPickerProps {
  className?: string
}

export function AccentPicker({ className }: AccentPickerProps) {
  const { accent, setAccent } = useTheme()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {(Object.values(ACCENT_COLORS) as { value: AccentColor; label: string; preview: string }[]).map((config) => (
        <button
          key={config.value}
          onClick={() => setAccent(config.value)}
          title={config.label}
          aria-label={`Switch to ${config.label} accent`}
          className={cn(
            'relative h-7 w-7 rounded-full transition-all duration-150',
            'ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2',
            accent === config.value && 'ring-2 ring-[hsl(var(--accent))] scale-110'
          )}
          style={{ backgroundColor: config.preview }}
        >
          {accent === config.value && (
            <Check
              className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow"
              strokeWidth={3}
            />
          )}
        </button>
      ))}
    </div>
  )
}