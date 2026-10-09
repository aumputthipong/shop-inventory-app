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
        <ellipse cx="48" cy="71" rx="34" ry="6" fill="#e8eaef" />
        <path d="M22 34L48 24L74 34L48 44Z" fill="#f3d83a" />
        <path
          d="M22 34L48 44V70L22 60Z"
          fill="#ffffff"
          stroke="#1c1f2a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M74 34L48 44V70L74 60Z"
          fill="#f4f5f7"
          stroke="#1c1f2a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M22 34L48 44L40 51L13 41Z"
          fill="#f4f5f7"
          stroke="#1c1f2a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M74 34L48 44L56 51L83 41Z"
          fill="#ffffff"
          stroke="#1c1f2a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="72" cy="15" r="8" fill="#fff" stroke="#2a3563" strokeWidth="2.5" />
        <path d="M78 21l6 6" stroke="#2a3563" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className="text-base font-semibold">{title}</p>
      {body && <p className="max-w-sm text-[13px] text-ink-2">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
