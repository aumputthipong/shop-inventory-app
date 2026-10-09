import { cn } from 'cn'
import { PlusIcon } from 'lucide-react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import type { Product } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { stockStatusChip } from '@/lib/labels'
import { useProductSearch } from '@/lib/use-product-search'

export function ProductPicker({
  products,
  onAdd,
}: {
  products: Product[]
  onAdd: (id: number) => void
}) {
  const {
    query,
    setQuery,
    results: choices,
  } = useProductSearch(products.filter((p) => p.is_active))

  return (
    <section aria-label="เลือกสินค้า" className="panel min-w-0 flex-1 overflow-hidden">
      <div className="border-b border-line p-3">
        <SearchInput
          aria-label="ค้นหาสินค้า"
          placeholder="ค้นหาชื่อหรือ SKU"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
        />
      </div>
      {choices.length === 0 && (
        <EmptyState
          title="ไม่เจอสินค้าที่ขายได้"
          body="ลองค้นด้วยคำอื่น หรือเปิดขายสินค้าที่หน้าสต็อก"
        />
      )}
      <ul>
        {choices.map((p) => {
          const chip = stockStatusChip[p.stock_status]
          const soldOut = p.available <= 0
          return (
            <li
              key={p.id}
              className="grid min-h-16 grid-cols-[minmax(0,1fr)_96px_120px] items-center gap-4 border-b border-line px-4 py-3 last:border-b-0"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{p.name}</span>
                <span className="flex items-center gap-2.5 text-[13px] text-ink-2">
                  <span className="code">{p.sku}</span>
                  <span>{formatMoney(p.price)}</span>
                </span>
              </span>
              <span className="flex flex-col items-end">
                <span
                  className={cn('text-lg leading-6 font-semibold', soldOut && 'text-destructive')}
                >
                  {Math.max(p.available, 0)}
                </span>
                <Chip tone={chip.tone}>{soldOut ? 'หมดแล้ว' : 'ขายได้'}</Chip>
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={soldOut}
                aria-label={`ใส่ ${p.name} ลงตะกร้า`}
                onClick={() => {
                  onAdd(p.id)
                }}
              >
                <PlusIcon aria-hidden="true" />
                ใส่ตะกร้า
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
