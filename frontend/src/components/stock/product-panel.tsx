import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import {
  BellIcon,
  ChevronDownIcon,
  HistoryIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
  SlidersHorizontalIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { ChannelChip, Chip } from '@/components/chip'
import { ProductAvatar } from '@/components/product-avatar'
import { AdjustDialog } from '@/components/stock/adjust-dialog'
import { ProductFormDialog } from '@/components/stock/product-form-dialog'
import { StockInDialog } from '@/components/stock/stock-in-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { UnitLegend, UnitStrip } from '@/components/unit-strip'
import { api, type ProductDetail } from '@/lib/api'
import { formatDateTime, formatMoney, formatSigned } from '@/lib/format'
import { movementChip, movementReason, orderStatusChip, stockStatusChip } from '@/lib/labels'
import { invalidateStock, movementsQueryOptions, productQueryOptions } from '@/lib/queries'
import { useToast } from '@/lib/toast'

type Section = 'holds' | 'moves' | null

export function ProductPanel({ productId, isOwner }: { productId: number; isOwner: boolean }) {
  const { data: product, isPending, isError } = useQuery(productQueryOptions(productId))
  const [dialog, setDialog] = useState<'in' | 'adjust' | 'edit' | null>(null)
  const [open, setOpen] = useState<Section>('holds')

  if (isPending) {
    return <PanelShell>กำลังโหลด...</PanelShell>
  }
  if (isError) {
    return <PanelShell>โหลดสินค้านี้ไม่ได้ ลองรีเฟรชหน้าอีกครั้ง</PanelShell>
  }

  const toggle = (section: Section) => {
    setOpen((current) => (current === section ? null : section))
  }

  return (
    <aside
      id="product-panel"
      aria-label="สินค้าที่เลือก"
      className="flex w-full shrink-0 scroll-mt-24 flex-col gap-5 rounded-[22px] bg-white p-6 shadow-soft xl:w-[520px]"
    >
      <PanelHeader
        product={product}
        isOwner={isOwner}
        onEdit={() => {
          setDialog('edit')
        }}
      />
      <AvailabilityCard
        product={product}
        isOwner={isOwner}
        onEditAlert={() => {
          setDialog('edit')
        }}
      />

      <div className="flex gap-3">
        <Button
          size="lg"
          className="flex-1"
          onClick={() => {
            setDialog('in')
          }}
        >
          <PlusIcon aria-hidden="true" />
          รับของเข้า
        </Button>
        {isOwner && (
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setDialog('adjust')
            }}
          >
            <SlidersHorizontalIcon aria-hidden="true" />
            ปรับยอด
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <AccordionButton
          icon={<ReceiptTextIcon className="size-5" />}
          label="ออเดอร์ที่จองไว้"
          count={product.holds.length}
          expanded={open === 'holds'}
          onClick={() => {
            toggle('holds')
          }}
        />
        {open === 'holds' && <Holds product={product} />}

        <AccordionButton
          icon={<HistoryIcon className="size-5" />}
          label="ความเคลื่อนไหวล่าสุด"
          expanded={open === 'moves'}
          onClick={() => {
            toggle('moves')
          }}
        />
        {open === 'moves' && <RecentMoves productId={product.id} />}
      </div>

      <StockInDialog
        product={product}
        open={dialog === 'in'}
        onOpenChange={(o) => {
          setDialog(o ? 'in' : null)
        }}
      />
      {isOwner && (
        <>
          <AdjustDialog
            product={product}
            open={dialog === 'adjust'}
            onOpenChange={(o) => {
              setDialog(o ? 'adjust' : null)
            }}
          />
          <ProductFormDialog
            product={product}
            open={dialog === 'edit'}
            onOpenChange={(o) => {
              setDialog(o ? 'edit' : null)
            }}
          />
        </>
      )}
    </aside>
  )
}

function PanelShell({ children }: { children: ReactNode }) {
  return (
    <aside className="flex w-full shrink-0 items-center justify-center xl:w-[520px] rounded-[22px] bg-white p-10 text-sand-800 shadow-soft">
      {children}
    </aside>
  )
}

function PanelHeader({
  product,
  isOwner,
  onEdit,
}: {
  product: ProductDetail
  isOwner: boolean
  onEdit: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const setActive = useMutation({
    mutationFn: (active: boolean) => api.updateProduct(product.id, { is_active: active }),
    onSuccess: async (saved) => {
      toast(
        saved.is_active
          ? `เปิดขาย ${saved.name} แล้ว`
          : `ปิดขาย ${saved.name} แล้ว ออเดอร์ใหม่จะสั่งไม่ได้`,
      )
      await invalidateStock(queryClient)
    },
  })

  return (
    <div className="flex items-center gap-3.5">
      <ProductAvatar name={product.name} sku={product.sku} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="truncate text-[21px] leading-8 font-bold">{product.name}</h2>
        <div className="flex gap-3.5 text-sm text-sand-800">
          <span>{product.sku}</span>
          <span>{formatMoney(product.price)}</span>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-sand-800">
        {product.is_active ? 'เปิดขาย' : 'ปิดขาย'}
        <Switch
          checked={product.is_active}
          disabled={!isOwner || setActive.isPending}
          onCheckedChange={(checked) => {
            setActive.mutate(checked)
          }}
        />
      </label>
      {isOwner && (
        <Button variant="ghost" size="icon" aria-label="แก้ไขสินค้า" onClick={onEdit}>
          <PencilIcon aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

function AvailabilityCard({
  product,
  isOwner,
  onEditAlert,
}: {
  product: ProductDetail
  isOwner: boolean
  onEditAlert: () => void
}) {
  const chip = stockStatusChip[product.stock_status]
  const orders = product.holds.length
  const summary =
    product.reserved > 0
      ? `มีในคลัง ${product.on_hand} ชิ้น จองไว้ให้ ${orders} ออเดอร์ รวม ${product.reserved} ชิ้น`
      : `มีในคลัง ${product.on_hand} ชิ้น ยังไม่มีออเดอร์จอง`
  const status =
    product.stock_status === 'out_of_stock'
      ? 'ของหมดแล้ว ออเดอร์ใหม่จะถูกปฏิเสธจนกว่าจะเติมของ'
      : product.stock_status === 'low'
        ? `ใกล้หมดแล้ว แจ้งเตือนเมื่อเหลือ ${product.low_stock_threshold} ชิ้นหรือน้อยกว่า`
        : `แจ้งเตือนเมื่อเหลือ ${product.low_stock_threshold} ชิ้นหรือน้อยกว่า`

  return (
    <div className="flex flex-col gap-3.5 rounded-[18px] bg-sand-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold text-sand-800">ขายได้อีก</span>
          <span className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-[68px] leading-[76px] font-bold tracking-tight',
                product.available <= 0 && 'text-destructive',
              )}
            >
              {Math.max(product.available, 0)}
            </span>
            <span className="text-xl font-semibold">ชิ้น</span>
          </span>
        </div>
        <Chip tone={chip.tone} className="h-[30px] px-3.5 text-sm">
          {chip.label}
        </Chip>
      </div>
      <span className="text-[15px] text-sand-900">{summary}</span>
      <UnitStrip size="lg" available={product.available} held={product.reserved} />
      <UnitLegend />
      <div
        className={cn(
          'flex items-center gap-2.5 border-t border-sand-300 pt-3 text-sm',
          product.stock_status === 'out_of_stock'
            ? 'text-destructive'
            : product.stock_status === 'low'
              ? 'text-chip-warn-fg'
              : 'text-sand-800',
        )}
      >
        <BellIcon className="size-[18px] shrink-0" aria-hidden="true" />
        <span>{status}</span>
        {isOwner && (
          <button
            type="button"
            onClick={onEditAlert}
            className="ml-auto text-sm font-semibold whitespace-nowrap text-petrol-600 hover:underline"
          >
            ตั้งค่าแจ้งเตือน
          </button>
        )}
      </div>
    </div>
  )
}

function AccordionButton({
  icon,
  label,
  count,
  expanded,
  onClick,
}: {
  icon: ReactNode
  label: string
  count?: number
  expanded: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onClick}
      className="flex h-[52px] w-full items-center gap-2.5 rounded-[14px] bg-sand-50 px-3.5 text-left text-[15px] font-semibold hover:bg-sand-200"
    >
      <span className="text-[#8a7b68]" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-white px-2 text-[13px]">
          {count}
        </span>
      )}
      <ChevronDownIcon
        aria-hidden="true"
        className={cn('size-[18px] text-sand-800 transition-transform', expanded && 'rotate-180')}
      />
    </button>
  )
}

function Holds({ product }: { product: ProductDetail }) {
  if (product.holds.length === 0) {
    return (
      <p className="px-2.5 py-3.5 text-sand-800">ยังไม่มีออเดอร์จองสินค้านี้ ของทั้งหมดพร้อมขาย</p>
    )
  }
  return (
    <ul className="flex flex-col px-1">
      {product.holds.map((h) => {
        const chip = orderStatusChip[h.status]
        return (
          <li
            key={h.order_id}
            className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 border-b border-sand-200 p-2.5 last:border-b-0"
          >
            <div className="flex min-w-0 flex-col">
              <Link
                to="/orders/$orderId"
                params={{ orderId: h.order_id }}
                className="font-semibold hover:text-petrol-600 hover:underline"
              >
                {h.order_no}
              </Link>
              <span className="text-[13px] text-sand-800">
                {h.qty} ชิ้น · สั่งเมื่อ {formatDateTime(h.created_at)}
              </span>
            </div>
            <ChannelChip channel={h.channel} />
            <Chip tone={chip.tone} className="h-7 px-3">
              {chip.label}
            </Chip>
          </li>
        )
      })}
    </ul>
  )
}

function RecentMoves({ productId }: { productId: number }) {
  const { data, isPending } = useQuery(movementsQueryOptions({ product_id: productId, limit: 5 }))

  if (isPending) return <p className="px-2.5 py-3.5 text-sand-800">กำลังโหลด...</p>
  if (!data || data.items.length === 0) {
    return <p className="px-2.5 py-3.5 text-sand-800">ยังไม่มีความเคลื่อนไหว</p>
  }

  return (
    <div className="flex flex-col px-1">
      {data.items.map((m) => {
        const chip = movementChip[m.type]
        const ref = m.order_no ?? movementReason(m.reason) ?? m.note ?? ''
        const change =
          m.qty_change !== 0
            ? formatSigned(m.qty_change)
            : `${m.reserved_change > 0 ? 'จอง' : 'คืน'} ${Math.abs(m.reserved_change)}`
        return (
          <div
            key={m.id}
            className="grid min-h-[60px] grid-cols-[96px_minmax(0,1fr)_72px_56px] items-center gap-2.5 border-b border-sand-200 px-2.5 py-2 last:border-b-0"
          >
            <span className="text-[13px] leading-[18px] text-sand-800">
              {formatDateTime(m.created_at)}
            </span>
            <span className="flex min-w-0 flex-col items-start gap-0.5">
              <Chip tone={chip.tone}>{chip.label}</Chip>
              <span className="max-w-full truncate text-xs text-sand-800">{ref}</span>
            </span>
            <span className="text-right font-medium">{change}</span>
            <span className="flex flex-col items-end leading-[18px]">
              <span className="text-base font-bold">{m.available_after}</span>
              <span className="text-[11px] text-sand-800">ขายได้</span>
            </span>
          </div>
        )
      })}
      <Link
        to="/ledger"
        search={{ product: productId }}
        className="mx-2.5 mt-2.5 self-start text-sm font-semibold text-petrol-600 hover:underline"
      >
        ดูประวัติทั้งหมด
      </Link>
    </div>
  )
}
