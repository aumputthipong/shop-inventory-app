import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'

import { activeNavPath, navGroupsFor } from '@/lib/nav'

export function AppNav({ isOwner, onNavigate }: { isOwner: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = activeNavPath(pathname)

  return (
    <nav aria-label="เมนูหลัก" className="flex flex-col gap-5 px-3 py-4">
      {navGroupsFor(isOwner).map((group) => (
        <div key={group.label ?? 'home'} className="flex flex-col gap-1">
          {group.label && <p className="px-3 text-xs text-ink-3">{group.label}</p>}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const current = item.to === active
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: true }}
                    aria-current={current ? 'page' : undefined}
                    onClick={onNavigate}
                    className={cn(
                      'relative flex h-9 items-center rounded-md px-3 text-sm',
                      current
                        ? 'bg-brand-50 font-semibold text-ink before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-marker-500'
                        : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
