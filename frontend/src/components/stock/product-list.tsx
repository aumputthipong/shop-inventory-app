import { cn } from 'cn'
import { useState } from 'react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { FilterTabs } from '@/components/filter-tabs'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import type { Product } from '@/lib/api'
import { stockStatusChip } from '@/lib/labels'
import { useProductSearch } from '@/lib/use-product-search'

export type StockFilter = 'all' | 'restock' | 'out_of_stock'

const TABS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'restock', label: 'ควรเติมของ' },
  { value: 'out_of_stock', label: 'หมดแล้ว' },
]

const shows: Record<StockFilter, (p: Product) => boolean> = {
  all: () => true,
  restock: (p) => p.stock_status !== 'in_stock',
  out_of_stock: (p) => p.stock_status === 'out_of_stock',
}

export function ProductList({
  products,
  selectedId,
  onSelect,
  onAdd,
  filter: shownFilter,
  onFilterChange,
}: {
  products: Product[]
  selectedId: number | undefined
  onSelect: (id: number) => void
  onAdd?: () => void
  filter?: StockFilter
  onFilterChange?: (filter: StockFilter) => void
}) {
  const [ownFilter, setOwnFilter] = useState<StockFilter>('all')
  const filter = shownFilter ?? ownFilter
  const setFilter = onFilterChange ?? setOwnFilter

  const counts: Record<StockFilter, number> = {
    all: products.length,
    restock: products.filter(shows.restock).length,
    out_of_stock: products.filter(shows.out_of_stock).length,
  }

  const { query, setQuery, results } = useProductSearch(products.filter(shows[filter]))
  const visible = [...results].sort(byUrgency)

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

      <div
        className={cn(
          'grid h-9 items-center gap-x-4 sheet-head px-4 text-xs font-medium text-ink-2',
          rowCols,
        )}
      >
        <span>สินค้า</span>
        <span className="hidden text-right sm:block">มีในคลัง</span>
        <span className="hidden text-right sm:block">จองไว้</span>
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

const rowCols = 'grid-cols-[minmax(0,1fr)_64px] sm:grid-cols-[minmax(0,1fr)_80px_80px_80px]'

function byUrgency(a: Product, b: Product): number {
  if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
  const room = (p: Product) => p.available / Math.max(p.low_stock_threshold, 1)
  return room(a) - room(b) || a.name.localeCompare(b.name, 'th')
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
        'grid min-h-14 w-full cursor-pointer items-center gap-x-4 px-4 py-2.5 text-left',
        rowCols,
        selected ? 'bg-brand-50' : 'hover:bg-surface-2',
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span className={cn('truncate', selected ? 'font-bold' : 'font-medium')}>{p.name}</span>
        <span className="flex items-center gap-2">
          <span className="code text-[13px] text-ink-2">{p.sku}</span>
          {p.stock_status !== 'in_stock' && <Chip tone={chip.tone}>{chip.label}</Chip>}
          {!p.is_active && <Chip tone="neutral">ปิดขาย</Chip>}
        </span>
        <span className="text-[13px] text-ink-2 sm:hidden">
          มีในคลัง {p.on_hand} จองไว้ {p.reserved}
        </span>
      </span>
      <span className="hidden text-right sm:block">{p.on_hand}</span>
      <span className={cn('hidden text-right sm:block', p.reserved === 0 && 'text-ink-3')}>
        {p.reserved}
      </span>
      <span className={cn('figure text-right text-xl', p.available <= 0 && 'text-late')}>
        {Math.max(p.available, 0)}
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
  filter: StockFilter
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
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-marker-100 text-xs font-semibold text-marker-700"
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
      title={filter === 'out_of_stock' ? 'ไม่มีสินค้าที่หมดแล้ว' : 'ไม่มีสินค้าที่ต้องเติมของ'}
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
