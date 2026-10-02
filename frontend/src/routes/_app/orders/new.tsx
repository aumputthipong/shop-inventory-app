import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'

import { NewOrderForm } from '@/components/orders/new-order-form'
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
      <div>
        <Link
          to="/orders"
          className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          กลับไปหน้าออเดอร์
        </Link>
        <h1 className="text-[22px] leading-[30px] font-semibold">ขายหน้าร้าน</h1>
        <p className="text-sm text-ink-2">
          เลือกสินค้า ใส่จำนวน แล้วบันทึก ถ้าของไม่พอ ระบบจะไม่บันทึกเลยสักชิ้น
        </p>
      </div>
      <NewOrderForm products={products} />
    </div>
  )
}
