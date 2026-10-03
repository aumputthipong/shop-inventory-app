import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { LogInIcon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { DemoAccounts } from '@/components/auth/demo-accounts'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, isApiError } from '@/lib/api'
import { meQueryOptions } from '@/lib/queries'

interface LoginSearch {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.query(meQueryOptions).catch(() => null)
    if (me) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- router control flow
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { redirect: next } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = useMutation({
    mutationFn: () => api.login(email, password),
    onSuccess: async (user) => {
      queryClient.setQueryData(meQueryOptions.queryKey, user)
      await navigate({ to: next?.startsWith('/') ? next : '/' })
    },
  })

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    login.mutate()
  }

  const errorMessage = isApiError(login.error, 'invalid_credentials')
    ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง'
    : isApiError(login.error, 'account_disabled')
      ? 'บัญชีนี้ถูกปิดใช้งานแล้ว ติดต่อเจ้าของร้าน'
      : login.error
        ? 'เชื่อมต่อระบบไม่ได้ ลองใหม่อีกครั้ง'
        : null

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="panel w-full max-w-[400px] p-7">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark size={40} />
          <div>
            <h1 className="text-lg leading-7 font-semibold">เข้าสู่ระบบหลังร้าน</h1>
            <p className="text-sm text-ink-2">Shop Inventory</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-2">อีเมล</span>
            <Input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
              }}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-2">รหัสผ่าน</span>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
              }}
            />
          </label>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-md bg-chip-bad px-3 py-2.5 text-[13px] text-chip-bad-fg"
            >
              {errorMessage}
            </p>
          )}

          <Button type="submit" size="lg" disabled={login.isPending || !email || !password}>
            <LogInIcon aria-hidden="true" />
            {login.isPending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>

        <DemoAccounts
          onPick={(account) => {
            setEmail(account.email)
            setPassword(account.password)
          }}
        />
      </div>
    </main>
  )
}
