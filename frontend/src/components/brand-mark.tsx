export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M4 10.5 16 5.5l12 5-12 5z"
        fill="#e9cfa0"
        stroke="#c98a2e"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M4 10.5v11.5l12 5v-11.5z"
        fill="#f7e6c4"
        stroke="#c98a2e"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M28 10.5v11.5l-12 5v-11.5z"
        fill="#fbf3e4"
        stroke="#c98a2e"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 8l12 5v4.5"
        fill="none"
        stroke="#0e5e6f"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
