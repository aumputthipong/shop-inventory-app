import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { InboxIcon } from 'lucide-react'

import { NewOrderForm } from '@/components/orders/new-order-form'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { productsQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/_app/orders/new')({
  loader: ({ context }) =>
    context.queryClient.query({ ...productsQueryOptions, staleTime: 'static' }),
  component: NewOrderPage,
})

function NewOrderPage() {
  const { data: products } = useSuspenseQuery(productsQueryOptions)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ขายหน้าร้าน"
        actions={
          <Button asChild variant="outline">
            <Link to="/orders/online">
              <InboxIcon aria-hidden="true" />
              คีย์ออเดอร์ออนไลน์
            </Link>
          </Button>
        }
      />
      <NewOrderForm products={products} mode="store" />
    </div>
  )
}
