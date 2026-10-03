import { AlertCircleIcon, MinusIcon, PlusIcon } from 'lucide-react'

import { capFor, type Cart } from '@/components/line/cart'
import { BottomBar, Shell } from '@/components/line/line-layout'
import { ProductAvatar } from '@/components/product-avatar'
import { Button } from '@/components/ui/button'
import type { LineCatalogItem, Shortage } from '@/lib/api'
import { formatMoney } from '@/lib/format'

export function CartStep({
  devMode,
  displayName,
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
  displayName: string
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
  return (
    <Shell devMode={devMode}>
      <div className="px-5 pt-4 pb-28">
        <h1 className="text-lg font-semibold">
          {displayName ? `สวัสดี ${displayName}` : 'เลือกสินค้า'}
        </h1>
        <p className="text-sm text-ink-2">เลือกสินค้าแล้วกดถัดไปเพื่อใส่ที่อยู่จัดส่ง</p>

        {shortages.length > 0 && (
          <div
            role="alert"
            className="mt-4 flex gap-2 rounded-md bg-chip-bad px-3 py-2.5 text-[13px] text-chip-bad-fg"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p>มีคนสั่งตัดหน้าไประหว่างนี้ ปรับจำนวนให้แล้ว ตรวจตะกร้าอีกครั้ง</p>
              <ul className="mt-1 list-disc pl-4">
                {shortages.map((s) => (
                  <li key={s.product_id}>
                    {s.name} {s.available <= 0 ? 'หมดแล้ว' : `เหลือ ${s.available} ชิ้น`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {loading && <p className="py-10 text-center text-sm text-ink-2">กำลังโหลดสินค้า...</p>}
        {failed && (
          <p role="alert" className="py-10 text-center text-sm text-ink-2">
            โหลดสินค้าไม่ได้ ลองเปิดหน้านี้ใหม่
          </p>
        )}

        <ul className="mt-4 flex flex-col gap-2.5">
          {items.map((item) => (
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

function CatalogRow({
  item,
  qty,
  onSetQty,
}: {
  item: LineCatalogItem
  qty: number
  onSetQty: (qty: number) => void
}) {
  const soldOut = item.stock_status === 'out_of_stock'

  return (
    <li className="flex items-center gap-3 panel px-3.5 py-3">
      <ProductAvatar name={item.name} sku={String(item.id)} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{item.name}</span>
        <span className="text-sm text-ink-2">
          {formatMoney(item.price)}
          {soldOut ? (
            <span className="text-destructive"> · หมดแล้ว</span>
          ) : (
            item.available !== null && (
              <span className="text-chip-warn-fg"> · เหลือ {item.available} ชิ้น</span>
            )
          )}
        </span>
      </span>
      {qty === 0 ? (
        <Button
          variant="outline"
          disabled={soldOut}
          aria-label={`เพิ่ม ${item.name}`}
          onClick={() => {
            onSetQty(1)
          }}
        >
          <PlusIcon aria-hidden="true" />
          เพิ่ม
        </Button>
      ) : (
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
          <span aria-label={`จำนวน ${item.name}`} className="w-8 text-center font-semibold">
            {qty}
          </span>
          <Button
            variant="outline"
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
      )}
    </li>
  )
}
