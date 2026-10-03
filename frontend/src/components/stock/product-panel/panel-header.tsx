import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PencilIcon } from 'lucide-react'

import { ProductAvatar } from '@/components/product-avatar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { api, type ProductDetail } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { invalidateStock } from '@/lib/queries'
import { useToast } from '@/lib/toast'

export function PanelHeader({
  product,
  isOwner,
  onEdit,
}: {
  product: ProductDetail
  isOwner: boolean
  onEdit: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const setActive = useMutation({
    mutationFn: (active: boolean) => api.updateProduct(product.id, { is_active: active }),
    onSuccess: async (saved) => {
      toast(
        saved.is_active
          ? `เปิดขาย ${saved.name} แล้ว`
          : `ปิดขาย ${saved.name} แล้ว ออเดอร์ใหม่จะสั่งไม่ได้`,
      )
      await invalidateStock(queryClient)
    },
  })

  return (
    <div className="flex items-center gap-3 border-b border-line px-5 py-4">
      <ProductAvatar name={product.name} sku={product.sku} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="truncate text-base leading-6 font-semibold">{product.name}</h2>
        <div className="flex gap-3 text-[13px] text-ink-2">
          <span className="code">{product.sku}</span>
          <span>{formatMoney(product.price)}</span>
        </div>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        {product.is_active ? 'เปิดขาย' : 'ปิดขาย'}
        <Switch
          checked={product.is_active}
          disabled={!isOwner || setActive.isPending}
          onCheckedChange={(checked) => {
            setActive.mutate(checked)
          }}
        />
      </label>
      {isOwner && (
        <Button variant="ghost" size="icon-sm" aria-label="แก้ไขสินค้า" onClick={onEdit}>
          <PencilIcon aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
