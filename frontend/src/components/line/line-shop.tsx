import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { capFor, cartLines, type Cart } from '@/components/line/cart'
import { CartStep } from '@/components/line/cart-step'
import { DetailsStep, type Delivery, type DeliveryField } from '@/components/line/details-step'
import { ReceiptStep } from '@/components/line/receipt-step'
import { ApiError, api, shortagesOf, type LineCatalogItem, type LineReceipt } from '@/lib/api'
import type { LineIdentity } from '@/lib/line-identity'

const catalogKey = ['line', 'catalog']
const deliveryFields: DeliveryField[] = ['name', 'phone', 'address']

export function LineShop({ identity, devMode }: { identity: LineIdentity; devMode: boolean }) {
  const queryClient = useQueryClient()
  const catalog = useQuery({
    queryKey: catalogKey,
    queryFn: ({ signal }) => api.lineCatalog(signal),
  })
  const [cart, setCart] = useState<Cart>({})
  const [step, setStep] = useState<'cart' | 'details'>('cart')
  const [delivery, setDelivery] = useState<Delivery>({
    name: identity.displayName,
    phone: '',
    address: '',
    note: '',
  })
  const [receipt, setReceipt] = useState<LineReceipt | null>(null)

  const items = catalog.data ?? []
  const lines = cartLines(items, cart)
  const units = lines.reduce((sum, l) => sum + l.qty, 0)
  const total = lines.reduce((sum, l) => sum + Number(l.item.price) * l.qty, 0)

  const place = useMutation({
    mutationFn: () =>
      api.placeLineOrder({
        id_token: identity.idToken,
        name: delivery.name.trim(),
        phone: delivery.phone.trim(),
        address: delivery.address.trim(),
        note: delivery.note.trim() || undefined,
        items: lines.map((l) => ({ product_id: l.item.id, qty: l.qty })),
      }),
    onSuccess: (r) => {
      setReceipt(r)
      setCart({})
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.code === 'insufficient_stock') {
        const short = new Map(shortagesOf(error).map((s) => [s.product_id, s.available]))
        setCart((current) => {
          const next = { ...current }
          for (const [id, available] of short)
            next[id] = Math.max(0, Math.min(next[id] ?? 0, available))
          return next
        })
        setStep('cart')
        await queryClient.invalidateQueries({ queryKey: catalogKey })
      }
    },
  })
  const shortages = shortagesOf(place.error)
  const fieldErrors = place.error instanceof ApiError ? place.error.fields : []
  const badField = deliveryFields.find((f) => fieldErrors.some((e) => e.field === f))

  const setQty = (item: LineCatalogItem, qty: number) => {
    setCart((current) => ({ ...current, [item.id]: Math.max(0, Math.min(qty, capFor(item))) }))
  }

  if (receipt) {
    return (
      <ReceiptStep
        devMode={devMode}
        receipt={receipt}
        inClient={identity.inClient}
        onClose={identity.close}
        onOrderAgain={() => {
          setReceipt(null)
          setStep('cart')
          place.reset()
        }}
      />
    )
  }

  if (step === 'details') {
    let error: string | null = null
    if (place.isError && shortages.length === 0 && !badField) {
      error =
        place.error instanceof ApiError && place.error.status === 401
          ? 'การเข้าสู่ระบบ LINE หมดอายุ ปิดหน้านี้แล้วเปิดใหม่อีกครั้ง'
          : 'สั่งซื้อไม่สำเร็จ ลองใหม่อีกครั้ง'
    }
    return (
      <DetailsStep
        devMode={devMode}
        lines={lines}
        units={units}
        total={total}
        delivery={delivery}
        badField={badField}
        error={error}
        pending={place.isPending}
        onChange={(patch) => {
          setDelivery((current) => ({ ...current, ...patch }))
        }}
        onBack={() => {
          setStep('cart')
        }}
        onSubmit={() => {
          place.mutate()
        }}
      />
    )
  }

  return (
    <CartStep
      devMode={devMode}
      displayName={identity.displayName}
      items={items}
      loading={catalog.isPending}
      failed={catalog.isError}
      cart={cart}
      shortages={shortages}
      units={units}
      total={total}
      onSetQty={setQty}
      onNext={() => {
        setStep('details')
      }}
    />
  )
}
