'use client'

import { useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DOCUMENT_FONTS, documentFontStack, toDocumentFont, type DocumentFont } from '@/lib/documentFonts'

// The outline toolbar's font dropdown, Docs style: shows the selection's font
// (null when it's mixed), and each choice in its own typeface.
export function FontPicker({ value, onChange }: { value: DocumentFont | null; onChange: (font: DocumentFont) => void }) {
  // Set when a font is picked, so closing leaves focus in the editor (where
  // onChange puts it) instead of Radix returning it to the trigger. Escape
  // or a click outside still returns it.
  const picked = useRef(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Font"
          aria-label={`Font: ${value ?? 'mixed'}`}
          className="relative flex h-7 w-28 shrink-0 items-center justify-between gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground aria-expanded:bg-secondary aria-expanded:text-foreground after:absolute after:-inset-1"
        >
          <span className="truncate" style={value ? { fontFamily: documentFontStack(value) } : undefined}>
            {value ?? 'Mixed'}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-auto whitespace-nowrap"
        onCloseAutoFocus={(e) => {
          if (picked.current) e.preventDefault()
          picked.current = false
        }}
      >
        <DropdownMenuRadioGroup
          value={value ?? ''}
          onValueChange={(next) => {
            const font = toDocumentFont(next)
            if (!font) return
            picked.current = true
            onChange(font)
          }}
        >
          {DOCUMENT_FONTS.map(({ name }) => (
            <DropdownMenuRadioItem key={name} value={name} style={{ fontFamily: documentFontStack(name) }}>
              {name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
