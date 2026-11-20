'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// A password field with an eye button at its right that shows or hides what's
// typed. The button never submits (type="button"), keeps one label ("Show
// password") with aria-pressed carrying the state, and takes the theme's
// focus ring from the keyboard. Clicked or tapped, it doesn't take focus, so
// the caret (and a phone's keyboard) stays in the field, and the selection is
// put back after the type change, which can move it. Its tap target reaches
// 44px tall past the field's 32px. The field keeps every attribute it's given
// (autocomplete included), with room on the right so the text never runs
// under the eye, and Edge's own reveal button hidden so there aren't two.
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [shown, setShown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const selection = useRef<{ start: number | null; end: number | null } | null>(null)

  // After the type changes, put the caret or selection back where it was.
  useLayoutEffect(() => {
    const input = inputRef.current
    const saved = selection.current
    selection.current = null
    if (input && saved && document.activeElement === input) input.setSelectionRange(saved.start, saved.end)
  }, [shown])

  function toggle() {
    const input = inputRef.current
    if (input && document.activeElement === input) selection.current = { start: input.selectionStart, end: input.selectionEnd }
    setShown((value) => !value)
  }

  return (
    <div className="relative">
      <Input ref={inputRef} type={shown ? 'text' : 'password'} className={cn('pr-9 [&::-ms-reveal]:hidden', className)} {...props} />
      <button
        type="button"
        aria-label="Show password"
        aria-pressed={shown}
        // Keeps focus (and the caret) in the field when clicked or tapped.
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggle}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors after:absolute after:-inset-x-1.5 after:-inset-y-1.5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {shown ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
      </button>
    </div>
  )
}
