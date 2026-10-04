import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { LineShop } from '@/components/line/line-shop'
import { signInWithLine } from '@/lib/line-identity'
import { lineSettingsQueryOptions } from '@/lib/queries'

export const Route = createFileRoute('/line')({
  component: LineOrderPage,
})

function LineOrderPage() {
  const settings = useQuery(lineSettingsQueryOptions)
  const mode = settings.data?.mode
  const identity = useQuery({
    queryKey: ['line', 'identity', mode],
    queryFn: () => (settings.data ? signInWithLine(settings.data, window.location.search) : null),
    enabled: mode === 'dev' || mode === 'live',
    staleTime: Infinity,
    retry: false,
  })

  if (settings.isError || mode === 'off') {
    return <Notice>ร้านยังไม่เปิดให้สั่งผ่าน LINE ทักแชทร้านได้เลย</Notice>
  }
  if (identity.isError) {
    return <Notice>เข้าสู่ระบบ LINE ไม่สำเร็จ ปิดหน้านี้แล้วเปิดใหม่จากแชทร้าน</Notice>
  }
  if (!identity.data) {
    return <Notice>กำลังเปิดร้าน...</Notice>
  }
  return <LineShop identity={identity.data} devMode={mode === 'dev'} />
}

function Notice({ children }: { children: string }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-md items-center justify-center p-6 text-center text-sm text-ink-2">
      {children}
    </main>
  )
}
