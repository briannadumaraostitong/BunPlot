'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from './ThemeProvider'
import type { AccentColor } from '@/types/database'

const ACCENTS: { value: AccentColor; label: string; preview: string }[] = [
  { value: 'blue',    label: 'Ocean Blue', preview: '#3B82F6' },
  { value: 'purple',  label: 'Violet',     preview: '#8B5CF6' },
  { value: 'emerald', label: 'Emerald',    preview: '#10B981' },
]

const ACCENT_VARS: Record<AccentColor, Record<string, string>> = {
  blue: {
    '--accent':        '217 91% 60%',
    '--accent-hover':  '217 91% 53%',
    '--accent-muted':  '217 91% 95%',
    '--accent-border': '217 91% 80%',
  },
  purple: {
    '--accent':        '262 83% 63%',
    '--accent-hover':  '262 83% 56%',
    '--accent-muted':  '262 83% 96%',
    '--accent-border': '262 83% 80%',
  },
  emerald: {
    '--accent':        '158 64% 46%',
    '--accent-hover':  '158 64% 39%',
    '--accent-muted':  '158 64% 95%',
    '--accent-border': '158 64% 75%',
  },
}

interface AccentPickerProps {
  className?: string
}

export function AccentPicker({ className }: AccentPickerProps) {
  const { accent, setAccent } = useTheme()

  function handleAccentChange(value: AccentColor) {
    const root = document.documentElement
    const vars = ACCENT_VARS[value]
    Object.entries(vars).forEach(([key, val]) => {
      root.style.setProperty(key, val)
    })
    root.setAttribute('data-accent', value)
    localStorage.setItem('plottr-accent', value)
    setAccent(value)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {ACCENTS.map((config) => (
        <button
          key={config.value}
          onClick={() => handleAccentChange(config.value)}
          title={config.label}
          aria-label={`Switch to ${config.label} accent`}
          suppressHydrationWarning
          className={cn(
            'relative h-7 w-7 rounded-full transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 ring-offset-2 ring-offset-background',
            accent === config.value && 'ring-2 scale-110'
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