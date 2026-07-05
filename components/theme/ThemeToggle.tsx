'use client'

import { Moon, Sun, Monitor, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from './ThemeProvider'
import type { AppTheme } from '@/types/database'

const THEME_OPTIONS: {
  value: AppTheme
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: 'light',  label: 'Light',  icon: Sun },
  { value: 'dark',   label: 'Dark',   icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="h-4 w-4 hidden dark:block" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-32 rounded-xl p-1 bg-popover border border-border shadow-xl"
        style={{ backgroundColor: 'hsl(var(--popover))' }}
      >
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer text-popover-foreground focus:bg-secondary focus:text-foreground"
            style={{ backgroundColor: 'transparent' }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>{label}</span>
            {theme === value && (
              <Check className="h-3 w-3 ml-auto text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}