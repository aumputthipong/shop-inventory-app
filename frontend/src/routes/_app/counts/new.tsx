import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { CountForm } from '@/components/counts/count-form'
import { PageHeader } from '@/components/page-header'
import { productsQueryOptions } from '@/lib/queries'
import { useCurrentUser } from '@/lib/session'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/_app/counts/new')({
  loader: ({ context }) =>
    context.queryClient.query({ ...productsQueryOptions, staleTime: 'static' }),
  component: NewCountPage,
})

function NewCountPage() {
  const { data: products } = useSuspenseQuery(productsQueryOptions)
  const me = useCurrentUser()
  const navigate = useNavigate()
  const toast = useToast()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: '/counts', label: 'กลับไปหน้าตรวจนับ' }}
        title="นับสต็อก"
        description="ใส่จำนวนที่นับได้จริง ระบบจะเทียบกับตัวเลขในระบบให้"
      />
      <CountForm
        products={products}
        isOwner={me.isOwner}
        onSaved={async (count) => {
          toast(
            count.status === 'approved'
              ? `บันทึกผลนับ #${count.id} และปรับสต็อกแล้ว`
              : `ส่งผลนับ #${count.id} ให้เจ้าของร้านแล้ว`,
          )
          await navigate({ to: '/counts/$countId', params: { countId: count.id } })
        }}
      />
    </div>
  )
}
