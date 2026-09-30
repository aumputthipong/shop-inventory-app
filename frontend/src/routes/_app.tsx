import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import {
  ClipboardListIcon,
  HistoryIcon,
  LogOutIcon,
  PackageIcon,
  ReceiptTextIcon,
  UserRoundCogIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import { DropdownMenu } from 'radix-ui'

import { BrandMark } from '@/components/brand-mark'
import { ApiError, api } from '@/lib/api'
import { productInitial } from '@/lib/avatar'
import { roleLabel } from '@/lib/labels'
import { meQueryOptions } from '@/lib/queries'
import { useCurrentUser } from '@/lib/session'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient
      .query({ ...meQueryOptions, staleTime: 'static' })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      })
    if (!me) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- router control flow
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { me }
  },
  component: AppLayout,
})

interface NavItem {
  to: '/orders' | '/stock' | '/ledger' | '/audit' | '/team'
  label: string
  icon: LucideIcon
  ownerOnly?: boolean
}

const NAV: NavItem[] = [
  { to: '/orders', label: 'ออเดอร์', icon: ReceiptTextIcon },
  { to: '/stock', label: 'สต็อก', icon: PackageIcon },
  { to: '/ledger', label: 'ประวัติสต็อก', icon: HistoryIcon },
  { to: '/audit', label: 'บันทึกการใช้งาน', icon: ClipboardListIcon, ownerOnly: true },
  { to: '/team', label: 'ทีม', icon: UsersIcon, ownerOnly: true },
]

function AppLayout() {
  const me = useCurrentUser()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 md:px-6 xl:gap-8 xl:px-10">
          <Link to="/stock" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="hidden text-[15px] font-semibold tracking-tight xl:inline">
              Shop Inventory
            </span>
          </Link>
          <nav
            aria-label="เมนูหลัก"
            className="flex min-w-0 items-stretch self-stretch overflow-x-auto overflow-y-hidden"
          >
            {NAV.filter((item) => !item.ownerOnly || me.isOwner).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm text-ink-2 hover:text-ink"
                activeProps={{
                  className: '!border-petrol-600 font-medium !text-ink',
                }}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <AccountMenu name={me.name} roleText={roleLabel[me.role]} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6 xl:px-10 xl:py-8">
        <Outlet />
      </main>
    </div>
  )
}

function AccountMenu({ name, roleText }: { name: string; roleText: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const logout = useMutation({
    mutationFn: api.logout,
    onSettled: async () => {
      queryClient.clear()
      await navigate({ to: '/login' })
    },
  })

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex h-10 items-center gap-2 rounded-md py-1 pr-2.5 pl-1 text-left hover:bg-surface-2">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-kraft-100 text-[13px] font-semibold text-kraft-700"
        >
          {productInitial(name)}
        </span>
        <span className="flex flex-col leading-[18px]">
          <span className="text-[13px] font-medium">{name}</span>
          <span className="text-xs text-ink-2">{roleText}</span>
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-48 rounded-lg border border-line bg-surface p-1 shadow-float"
        >
          <DropdownMenu.Item
            asChild
            className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm outline-none data-highlighted:bg-surface-2"
          >
            <Link to="/account">
              <UserRoundCogIcon className="size-4 text-ink-2" aria-hidden="true" />
              บัญชีของฉัน
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => {
              logout.mutate()
            }}
            className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm outline-none data-highlighted:bg-surface-2"
          >
            <LogOutIcon className="size-4 text-ink-2" aria-hidden="true" />
            ออกจากระบบ
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
