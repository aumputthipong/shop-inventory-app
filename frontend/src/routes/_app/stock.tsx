import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { PackagePlusIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { ProductFormDialog } from '@/components/stock/product-form-dialog'
import { ProductList } from '@/components/stock/product-list'
import { ProductPanel } from '@/components/stock/product-panel/product-panel'
import { Button } from '@/components/ui/button'
import { productsQueryOptions } from '@/lib/queries'
import { useCurrentUser } from '@/lib/session'

interface StockSearch {
  product?: number
}

export const Route = createFileRoute('/_app/stock')({
  validateSearch: (search: Record<string, unknown>): StockSearch => {
    const id = Number(search.product)
    return Number.isInteger(id) && id > 0 ? { product: id } : {}
  },
  loader: ({ context }) =>
    context.queryClient.query({ ...productsQueryOptions, staleTime: 'static' }),
  component: StockPage,
})

function StockPage() {
  const { data: products } = useSuspenseQuery(productsQueryOptions)
  const { product: selectedParam } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const me = useCurrentUser()
  const [adding, setAdding] = useState(false)

  const selectedId = products.some((p) => p.id === selectedParam) ? selectedParam : products[0]?.id
  const restock = products.filter((p) => p.stock_status !== 'in_stock').length

  const select = (id: number) => {
    void navigate({ search: { product: id }, replace: true })
    if (window.matchMedia('(max-width: 1279px)').matches) {
      document.getElementById('product-panel')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="สต็อกสินค้า"
        description={
          products.length === 0
            ? 'เริ่มจากเพิ่มสินค้าชิ้นแรกของร้าน'
            : restock === 0
              ? 'ทุกรายการยังมีของเพียงพอ'
              : `มี ${restock} รายการที่ควรเติมของเร็วๆ นี้`
        }
        actions={
          <div className="flex flex-wrap justify-end gap-2.5">
            {products.length > 0 && (
              <Button asChild variant="outline">
                <Link to="/receive">
                  <PackagePlusIcon aria-hidden="true" />
                  รับของจากใบส่งของ
                </Link>
              </Button>
            )}
            {me.isOwner && (
              <Button
                variant="outline"
                onClick={() => {
                  setAdding(true)
                }}
              >
                <PlusIcon aria-hidden="true" />
                เพิ่มสินค้า
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col items-stretch gap-6 xl:flex-row xl:items-start">
        <ProductList
          products={products}
          selectedId={selectedId}
          onSelect={select}
          onAdd={
            me.isOwner
              ? () => {
                  setAdding(true)
                }
              : undefined
          }
        />
        {selectedId !== undefined && <ProductPanel productId={selectedId} isOwner={me.isOwner} />}
      </div>

      {me.isOwner && (
        <ProductFormDialog
          open={adding}
          onOpenChange={setAdding}
          onSaved={(saved) => {
            select(saved.id)
          }}
        />
      )}
    </div>
  )
}
