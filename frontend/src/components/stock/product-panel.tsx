import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { BellIcon, PencilIcon, PlusIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { ChannelChip, Chip } from '@/components/chip'
import { FilterTabs } from '@/components/filter-tabs'
import { ProductAvatar } from '@/components/product-avatar'
import { AdjustDialog } from '@/components/stock/adjust-dialog'
import { ProductFormDialog } from '@/components/stock/product-form-dialog'
import { ReverseMovementButton } from '@/components/stock/reverse-movement'
import { StockInDialog } from '@/components/stock/stock-in-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { UnitLegend, UnitStrip } from '@/components/unit-strip'
import { api, type ProductDetail } from '@/lib/api'
import { formatDateTime, formatMoney, formatSigned } from '@/lib/format'
import { movementChip, movementReason, orderStatusChip, stockStatusChip } from '@/lib/labels'
import { canReverse } from '@/lib/movements'
import { invalidateStock, movementsQueryOptions, productQueryOptions } from '@/lib/queries'
import { useToast } from '@/lib/toast'

type Section = 'holds' | 'moves'

export function ProductPanel({ productId, isOwner }: { productId: number; isOwner: boolean }) {
  const { data: product, isPending, isError } = useQuery(productQueryOptions(productId))
  const [dialog, setDialog] = useState<'in' | 'adjust' | 'edit' | null>(null)
  const [section, setSection] = useState<Section>('holds')

  if (isPending) {
    return <PanelShell>กำลังโหลด...</PanelShell>
  }
  if (isError) {
    return <PanelShell>โหลดสินค้านี้ไม่ได้ ลองรีเฟรชหน้าอีกครั้ง</PanelShell>
  }

  return (
    <aside
      id="product-panel"
      aria-label="สินค้าที่เลือก"
      className="panel flex w-full shrink-0 scroll-mt-20 flex-col overflow-hidden xl:w-[480px]"
    >
      <PanelHeader
        product={product}
        isOwner={isOwner}
        onEdit={() => {
          setDialog('edit')
        }}
      />
      <Availability
        product={product}
        isOwner={isOwner}
        onEditAlert={() => {
          setDialog('edit')
        }}
      />

      <div className="flex gap-2 border-b border-line px-5 py-4">
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

      <div className="border-b border-line px-5">
        <FilterTabs
          label="รายละเอียดสินค้า"
          value={section}
          onChange={setSection}
          options={[
            { value: 'holds', label: 'ออเดอร์ที่จองไว้', count: product.holds.length },
            { value: 'moves', label: 'ความเคลื่อนไหวล่าสุด' },
          ]}
        />
      </div>
      {section === 'holds' ? (
        <Holds product={product} />
      ) : (
        <RecentMoves productId={product.id} isOwner={isOwner} />
      )}

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
    <aside className="panel flex w-full shrink-0 items-center justify-center p-10 text-ink-2 xl:w-[480px]">
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
    <div className="flex items-center gap-3 border-b border-line px-5 py-4">
      <ProductAvatar name={product.name} sku={product.sku} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="truncate text-base leading-6 font-semibold">{product.name}</h2>
        <div className="flex gap-3 text-[13px] text-ink-2">
          <span className="code">{product.sku}</span>
          <span>{formatMoney(product.price)}</span>
        </div>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
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
        <Button variant="ghost" size="icon-sm" aria-label="แก้ไขสินค้า" onClick={onEdit}>
          <PencilIcon aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

function Availability({
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
    <div className="flex flex-col gap-3 border-b border-line px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[13px] text-ink-2">ขายได้อีก</span>
          <span className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'text-5xl leading-[52px] font-semibold tracking-tight',
                product.available <= 0 && 'text-destructive',
              )}
            >
              {Math.max(product.available, 0)}
            </span>
            <span className="text-base text-ink-2">ชิ้น</span>
          </span>
        </div>
        <Chip tone={chip.tone}>{chip.label}</Chip>
      </div>
      <span className="text-[13px] text-ink-2">{summary}</span>
      <UnitStrip size="lg" available={product.available} held={product.reserved} />
      <UnitLegend />
      <div
        className={cn(
          'flex items-center gap-2 text-[13px]',
          product.stock_status === 'out_of_stock'
            ? 'text-destructive'
            : product.stock_status === 'low'
              ? 'text-chip-warn-fg'
              : 'text-ink-2',
        )}
      >
        <BellIcon className="size-4 shrink-0" aria-hidden="true" />
        <span>{status}</span>
        {isOwner && (
          <button
            type="button"
            onClick={onEditAlert}
            className="ml-auto font-medium whitespace-nowrap text-petrol-600 hover:underline"
          >
            ตั้งค่าแจ้งเตือน
          </button>
        )}
      </div>
    </div>
  )
}

function Holds({ product }: { product: ProductDetail }) {
  if (product.holds.length === 0) {
    return (
      <p className="px-5 py-5 text-[13px] text-ink-2">
        ยังไม่มีออเดอร์จองสินค้านี้ ของทั้งหมดพร้อมขาย
      </p>
    )
  }
  return (
    <ul>
      {product.holds.map((h) => {
        const chip = orderStatusChip[h.status]
        return (
          <li
            key={h.order_id}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-line px-5 py-3 last:border-b-0"
          >
            <div className="flex min-w-0 flex-col">
              <Link
                to="/orders/$orderId"
                params={{ orderId: h.order_id }}
                className="code text-sm font-medium hover:text-petrol-600 hover:underline"
              >
                {h.order_no}
              </Link>
              <span className="text-xs text-ink-3">
                {h.qty} ชิ้น · สั่งเมื่อ {formatDateTime(h.created_at)}
              </span>
            </div>
            <ChannelChip channel={h.channel} />
            <Chip tone={chip.tone}>{chip.label}</Chip>
          </li>
        )
      })}
    </ul>
  )
}

function RecentMoves({ productId, isOwner }: { productId: number; isOwner: boolean }) {
  const { data, isPending } = useQuery(movementsQueryOptions({ product_id: productId, limit: 5 }))

  if (isPending) return <p className="px-5 py-5 text-[13px] text-ink-2">กำลังโหลด...</p>
  if (!data || data.items.length === 0) {
    return <p className="px-5 py-5 text-[13px] text-ink-2">ยังไม่มีความเคลื่อนไหว</p>
  }

  return (
    <div className="flex flex-col">
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
            className="grid grid-cols-[80px_minmax(0,1fr)_56px_44px_auto] items-center gap-2 border-b border-line px-5 py-2.5"
          >
            <span className="text-xs text-ink-3">{formatDateTime(m.created_at)}</span>
            <span className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="flex gap-1">
                <Chip tone={chip.tone}>{chip.label}</Chip>
                {m.reversed && <Chip tone="neutral">ยกเลิกแล้ว</Chip>}
              </span>
              <span className="max-w-full truncate text-xs text-ink-3">{ref}</span>
            </span>
            <span className="text-right text-[13px]">{change}</span>
            <span className="flex flex-col items-end">
              <span className="text-[13px] font-medium text-ink-2">{m.available_after}</span>
              <span className="text-[11px] text-ink-3">ขายได้</span>
            </span>
            <span className="flex justify-end">
              {isOwner && canReverse(m) && <ReverseMovementButton movement={m} />}
            </span>
          </div>
        )
      })}
      <Link
        to="/ledger"
        search={{ product: productId }}
        className="px-5 py-3 text-[13px] font-medium text-petrol-600 hover:underline"
      >
        ดูประวัติทั้งหมด
      </Link>
    </div>
  )
}
