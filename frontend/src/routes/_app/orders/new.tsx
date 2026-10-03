import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { NewOrderForm } from '@/components/orders/new-order-form'
import { PageHeader } from '@/components/page-header'
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
        back={{ to: '/orders', label: 'กลับไปหน้าออเดอร์' }}
        title="ขายหน้าร้าน"
        description="เลือกสินค้า ใส่จำนวน แล้วบันทึก ถ้าของไม่พอ ระบบจะไม่บันทึกเลยสักชิ้น"
      />
      <NewOrderForm products={products} />
    </div>
  )
}
