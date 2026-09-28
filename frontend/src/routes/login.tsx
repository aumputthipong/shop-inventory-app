import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { LogInIcon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, api } from '@/lib/api'
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
      throw redirect({ to: '/stock' })
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
      await navigate({ to: next?.startsWith('/') ? next : '/stock' })
    },
  })

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    login.mutate()
  }

  const errorMessage =
    login.error instanceof ApiError && login.error.code === 'invalid_credentials'
      ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง'
      : login.error
        ? 'เชื่อมต่อระบบไม่ได้ ลองใหม่อีกครั้ง'
        : null

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-[420px] rounded-[26px] bg-white p-8 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark size={40} />
          <div>
            <h1 className="text-[22px] leading-8 font-bold">เข้าสู่ระบบหลังร้าน</h1>
            <p className="text-sm text-sand-800">Shop Inventory</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-semibold">อีเมล</span>
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
            <span className="text-[15px] font-semibold">รหัสผ่าน</span>
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
              className="rounded-xl bg-chip-bad px-3.5 py-2.5 text-sm text-chip-bad-fg"
            >
              {errorMessage}
            </p>
          )}

          <Button type="submit" size="lg" disabled={login.isPending || !email || !password}>
            <LogInIcon aria-hidden="true" />
            {login.isPending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>
      </div>
    </main>
  )
}
