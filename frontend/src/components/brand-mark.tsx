export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M4 10.5 16 5.5l12 5-12 5z"
        fill="#f3d83a"
        stroke="#1c1f2a"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M4 10.5v11.5l12 5v-11.5z"
        fill="#ffffff"
        stroke="#1c1f2a"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M28 10.5v11.5l-12 5v-11.5z"
        fill="#e8eaef"
        stroke="#1c1f2a"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 8l12 5v4.5"
        fill="none"
        stroke="#1c1f2a"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
