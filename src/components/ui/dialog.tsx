'use client'

import * as React from 'react'
import { Dialog as RadixDialog } from 'radix-ui'

import { cn } from '@/lib/utils'
import { icons } from '@/lib/design/icons'

const Dialog = RadixDialog.Root
const DialogTrigger = RadixDialog.Trigger
const DialogPortal = RadixDialog.Portal
const DialogClose = RadixDialog.Close

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof RadixDialog.Overlay>) {
  return (
    <RadixDialog.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  )
}

type DialogContentProps = React.ComponentProps<typeof RadixDialog.Content> & {
  hideClose?: boolean
}

function DialogContent({
  className,
  children,
  hideClose = false,
  ...props
}: DialogContentProps) {
  const X = icons.x
  return (
    <DialogPortal>
      <DialogOverlay />
      <RadixDialog.Content
        className={cn(
          'border-border-default bg-surface text-text fixed z-50 overflow-y-auto border',
          // Mobile (<sm): full-screen sheet con safe-area inferior.
          'inset-0 w-full max-w-none rounded-none p-5',
          // Desktop (>=sm): modal centrado.
          'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[560px] sm:max-w-[calc(100vw-32px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[16px] sm:p-6',
          'sm:max-h-[calc(100vh-64px)]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:sm:zoom-out-95 data-[state=open]:sm:zoom-in-95',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          'sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0',
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <RadixDialog.Close
            className="text-text-tertiary hover:text-text absolute right-4 top-4 rounded-md p-1 transition-colors"
            aria-label="Cerrar"
          >
            <X strokeWidth={1.5} className="h-4 w-4" />
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </DialogPortal>
  )
}

function DialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-col gap-1.5 pb-6', className)} {...props} />
  )
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof RadixDialog.Title>) {
  return (
    <RadixDialog.Title
      className={cn(
        'text-text text-[18px] font-semibold tracking-[-0.01em]',
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof RadixDialog.Description>) {
  return (
    <RadixDialog.Description
      className={cn('text-text-secondary text-sm leading-relaxed', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
