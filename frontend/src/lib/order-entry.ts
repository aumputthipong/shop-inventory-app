import type { NewOrder } from '@/lib/api'

export type EntryMode = 'store' | 'online'

export interface EntryDetails {
  handover: 'now' | 'later'
  channel: 'shopee' | 'line' | ''
  externalRef: string
  name: string
  phone: string
  address: string
}

export const emptyDetails: EntryDetails = {
  handover: 'now',
  channel: '',
  externalRef: '',
  name: '',
  phone: '',
  address: '',
}

export function missingDetail(mode: EntryMode, d: EntryDetails): string | null {
  if (mode === 'store') {
    return d.handover === 'later' && d.name.trim() === '' && d.phone.trim() === ''
      ? 'ใส่ชื่อหรือเบอร์ลูกค้า จะได้รู้ว่าของที่เก็บไว้เป็นของใคร'
      : null
  }
  if (d.channel === '') return 'เลือกก่อนว่าลูกค้าสั่งมาทาง Shopee หรือ LINE'
  if (d.channel === 'shopee' && d.externalRef.trim() === '') return 'ใส่เลขออเดอร์ Shopee'
  if (d.channel === 'line' && d.name.trim() === '') return 'ใส่ชื่อลูกค้า'
  return null
}

function customerOf(d: EntryDetails): NewOrder['customer'] {
  const name = d.name.trim()
  const phone = d.phone.trim()
  const address = d.address.trim()
  if (name === '' && phone === '' && address === '') return undefined
  return {
    name: name || undefined,
    phone: phone || undefined,
    address: address || undefined,
  }
}

export function orderFields(
  mode: EntryMode,
  d: EntryDetails,
): Pick<NewOrder, 'channel' | 'external_ref' | 'handed_over' | 'customer'> {
  if (mode === 'store') {
    return d.handover === 'now'
      ? { channel: 'store', handed_over: true }
      : { channel: 'store', customer: customerOf(d) }
  }
  if (d.channel === 'shopee') return { channel: 'shopee', external_ref: d.externalRef.trim() }
  return { channel: 'line', customer: customerOf(d) }
}

export function effectSummary(mode: EntryMode, d: EntryDetails, units: number): string {
  if (mode === 'store' && d.handover === 'now') {
    return `ตัดของ ${units} ชิ้นออกจากคลังทันที`
  }
  const holder =
    mode === 'store'
      ? d.name.trim() || d.phone.trim()
      : d.channel === 'shopee'
        ? `ออเดอร์ Shopee ${d.externalRef.trim()}`
        : `${d.name.trim()} (LINE)`
  return `จองของ ${units} ชิ้นไว้ให้ ${holder} จนกว่าจะส่งหรือยกเลิก`
}
