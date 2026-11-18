"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { Dialog as DialogPrimitive } from "radix-ui"
import { CheckIcon, SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// shadcn's Command (radix-nova), adapted: cn from @/lib/utils, Lucide icons,
// a plain input wrapper (the project has no input-group), item highlights
// like the dropdown menu's, and a dialog with no open/close animation.

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

// The command menu's dialog: dialog.tsx's look (the same data-slot hooks, so
// each theme's dialog rules apply) without its fade and zoom. It's opened by
// a keyboard shortcut, many times a day, so it appears and disappears at
// once.
function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root> & {
  title?: string
  description?: string
  className?: string
}) {
  // Radix returns focus to its Dialog.Trigger on close, and this dialog has
  // none (a shortcut or a button elsewhere opens it), so it would drop focus
  // on the page. Remember what had focus as it opens, before Radix moves
  // focus inside (a layout effect runs first), and give it back on close.
  const returnFocusRef = React.useRef<Element | null>(null)
  React.useLayoutEffect(() => {
    if (props.open) returnFocusRef.current = document.activeElement
  }, [props.open])

  return (
    <DialogPrimitive.Root data-slot="dialog" {...props}>
      <DialogPrimitive.Portal data-slot="dialog-portal">
        <DialogPrimitive.Overlay
          data-slot="dialog-overlay"
          className="fixed inset-0 z-50 bg-background"
        />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          onCloseAutoFocus={(e) => {
            const el = returnFocusRef.current
            if (el instanceof HTMLElement && el.isConnected && el !== document.body) {
              e.preventDefault()
              el.focus()
            }
          }}
          className={cn(
            "fixed top-[12dvh] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] overflow-hidden rounded-lg border bg-card p-0 shadow-lg sm:max-w-xl",
            className
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
          {children}
          {/* At the input row's right end: phones have no Escape key. */}
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-3.5 right-3 rounded-xs text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden after:absolute after:-inset-3 [&_svg]:size-4"
          >
            <XIcon aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      // pr-11 leaves room for the dialog's close button.
      className="flex h-12 items-center gap-2 border-b border-border pr-11 pl-3"
    >
      <SearchIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "flex h-full w-full min-w-0 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[min(24rem,60dvh)] scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain outline-none scrollbar-thin",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:text-[10px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:**:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon
        aria-hidden="true"
        className="ml-auto hidden group-data-[checked=true]/command-item:block"
      />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
