import type * as React from 'react'
import { cn } from 'cn'

import type { Channel } from '@/lib/api'
import { channelDot, channelLabel, type ChipTone } from '@/lib/labels'

const toneClass: Record<ChipTone, string> = {
  ok: 'bg-chip-ok text-chip-ok-fg',
  warn: 'bg-chip-warn text-chip-warn-fg',
  bad: 'bg-chip-bad text-chip-bad-fg',
  info: 'bg-chip-info text-chip-info-fg',
  indigo: 'bg-chip-indigo text-chip-indigo-fg',
  violet: 'bg-chip-violet text-chip-violet-fg',
  teal: 'bg-chip-teal text-chip-teal-fg',
  neutral: 'bg-chip-neutral text-chip-neutral-fg',
}

export function Chip({
  tone,
  className,
  ...props
}: React.ComponentProps<'span'> & { tone: ChipTone }) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center rounded-sm px-2 text-xs leading-none font-medium whitespace-nowrap',
        toneClass[tone],
        className,
      )}
      {...props}
    />
  )
}

export function ChannelChip({ channel, className }: { channel: Channel; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-sm border border-line bg-surface px-2 text-xs font-medium whitespace-nowrap',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', channelDot[channel])} />
      {channelLabel[channel]}
    </span>
  )
}
