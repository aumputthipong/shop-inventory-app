import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'

import { CountForm } from '@/components/counts/count-form'
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
      <div>
        <Link
          to="/counts"
          className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          กลับไปหน้าตรวจนับ
        </Link>
        <h1 className="text-[22px] leading-[30px] font-semibold">นับสต็อก</h1>
        <p className="text-sm text-ink-2">ใส่จำนวนที่นับได้จริง ระบบจะเทียบกับตัวเลขในระบบให้</p>
      </div>
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
