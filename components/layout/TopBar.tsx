'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background">
      <Button
        variant="ghost"
        size="icon"
        className="relative md:hidden after:absolute after:-inset-1.5"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>
      <div />
    </header>
  )
}
