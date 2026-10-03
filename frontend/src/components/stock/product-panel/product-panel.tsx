import { useQuery } from '@tanstack/react-query'
import { PlusIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { FilterTabs } from '@/components/filter-tabs'
import { AdjustDialog } from '@/components/stock/adjust-dialog'
import { ProductFormDialog } from '@/components/stock/product-form-dialog'
import { Availability } from '@/components/stock/product-panel/availability'
import { Holds } from '@/components/stock/product-panel/holds'
import { PanelHeader } from '@/components/stock/product-panel/panel-header'
import { RecentMoves } from '@/components/stock/product-panel/recent-moves'
import { StockInDialog } from '@/components/stock/stock-in-dialog'
import { Button } from '@/components/ui/button'
import { productQueryOptions } from '@/lib/queries'

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
