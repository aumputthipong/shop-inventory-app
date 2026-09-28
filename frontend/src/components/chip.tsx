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
        'inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[13px] leading-none font-semibold whitespace-nowrap',
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
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-sand-200 px-3 text-[13px] font-medium whitespace-nowrap',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-2 rounded-full', channelDot[channel])} />
      {channelLabel[channel]}
    </span>
  )
}
