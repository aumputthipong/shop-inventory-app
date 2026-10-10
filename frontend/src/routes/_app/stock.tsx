import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { PackagePlusIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { ProductFormDialog } from '@/components/stock/product-form-dialog'
import { ProductList, type StockFilter } from '@/components/stock/product-list'
import { ProductPanel } from '@/components/stock/product-panel/product-panel'
import { Button } from '@/components/ui/button'
import { productsQueryOptions } from '@/lib/queries'
import { useCurrentUser } from '@/lib/session'

interface StockSearch {
  product?: number
  show?: Exclude<StockFilter, 'all'>
}

export const Route = createFileRoute('/_app/stock')({
  validateSearch: (search: Record<string, unknown>): StockSearch => {
    const id = Number(search.product)
    return {
      product: Number.isInteger(id) && id > 0 ? id : undefined,
      show: search.show === 'restock' || search.show === 'out_of_stock' ? search.show : undefined,
    }
  },
  loader: ({ context }) =>
    context.queryClient.query({ ...productsQueryOptions, staleTime: 'static' }),
  component: StockPage,
})

function StockPage() {
  const { data: products } = useSuspenseQuery(productsQueryOptions)
  const { product: selectedParam, show } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const me = useCurrentUser()
  const [adding, setAdding] = useState(false)

  const selectedId = products.some((p) => p.id === selectedParam) ? selectedParam : products[0]?.id
  const restock = products.filter((p) => p.stock_status !== 'in_stock').length

  const showFilter = (filter: StockFilter) => {
    void navigate({
      search: (prev) => ({ ...prev, show: filter === 'all' ? undefined : filter }),
      replace: true,
    })
  }

  const select = (id: number) => {
    void navigate({ search: (prev) => ({ ...prev, product: id }), replace: true })
    if (window.matchMedia('(max-width: 1279px)').matches) {
      document.getElementById('product-panel')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="สต็อกสินค้า"
        description={
          products.length === 0 ? (
            'เริ่มจากเพิ่มสินค้าชิ้นแรกของร้าน'
          ) : restock === 0 ? (
            'ทุกรายการยังมีของเพียงพอ'
          ) : (
            <button
              type="button"
              onClick={() => {
                showFilter('restock')
              }}
              className="text-brand-600 underline decoration-line-strong underline-offset-4 hover:decoration-brand-600"
            >
              มี {restock} รายการที่ควรเติมของเร็วๆ นี้
            </button>
          )
        }
        actions={
          <div className="flex flex-wrap justify-end gap-2.5">
            {products.length > 0 && (
              <Button asChild variant="outline">
                <Link to="/receive">
                  <PackagePlusIcon aria-hidden="true" />
                  รับของเข้าหลายรายการ
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

      <div className="flex flex-col items-stretch gap-6 @5xl:flex-row @5xl:items-start">
        <ProductList
          products={products}
          filter={show ?? 'all'}
          onFilterChange={showFilter}
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
