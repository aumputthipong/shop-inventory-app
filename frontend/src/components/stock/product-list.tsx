import { cn } from 'cn'
import { useState } from 'react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { FilterTabs } from '@/components/filter-tabs'
import { ProductAvatar } from '@/components/product-avatar'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { UnitStrip } from '@/components/unit-strip'
import type { Product, StockStatus } from '@/lib/api'
import { stockStatusChip } from '@/lib/labels'
import { useProductSearch } from '@/lib/use-product-search'

type Filter = 'all' | 'low' | 'out_of_stock'

const TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'low', label: 'ใกล้หมด' },
  { value: 'out_of_stock', label: 'หมดแล้ว' },
]

export function ProductList({
  products,
  selectedId,
  onSelect,
  onAdd,
}: {
  products: Product[]
  selectedId: number | undefined
  onSelect: (id: number) => void
  onAdd?: () => void
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const count = (status: StockStatus) => products.filter((p) => p.stock_status === status).length
  const counts: Record<Filter, number> = {
    all: products.length,
    low: count('low'),
    out_of_stock: count('out_of_stock'),
  }

  const {
    query,
    setQuery,
    results: visible,
  } = useProductSearch(products.filter((p) => filter === 'all' || p.stock_status === filter))

  return (
    <section aria-label="รายการสินค้า" className="panel min-w-0 flex-1 overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line px-4 pt-2">
        <FilterTabs
          label="แสดงสินค้า"
          value={filter}
          onChange={setFilter}
          options={TABS.map((tab) => ({ ...tab, count: counts[tab.value] }))}
        />
        <SearchInput
          className="mb-2"
          aria-label="ค้นหาชื่อหรือ SKU"
          placeholder="ค้นหาชื่อหรือ SKU"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          inputClassName="h-8 w-56"
        />
      </div>

      <div className="grid h-9 grid-cols-[36px_minmax(0,1fr)_200px_80px] items-center gap-4 border-b border-line bg-surface-2 px-4 text-[13px] text-ink-2">
        <span />
        <span>สินค้า</span>
        <span>ของในคลัง</span>
        <span className="text-right">ขายได้</span>
      </div>

      <ul>
        {visible.map((p) => (
          <li key={p.id} className="border-b border-line last:border-b-0">
            <ProductRow
              product={p}
              selected={p.id === selectedId}
              onSelect={() => {
                onSelect(p.id)
              }}
            />
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <ListEmptyState
          hasProducts={products.length > 0}
          query={query.trim()}
          filter={filter}
          onReset={() => {
            setQuery('')
            setFilter('all')
          }}
          onAdd={onAdd}
        />
      )}

      <p className="border-t border-line px-4 py-2.5 text-[13px] text-ink-3">
        แสดง {visible.length} จาก {products.length} รายการ
      </p>
    </section>
  )
}

function ProductRow({
  product: p,
  selected,
  onSelect,
}: {
  product: Product
  selected: boolean
  onSelect: () => void
}) {
  const chip = stockStatusChip[p.stock_status]
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'grid min-h-16 w-full cursor-pointer grid-cols-[36px_minmax(0,1fr)_200px_80px] items-center gap-4 px-4 py-3 text-left',
        selected
          ? 'bg-petrol-50 shadow-[inset_2px_0_0_var(--color-petrol-600)]'
          : 'hover:bg-surface-2',
      )}
    >
      <ProductAvatar name={p.name} sku={p.sku} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{p.name}</span>
        <span className="flex items-center gap-2">
          <span className="code text-xs text-ink-3">{p.sku}</span>
          <Chip tone={chip.tone}>{chip.label}</Chip>
          {!p.is_active && <Chip tone="neutral">ปิดขาย</Chip>}
        </span>
      </span>
      <span className="flex flex-col gap-1.5">
        <UnitStrip available={p.available} held={p.reserved} />
        <span className="flex gap-3 text-xs text-ink-3">
          <span>มี {p.on_hand}</span>
          <span>จองแล้ว {p.reserved}</span>
        </span>
      </span>
      <span className="flex flex-col items-end">
        <span
          className={cn('text-xl leading-7 font-semibold', p.available <= 0 && 'text-destructive')}
        >
          {Math.max(p.available, 0)}
        </span>
        <span className="text-xs text-ink-3">ชิ้น</span>
      </span>
    </button>
  )
}

const GETTING_STARTED = [
  {
    title: 'เพิ่มสินค้า พร้อมจำนวนที่มีอยู่ตอนนี้',
    body: 'นับของบนชั้นแล้วใส่ตัวเลขได้เลย ระบบจะจำเป็นยอดตั้งต้น',
  },
  {
    title: 'รับของเข้าเมื่อของมาส่ง',
    body: 'กด “รับของเข้า” ที่สินค้า ยอดในคลังจะเพิ่มทันที',
  },
  {
    title: 'บันทึกทุกออเดอร์ ทั้งหน้าร้าน Shopee และ LINE',
    body: 'ระบบจองของให้ทันที ช่องทางอื่นจะขายชิ้นเดียวกันซ้ำไม่ได้',
  },
]

function ListEmptyState({
  hasProducts,
  query,
  filter,
  onReset,
  onAdd,
}: {
  hasProducts: boolean
  query: string
  filter: Filter
  onReset: () => void
  onAdd?: () => void
}) {
  if (!hasProducts) {
    return (
      <div className="flex flex-col items-center pb-8">
        <EmptyState
          title="ยังไม่มีสินค้าในร้าน"
          body={
            onAdd
              ? 'เริ่มใช้งานได้ใน 3 ขั้น ไม่ต้องตั้งค่าอะไรเพิ่ม'
              : 'ให้เจ้าของร้านเพิ่มสินค้าก่อน แล้วรายการจะขึ้นที่นี่'
          }
        />
        {onAdd && (
          <>
            <ol aria-label="เริ่มต้นใช้งาน" className="flex w-full max-w-md flex-col gap-2 px-4">
              {GETTING_STARTED.map((step, i) => (
                <li
                  key={step.title}
                  className="flex gap-3 rounded-md border border-line bg-surface px-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-kraft-100 text-xs font-semibold text-kraft-700"
                  >
                    {i + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{step.title}</span>
                    <span className="text-[13px] text-ink-2">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Button className="mt-5" onClick={onAdd}>
              เพิ่มสินค้าชิ้นแรก
            </Button>
          </>
        )}
      </div>
    )
  }
  if (query !== '') {
    return (
      <EmptyState
        title={`ไม่เจอสินค้า “${query}”`}
        body="ลองค้นด้วย SKU หรือล้างคำค้นหาแล้วดูใหม่"
        action={
          <Button variant="outline" onClick={onReset}>
            ล้างคำค้นหา
          </Button>
        }
      />
    )
  }
  return (
    <EmptyState
      title={filter === 'out_of_stock' ? 'ไม่มีสินค้าที่หมดสต็อก' : 'ไม่มีสินค้าที่ใกล้หมด'}
      body={
        filter === 'out_of_stock'
          ? 'ทุกรายการยังขายได้อยู่'
          : 'ทุกรายการยังมีของมากกว่าจุดแจ้งเตือน'
      }
      action={
        <Button variant="outline" onClick={onReset}>
          ดูสินค้าทั้งหมด
        </Button>
      }
    />
  )
}
