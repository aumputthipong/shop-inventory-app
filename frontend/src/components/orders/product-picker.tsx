import { cn } from 'cn'
import { PlusIcon } from 'lucide-react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import type { Product } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useProductSearch } from '@/lib/use-product-search'

export function ProductPicker({
  products,
  inCart,
  onAdd,
}: {
  products: Product[]
  inCart: ReadonlyMap<number, number>
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
          const left = Math.max(p.available, 0)
          const full = (inCart.get(p.id) ?? 0) >= left
          return (
            <li
              key={p.id}
              className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto_120px] items-center gap-4 border-b border-line px-4 py-3 last:border-b-0"
            >
              <span className="flex min-w-0 flex-col items-start gap-1">
                <span className="max-w-full truncate font-medium">{p.name}</span>
                <span className="flex items-center gap-2.5">
                  <span className="code text-xs text-ink-3">{p.sku}</span>
                  {p.stock_status !== 'in_stock' && (
                    <Chip tone={left === 0 ? 'bad' : 'warn'}>
                      {left === 0 ? 'หมดแล้ว' : `เหลือ ${left} ชิ้น`}
                    </Chip>
                  )}
                </span>
              </span>
              <span className={cn('text-base font-semibold', left === 0 && 'text-ink-3')}>
                {formatMoney(p.price)}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={full}
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
