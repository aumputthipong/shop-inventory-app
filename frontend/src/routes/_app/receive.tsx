import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '@/components/page-header'
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
      <PageHeader
        back={{ to: '/stock', label: 'กลับไปหน้าสต็อก' }}
        title="รับของจากใบส่งของ"
        description="ของมาส่งหลายอย่างพร้อมกัน เลือกสินค้าให้ครบแล้วบันทึกครั้งเดียว ทุกรายการจะเข้าสต็อกพร้อมกัน"
      />
      <ReceiveForm products={products} />
    </div>
  )
}
