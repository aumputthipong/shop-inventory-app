import type {
  AdjustReason,
  Channel,
  CountStatus,
  MovementType,
  OrderStatus,
  Role,
  StockStatus,
} from '@/lib/api'

export type ChipTone = 'ok' | 'warn' | 'bad' | 'info' | 'indigo' | 'violet' | 'teal' | 'neutral'

export const stockStatusChip: Record<StockStatus, { label: string; tone: ChipTone }> = {
  in_stock: { label: 'พร้อมขาย', tone: 'ok' },
  low: { label: 'ใกล้หมด', tone: 'warn' },
  out_of_stock: { label: 'หมดแล้ว', tone: 'bad' },
}

export const orderStatusChip: Record<OrderStatus, { label: string; tone: ChipTone }> = {
  reserved: { label: 'รอดำเนินการ', tone: 'warn' },
  packed: { label: 'แพ็กแล้ว', tone: 'info' },
  shipped: { label: 'ส่งแล้ว', tone: 'ok' },
  canceled: { label: 'ยกเลิก', tone: 'neutral' },
}

export const countStatusChip: Record<CountStatus, { label: string; tone: ChipTone }> = {
  submitted: { label: 'รอเจ้าของยืนยัน', tone: 'warn' },
  approved: { label: 'ปรับสต็อกแล้ว', tone: 'ok' },
  rejected: { label: 'ไม่ใช้ผลนับนี้', tone: 'neutral' },
}

export const movementChip: Record<MovementType, { label: string; tone: ChipTone }> = {
  STOCK_IN: { label: 'รับเข้า', tone: 'ok' },
  RESERVE: { label: 'จอง', tone: 'warn' },
  RELEASE: { label: 'คืนการจอง', tone: 'neutral' },
  SHIP: { label: 'ส่งออก', tone: 'indigo' },
  ADJUST: { label: 'ปรับยอด', tone: 'violet' },
  RETURN: { label: 'รับคืน', tone: 'teal' },
}

export const channelLabel: Record<Channel, string> = {
  store: 'หน้าร้าน',
  shopee: 'Shopee',
  line: 'LINE',
}

export const channelDot: Record<Channel, string> = {
  store: 'bg-kraft-500',
  shopee: 'bg-[#e8622c]',
  line: 'bg-[#22a95b]',
}

export const adjustReasonLabel: Record<AdjustReason, string> = {
  count_correction: 'นับสต็อกแล้วไม่ตรง',
  damaged: 'สินค้าเสียหาย',
  lost: 'สินค้าหาย',
  other: 'อื่นๆ',
}

export const roleLabel: Record<Role, string> = {
  owner: 'เจ้าของร้าน',
  staff: 'พนักงาน',
}

export const auditActionLabel: Record<string, string> = {
  'product.create': 'เพิ่มสินค้า',
  'product.update': 'แก้ไขสินค้า',
  'stock.in': 'รับของเข้า',
  'stock.adjust': 'ปรับยอดสต็อก',
  'stock.reverse': 'ยกเลิกรายการที่กรอกผิด',
  'count.submit': 'บันทึกผลตรวจนับ',
  'count.approve': 'ยืนยันผลตรวจนับ',
  'count.reject': 'ไม่ใช้ผลตรวจนับ',
  'order.create': 'สร้างออเดอร์',
  'order.rejected': 'ปฏิเสธออเดอร์ (ของไม่พอ)',
  'order.pack': 'แพ็กออเดอร์',
  'order.ship': 'ส่งออเดอร์',
  'order.cancel': 'ยกเลิกออเดอร์',
  'user.create': 'เพิ่มสมาชิกทีม',
  'user.disable': 'ปิดใช้งานบัญชี',
  'user.enable': 'เปิดใช้งานบัญชี',
  'user.password_reset': 'ตั้งรหัสผ่านใหม่ให้สมาชิก',
  'user.password_change': 'เปลี่ยนรหัสผ่าน',
}

const otherReasonLabel: Record<string, string> = {
  opening_balance: 'ยอดตั้งต้น',
  reversal: 'แก้รายการที่กรอกผิด',
}

export function movementReason(reason: string | null): string | null {
  if (reason === null) return null
  const labels: Record<string, string | undefined> = { ...adjustReasonLabel, ...otherReasonLabel }
  return labels[reason] ?? reason
}
