import { cn } from 'cn'
import { MinusIcon, PlusIcon } from 'lucide-react'

import { Chip } from '@/components/chip'
import { ErrorAlert } from '@/components/error-alert'
import { capFor, type Cart } from '@/components/line/cart'
import { BottomBar, Shell, type Customer } from '@/components/line/line-layout'
import { ProductAvatar } from '@/components/product-avatar'
import { Button } from '@/components/ui/button'
import type { LineCatalogItem, Shortage } from '@/lib/api'
import { formatMoney } from '@/lib/format'

const soldOut = (item: LineCatalogItem) => item.stock_status === 'out_of_stock'

export function CartStep({
  devMode,
  customer,
  items,
  loading,
  failed,
  cart,
  shortages,
  units,
  total,
  onSetQty,
  onNext,
}: {
  devMode: boolean
  customer: Customer
  items: LineCatalogItem[]
  loading: boolean
  failed: boolean
  cart: Cart
  shortages: Shortage[]
  units: number
  total: number
  onSetQty: (item: LineCatalogItem, qty: number) => void
  onNext: () => void
}) {
  const sorted = [...items].sort((a, b) => Number(soldOut(a)) - Number(soldOut(b)))

  return (
    <Shell devMode={devMode} customer={customer} step={1}>
      <div className="px-5 pt-5 pb-28">
        <h1 className="text-lg font-semibold">
          {customer.name ? `สวัสดี ${customer.name}` : 'เลือกสินค้า'}
        </h1>
        <p className="text-sm text-ink-2">เลือกสินค้าที่ต้องการ แล้วกดถัดไปเพื่อใส่ที่อยู่จัดส่ง</p>

        {shortages.length > 0 && (
          <ErrorAlert className="mt-4">
            <p>มีคนสั่งตัดหน้าไประหว่างนี้ ปรับจำนวนให้แล้ว ตรวจตะกร้าอีกครั้ง</p>
            <ul className="mt-1 list-disc pl-4">
              {shortages.map((s) => (
                <li key={s.product_id}>
                  {s.name} {s.available <= 0 ? 'หมดแล้ว' : `เหลือ ${s.available} ชิ้น`}
                </li>
              ))}
            </ul>
          </ErrorAlert>
        )}

        {loading && <CatalogSkeleton />}
        {failed && (
          <p role="alert" className="py-10 text-center text-sm text-ink-2">
            โหลดสินค้าไม่ได้ ลองเปิดหน้านี้ใหม่
          </p>
        )}

        <ul className="mt-4 flex flex-col gap-2.5">
          {sorted.map((item) => (
            <CatalogRow
              key={item.id}
              item={item}
              qty={cart[item.id] ?? 0}
              onSetQty={(qty) => {
                onSetQty(item, qty)
              }}
            />
          ))}
        </ul>
      </div>

      <BottomBar units={units} total={total}>
        <Button size="lg" disabled={units === 0} onClick={onNext}>
          ถัดไป
        </Button>
      </BottomBar>
    </Shell>
  )
}

function CatalogSkeleton() {
  return (
    <ul role="status" aria-label="กำลังโหลดสินค้า" className="mt-4 flex flex-col gap-2.5">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex animate-pulse items-center gap-3 panel p-3.5">
          <span className="size-12 rounded-md bg-surface-2" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-4 w-2/3 rounded-sm bg-surface-2" />
            <span className="h-4 w-1/3 rounded-sm bg-surface-2" />
          </span>
        </li>
      ))}
    </ul>
  )
}

function CatalogRow({
  item,
  qty,
  onSetQty,
}: {
  item: LineCatalogItem
  qty: number
  onSetQty: (qty: number) => void
}) {
  const out = soldOut(item)
  const inCart = qty > 0

  return (
    <li
      className={cn(
        'flex items-center gap-3 panel p-3.5',
        inCart && 'border-petrol-600 bg-petrol-50',
        out && 'opacity-60',
      )}
    >
      <ProductAvatar name={item.name} sku={String(item.id)} size="lg" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 leading-5 font-medium">{item.name}</span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold tabular-nums">{formatMoney(item.price)}</span>
          {out ? (
            <Chip tone="bad">หมดแล้ว</Chip>
          ) : (
            item.available !== null && <Chip tone="warn">เหลือ {item.available} ชิ้น</Chip>
          )}
        </span>
      </span>
      {inCart ? (
        <span className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={`ลด ${item.name}`}
            onClick={() => {
              onSetQty(qty - 1)
            }}
          >
            <MinusIcon aria-hidden="true" />
          </Button>
          <span
            aria-label={`จำนวน ${item.name}`}
            className="w-8 text-center font-semibold tabular-nums"
          >
            {qty}
          </span>
          <Button
            size="icon"
            disabled={qty >= capFor(item)}
            aria-label={`เพิ่ม ${item.name} อีก`}
            onClick={() => {
              onSetQty(qty + 1)
            }}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
        </span>
      ) : (
        <Button
          disabled={out}
          aria-label={`เพิ่ม ${item.name}`}
          onClick={() => {
            onSetQty(1)
          }}
        >
          <PlusIcon aria-hidden="true" />
          เพิ่ม
        </Button>
      )}
    </li>
  )
}
