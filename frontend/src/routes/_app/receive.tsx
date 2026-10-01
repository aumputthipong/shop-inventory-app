import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'

import { ReceiveForm } from '@/components/stock/receive-form'
import { productsQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/_app/receive')({
  loader: ({ context }) =>
    context.queryClient.query({ ...productsQueryOptions, staleTime: 'static' }),
  component: ReceivePage,
})

function ReceivePage() {
  const { data: products } = useSuspenseQuery(productsQueryOptions)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/stock"
          className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          กลับไปหน้าสต็อก
        </Link>
        <h1 className="text-[22px] leading-[30px] font-semibold">รับของจากใบส่งของ</h1>
        <p className="text-sm text-ink-2">
          ของมาส่งหลายอย่างพร้อมกัน เลือกสินค้าให้ครบแล้วบันทึกครั้งเดียว
          ทุกรายการจะเข้าสต็อกพร้อมกัน
        </p>
      </div>
      <ReceiveForm products={products} />
    </div>
  )
}
