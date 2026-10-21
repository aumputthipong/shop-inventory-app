import { useQuery } from '@tanstack/react-query'
import { PlusIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AdjustDialog } from '@/components/stock/adjust-dialog'
import { ProductFormDialog } from '@/components/stock/product-form-dialog'
import { Availability } from '@/components/stock/product-panel/availability'
import { Holds } from '@/components/stock/product-panel/holds'
import { PanelHeader } from '@/components/stock/product-panel/panel-header'
import { RecentMoves } from '@/components/stock/product-panel/recent-moves'
import { StockInDialog } from '@/components/stock/stock-in-dialog'
import { Button } from '@/components/ui/button'
import { productQueryOptions } from '@/lib/queries'

export function ProductPanel({ productId, isOwner }: { productId: number; isOwner: boolean }) {
  const { data: product, isPending, isError } = useQuery(productQueryOptions(productId))
  const [dialog, setDialog] = useState<'in' | 'adjust' | 'edit' | null>(null)

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
      className="panel flex w-full shrink-0 scroll-mt-20 flex-col overflow-hidden @5xl:w-[480px]"
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

      <div className="flex items-center justify-between gap-6 border-b border-line px-5 py-4">
        <Button
          onClick={() => {
            setDialog('in')
          }}
        >
          <PlusIcon aria-hidden="true" />
          รับของเข้า
        </Button>
        {isOwner && (
          <Button
            variant="outline"
            onClick={() => {
              setDialog('adjust')
            }}
          >
            <SlidersHorizontalIcon aria-hidden="true" />
            ปรับยอด
          </Button>
        )}
      </div>

      <RecentMoves product={product} isOwner={isOwner} />
      <Holds product={product} />

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
    <aside className="panel flex w-full shrink-0 items-center justify-center p-10 text-ink-2 @5xl:w-[480px]">
      {children}
    </aside>
  )
}
