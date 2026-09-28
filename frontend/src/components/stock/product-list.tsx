import { cn } from 'cn'
import { SearchIcon } from 'lucide-react'
import { useState } from 'react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { ProductAvatar } from '@/components/product-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UnitStrip } from '@/components/unit-strip'
import type { Product, StockStatus } from '@/lib/api'
import { stockStatusChip } from '@/lib/labels'

type Filter = 'all' | 'low' | 'out_of_stock'

const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'low', label: 'ใกล้หมด' },
  { id: 'out_of_stock', label: 'หมดแล้ว' },
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
  const [query, setQuery] = useState('')

  const count = (status: StockStatus) => products.filter((p) => p.stock_status === status).length
  const counts: Record<Filter, number> = {
    all: products.length,
    low: count('low'),
    out_of_stock: count('out_of_stock'),
  }

  const q = query.trim().toLowerCase()
  const visible = products.filter(
    (p) =>
      (filter === 'all' || p.stock_status === filter) &&
      (q === '' || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
  )

  return (
    <section
      aria-label="รายการสินค้า"
      className="min-w-0 flex-1 rounded-[22px] bg-white p-3 shadow-soft"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 px-2 pt-2 pb-4">
        <div role="group" aria-label="แสดงสินค้า" className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={filter === tab.id}
              onClick={() => {
                setFilter(tab.id)
              }}
              className={cn(
                'flex h-10 items-center gap-2 rounded-full pr-2 pl-4 text-[15px] font-medium',
                filter === tab.id
                  ? 'bg-ink text-white'
                  : 'bg-sand-100 text-sand-800 hover:bg-sand-200 hover:text-ink',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'flex h-[26px] min-w-[26px] items-center justify-center rounded-full px-2 text-[13px] font-semibold',
                  filter === tab.id ? 'bg-white/20' : 'bg-white text-ink',
                )}
              >
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>
        <label className="relative flex items-center">
          <SearchIcon
            className="pointer-events-none absolute left-3 size-4 text-sand-700"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="ค้นหาชื่อหรือ SKU"
            placeholder="ค้นหาชื่อหรือ SKU"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
            }}
            className="h-10 w-60 pl-9"
          />
        </label>
      </div>

      <div className="grid h-9 grid-cols-[44px_minmax(0,1fr)_200px_96px] items-center gap-4 px-4 text-[13px] font-medium text-sand-800">
        <span />
        <span>สินค้า</span>
        <span>ของในคลัง</span>
        <span className="text-right">ขายได้</span>
      </div>

      <ul className="flex flex-col gap-1">
        {visible.map((p) => (
          <li key={p.id}>
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

      <p className="px-4 pt-3.5 pb-1.5 text-[13px] text-sand-800">
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
        'grid min-h-20 w-full cursor-pointer grid-cols-[44px_minmax(0,1fr)_200px_96px] items-center gap-4 rounded-2xl px-4 py-3.5 text-left',
        selected ? 'bg-petrol-50 ring-[1.5px] ring-petrol-300 ring-inset' : 'hover:bg-sand-50',
      )}
    >
      <ProductAvatar name={p.name} sku={p.sku} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-base leading-[26px] font-semibold">{p.name}</span>
        <span className="flex items-center gap-2.5">
          <span className="text-[13px] text-sand-800">{p.sku}</span>
          <Chip tone={chip.tone}>{chip.label}</Chip>
          {!p.is_active && <Chip tone="neutral">ปิดขาย</Chip>}
        </span>
      </span>
      <span className="flex flex-col gap-1.5">
        <UnitStrip available={p.available} held={p.reserved} />
        <span className="flex gap-3 text-[13px] leading-[18px] text-sand-800">
          <span>มี {p.on_hand}</span>
          <span>จองแล้ว {p.reserved}</span>
        </span>
      </span>
      <span className="flex flex-col items-end">
        <span
          className={cn('text-[28px] leading-8 font-bold', p.available <= 0 && 'text-destructive')}
        >
          {Math.max(p.available, 0)}
        </span>
        <span className="text-[13px] leading-[18px] text-sand-800">ชิ้น</span>
      </span>
    </button>
  )
}

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
      <EmptyState
        title="ยังไม่มีสินค้าในร้าน"
        body="เพิ่มสินค้าชิ้นแรก แล้วรับของเข้าเพื่อเริ่มขาย"
        action={onAdd && <Button onClick={onAdd}>เพิ่มสินค้าชิ้นแรก</Button>}
      />
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
