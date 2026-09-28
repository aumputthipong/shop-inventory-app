import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import {
  ClipboardListIcon,
  HistoryIcon,
  LogOutIcon,
  PackageIcon,
  ReceiptTextIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import { DropdownMenu } from 'radix-ui'

import { BrandMark } from '@/components/brand-mark'
import { productInitial } from '@/lib/avatar'
import { api } from '@/lib/api'
import { roleLabel } from '@/lib/labels'
import { meQueryOptions } from '@/lib/queries'
import { useCurrentUser } from '@/lib/session'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient
      .query({ ...meQueryOptions, staleTime: 'static' })
      .catch(() => null)
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
      <header className="sticky top-0 z-40 border-b border-sand-300 bg-white">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-9 px-10">
          <Link to="/stock" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-base font-bold">Shop Inventory</span>
          </Link>
          <nav aria-label="เมนูหลัก" className="flex items-center gap-1">
            {NAV.filter((item) => !item.ownerOnly || me.isOwner).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex h-10 items-center gap-2 rounded-xl px-3.5 text-[15px] font-medium text-sand-800 hover:bg-sand-100 hover:text-ink"
                activeProps={{
                  className: 'bg-petrol-100 font-semibold !text-petrol-600 hover:!bg-petrol-100',
                }}
              >
                <item.icon className="size-[18px]" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <AccountMenu name={me.name} roleText={roleLabel[me.role]} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-10 py-8">
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
      <DropdownMenu.Trigger className="flex h-12 items-center gap-2.5 rounded-2xl py-1 pr-3 pl-1.5 text-left hover:bg-sand-100">
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full bg-hold-light text-[15px] font-bold text-[#7a4b00]"
        >
          {productInitial(name)}
        </span>
        <span className="flex flex-col leading-[18px]">
          <span className="text-sm font-semibold">{name}</span>
          <span className="text-xs text-sand-800">{roleText}</span>
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-48 rounded-2xl bg-white p-1.5 shadow-lift"
        >
          <DropdownMenu.Item
            onSelect={() => {
              logout.mutate()
            }}
            className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-[15px] outline-none data-highlighted:bg-sand-100"
          >
            <LogOutIcon className="size-[18px] text-sand-800" aria-hidden="true" />
            ออกจากระบบ
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
