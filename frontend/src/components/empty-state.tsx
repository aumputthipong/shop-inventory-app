import type * as React from 'react'

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
      <svg width="96" height="80" viewBox="0 0 96 80" aria-hidden="true" className="mb-2">
        <ellipse cx="48" cy="71" rx="34" ry="6" fill="#efe9e1" />
        <path d="M22 34L48 24L74 34L48 44Z" fill="#e9cfa0" />
        <path
          d="M22 34L48 44V70L22 60Z"
          fill="#f7e6c4"
          stroke="#c98a2e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M74 34L48 44V70L74 60Z"
          fill="#fcefd6"
          stroke="#c98a2e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M22 34L48 44L40 51L13 41Z"
          fill="#fcefd6"
          stroke="#c98a2e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M74 34L48 44L56 51L83 41Z"
          fill="#f7e6c4"
          stroke="#c98a2e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="72" cy="15" r="8" fill="#fff" stroke="#0e5e6f" strokeWidth="2.5" />
        <path d="M78 21l6 6" stroke="#0e5e6f" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className="text-base font-semibold">{title}</p>
      {body && <p className="max-w-sm text-[13px] text-ink-2">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
