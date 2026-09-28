export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <rect width="34" height="34" rx="11" fill="#0e5e6f" />
      <rect x="9" y="10" width="4" height="14" rx="2" fill="#fff" />
      <rect x="15" y="10" width="4" height="14" rx="2" fill="#fff" />
      <rect x="21" y="10" width="4" height="14" rx="2" fill="#f2b84b" />
    </svg>
  )
}
