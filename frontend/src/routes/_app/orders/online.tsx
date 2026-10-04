import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { StoreIcon } from 'lucide-react'

import { NewOrderForm } from '@/components/orders/new-order-form'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { productsQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/_app/orders/online')({
  loader: ({ context }) =>
    context.queryClient.query({ ...productsQueryOptions, staleTime: 'static' }),
  component: OnlineOrderPage,
})

function OnlineOrderPage() {
  const { data: products } = useSuspenseQuery(productsQueryOptions)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: '/orders', label: 'กลับไปหน้าออเดอร์' }}
        title="คีย์ออเดอร์ออนไลน์"
        description="บันทึกออเดอร์ที่ลูกค้าสั่งทาง Shopee หรือทักแชท LINE ระบบกันของไว้จนกว่าจะแพ็กและส่ง ออเดอร์ที่ลูกค้าสั่งผ่านฟอร์ม LINE เข้ามาเองไม่ต้องคีย์"
        actions={
          <Button asChild variant="outline">
            <Link to="/orders/new">
              <StoreIcon aria-hidden="true" />
              ขายหน้าร้าน
            </Link>
          </Button>
        }
      />
      <NewOrderForm products={products} mode="online" />
    </div>
  )
}
