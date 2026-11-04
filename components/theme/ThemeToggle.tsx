'use client'

import { Moon, Sun, Monitor, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from './ThemeProvider'
import { getTheme, type ThemeSetting } from '@/lib/themes'

const SYNC_OPTION: { value: ThemeSetting; label: string; icon: React.ComponentType<{ className?: string }> } = {
  value: 'sync', label: 'System', icon: Monitor,
}

const LIGHT_THEME_OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: 'classic-light', label: 'Classic Light' },
]

const DARK_THEME_OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: 'classic-dark', label: 'Classic Dark' },
  { value: 'cyberpunk',    label: 'Cyberpunk' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary after:absolute after:-inset-1.5"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="h-4 w-4 hidden dark:block" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-52 rounded-xl p-1 bg-popover border border-border shadow-xl max-h-96 overflow-y-auto scrollbar-thin"
        style={{ backgroundColor: 'hsl(var(--popover))' }}
      >
        <DropdownMenuItem
          onClick={() => setTheme(SYNC_OPTION.value)}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer text-popover-foreground focus:bg-secondary focus:text-foreground"
          style={{ backgroundColor: 'transparent' }}
        >
          <Monitor className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>{SYNC_OPTION.label}</span>
          {theme === SYNC_OPTION.value && (
            <Check className="h-3 w-3 ml-auto text-primary" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuLabel className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Light
        </DropdownMenuLabel>
        {LIGHT_THEME_OPTIONS.map(({ value, label }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer text-popover-foreground focus:bg-secondary focus:text-foreground"
            style={{ backgroundColor: 'transparent' }}
          >
            <ThemeSwatch id={value} />
            <span>{label}</span>
            {theme === value && (
              <Check className="h-3 w-3 ml-auto text-primary" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuLabel className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Dark
        </DropdownMenuLabel>
        {DARK_THEME_OPTIONS.map(({ value, label }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer text-popover-foreground focus:bg-secondary focus:text-foreground"
            style={{ backgroundColor: 'transparent' }}
          >
            <ThemeSwatch id={value} />
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

function ThemeSwatch({ id }: { id: ThemeSetting }) {
  const theme = id === 'sync' ? null : getTheme(id)
  const accent = theme?.tokens['--accent']
  return (
    <span
      className="h-3.5 w-3.5 shrink-0 rounded-full border border-border"
      style={{ backgroundColor: accent ? `hsl(${accent})` : undefined }}
    />
  )
}
