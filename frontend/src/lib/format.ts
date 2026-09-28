const money = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })

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
  return money.format(Number(value))
}

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

export function formatFullDateTime(iso: string): string {
  return fullDateTime.format(new Date(iso))
}

export function formatSigned(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${Math.abs(n)}`
  return '0'
}
