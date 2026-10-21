import type * as React from 'react'
import { cn } from 'cn'

import type { Channel, OrderStatus } from '@/lib/api'
import { channelLabel, type ChipTone, orderStatusChip } from '@/lib/labels'

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

const channelColor: Record<Channel, string> = {
  store: 'bg-channel-store',
  shopee: 'bg-channel-shopee',
  line: 'bg-channel-line',
}

export function ChannelMark({ channel, className }: { channel: Channel; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('h-4 w-1 shrink-0 rounded-[1px]', channelColor[channel], className)}
    />
  )
}

export function ChannelChip({ channel, className }: { channel: Channel; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2 whitespace-nowrap', className)}>
      <ChannelMark channel={channel} />
      {channelLabel[channel]}
    </span>
  )
}

const statusClass: Record<OrderStatus, string> = {
  reserved: 'font-semibold text-ink',
  packed: 'font-medium text-ink',
  shipped: 'text-ink-2',
  canceled: 'text-ink-3 line-through',
}

export function OrderStatusText({
  status,
  late,
  className,
}: {
  status: OrderStatus
  late?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'whitespace-nowrap',
        late ? 'font-semibold text-late' : statusClass[status],
        className,
      )}
    >
      {late ? 'ล่าช้า' : orderStatusChip[status].label}
    </span>
  )
}
