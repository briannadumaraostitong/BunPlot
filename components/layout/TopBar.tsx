'use client'

import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { AccentPicker } from '@/components/theme/AccentPicker'
import { Separator } from '@/components/ui/separator'

export function TopBar() {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background">
      <div />
      <div className="flex items-center gap-2">
        <AccentPicker />
        <Separator orientation="vertical" className="h-5" />
        <ThemeToggle />
      </div>
    </header>
  )
}