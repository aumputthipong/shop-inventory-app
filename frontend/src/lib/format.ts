const money = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })
const wholeMoney = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
})

const dateTime = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const fullDateTime = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatMoney(value: string | number): string {
  const n = Number(value)
  return Number.isInteger(n) ? wholeMoney.format(n) : money.format(n)
}

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

export function formatFullDateTime(iso: string): string {
  return fullDateTime.format(new Date(iso))
}

export function hoursSince(iso: string, now: Date = new Date()): number {
  return Math.max(Math.floor((now.getTime() - new Date(iso).getTime()) / 3_600_000), 0)
}

export function formatWaiting(hours: number): string {
  if (hours < 1) return 'รอไม่ถึง 1 ชม.'
  if (hours < 24) return `รอ ${hours} ชม.`
  return `รอ ${Math.floor(hours / 24)} วัน`
}

export function formatSigned(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${Math.abs(n)}`
  return '0'
}
