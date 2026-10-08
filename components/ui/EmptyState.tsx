'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
    icon?: LucideIcon
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground rounded-lg border border-border shadow-sm dark:shadow-none p-10 sm:p-14 text-center flex flex-col items-center justify-center',
        className
      )}
    >
      {/* Icon with soft badge container */}
      <div className="relative mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
          <Icon className="h-8 w-8 stroke-[1.8]" />
        </div>
      </div>

      {/* Heading & description */}
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
        {description}
      </p>

      {/* Action buttons */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {action &&
            (action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
              >
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </button>
            ))}

          {secondaryAction &&
            (secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-input bg-card hover:bg-accent text-foreground text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-input bg-card hover:bg-accent text-foreground text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
              >
                {secondaryAction.label}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
