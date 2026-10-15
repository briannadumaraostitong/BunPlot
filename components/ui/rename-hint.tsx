'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Hover hint for labels that rename on double-click. Shows the full name
// (these labels truncate) above the gesture. The delay overrides the
// provider's 0 so hints don't flash as the pointer crosses headers and
// sidebars. The child must accept a ref and props (a plain element is fine).
export function RenameHint({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="flex-col items-start gap-0.5">
        <span className="font-medium">{name}</span>
        <span className="text-[11px] text-background/70">Double-click to rename</span>
      </TooltipContent>
    </Tooltip>
  )
}
