import { useQuery } from '@tanstack/react-query'
import { FlaskConicalIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api, type DemoAccount } from '@/lib/api'
import { roleLabel } from '@/lib/labels'

export function DemoAccounts({ onPick }: { onPick: (account: DemoAccount) => void }) {
  const { data } = useQuery({
    queryKey: ['demo-accounts'],
    queryFn: ({ signal }) => api.demoAccounts(signal),
    staleTime: Infinity,
    retry: false,
  })

  if (!data || data.length === 0) return null

  return (
    <section aria-label="บัญชีทดลอง" className="mt-6 flex flex-col gap-3 border-t border-line pt-5">
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <FlaskConicalIcon className="size-4 text-marker-700" aria-hidden="true" />
          บัญชีทดลอง
        </h2>
        <p className="text-xs text-ink-2">ข้อมูลเป็นร้านตัวอย่าง และถูกรีเซ็ตเป็นระยะ</p>
      </div>
      <ul className="flex flex-col gap-2">
        {data.map((account) => (
          <li
            key={account.email}
            className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-2 px-3 py-2.5"
          >
            <span className="flex min-w-0 flex-col text-[13px]">
              <span className="font-medium">{roleLabel[account.role]}</span>
              <span className="truncate text-ink-2">{account.email}</span>
              <span className="code text-ink-2">{account.password}</span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`ใช้บัญชี${roleLabel[account.role]}`}
              onClick={() => {
                onPick(account)
              }}
            >
              ใช้บัญชีนี้
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
