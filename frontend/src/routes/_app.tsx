import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { LogOutIcon, MenuIcon, UserRoundCogIcon, XIcon } from 'lucide-react'
import { Dialog, DropdownMenu } from 'radix-ui'
import { useState } from 'react'

import { AppNav } from '@/components/app-nav'
import { BrandMark } from '@/components/brand-mark'
import { api, isApiError } from '@/lib/api'
import { productInitial } from '@/lib/avatar'
import { roleLabel } from '@/lib/labels'
import { meQueryOptions } from '@/lib/queries'
import { useCurrentUser } from '@/lib/session'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient
      .query({ ...meQueryOptions, staleTime: 'static' })
      .catch((error: unknown) => {
        if (isApiError(error) && error.status === 401) return null
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

function AppLayout() {
  const me = useCurrentUser()

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 on-brand">
        <div className="flex h-14 items-center gap-2 px-4 md:px-6 lg:pl-0">
          <NavDrawer isOwner={me.isOwner} />
          <Link to="/" className="flex items-center gap-2.5 lg:w-52 lg:px-6">
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-tight">Shop Inventory</span>
          </Link>
          <div className="ml-auto">
            <AccountMenu name={me.name} roleText={roleLabel[me.role]} />
          </div>
        </div>
      </header>
      <div className="lg:grid lg:grid-cols-[208px_minmax(0,1fr)]">
        <aside className="hidden border-r border-edge bg-surface lg:sticky lg:top-14 lg:block lg:h-[calc(100svh-3.5rem)] lg:overflow-y-auto">
          <AppNav isOwner={me.isOwner} />
        </aside>
        <main className="@container w-full max-w-[1400px] min-w-0 px-4 py-6 md:px-6 xl:px-10 xl:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavDrawer({ isOwner }: { isOwner: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="เปิดเมนู"
        className="flex size-10 items-center justify-center rounded-full hover:bg-surface-2 lg:hidden"
      >
        <MenuIcon className="size-5" aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] overflow-y-auto bg-surface shadow-float outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left"
        >
          <div className="flex h-14 items-center justify-between border-b border-line px-6">
            <Dialog.Title className="flex items-center gap-2.5 text-[15px] font-semibold">
              <BrandMark />
              Shop Inventory
            </Dialog.Title>
            <Dialog.Close className="flex size-8 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink">
              <XIcon className="size-4" aria-hidden="true" />
              <span className="sr-only">ปิดเมนู</span>
            </Dialog.Close>
          </div>
          <AppNav
            isOwner={isOwner}
            onNavigate={() => {
              setOpen(false)
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
      <DropdownMenu.Trigger className="flex h-10 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-left hover:bg-surface-2">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-marker-500 text-[13px] font-semibold text-[#172036]"
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
