import { Link } from '@tanstack/react-router'

import { ChannelIcon } from '@/components/chip'
import { ErrorAlert } from '@/components/error-alert'
import { Segmented } from '@/components/segmented'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { OrderSummary } from '@/lib/api'
import { channelLabel } from '@/lib/labels'
import type { EntryDetails } from '@/lib/order-entry'

interface DetailsProps {
  details: EntryDetails
  onChange: (patch: Partial<EntryDetails>) => void
}

function CustomerFields({
  details,
  onChange,
  phoneOptional,
}: DetailsProps & { phoneOptional: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="ชื่อลูกค้า">
        <Input
          value={details.name}
          maxLength={100}
          onChange={(e) => {
            onChange({ name: e.target.value })
          }}
        />
      </Field>
      <Field label={phoneOptional ? 'เบอร์โทร (ไม่ใส่ก็ได้)' : 'เบอร์โทร'}>
        <Input
          value={details.phone}
          maxLength={20}
          inputMode="tel"
          onChange={(e) => {
            onChange({ phone: e.target.value })
          }}
        />
      </Field>
    </div>
  )
}

export function StoreDetails({ details, onChange }: DetailsProps) {
  const later = details.handover === 'later'
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-ink-2">ลูกค้ารับของเมื่อไร</span>
        <Segmented
          label="ลูกค้ารับของเมื่อไร"
          value={details.handover}
          onChange={(handover) => {
            onChange({ handover })
          }}
          options={[
            { value: 'now', label: 'รับของไปเลย' },
            { value: 'later', label: 'เก็บไว้ให้ มารับทีหลัง' },
          ]}
        />
        <p className="text-xs text-ink-3">
          {later
            ? 'จองของไว้ให้ลูกค้า กดแพ็กและส่งเมื่อลูกค้ามารับ ใส่ชื่อหรือเบอร์อย่างน้อยหนึ่งช่อง'
            : 'ตัดของออกจากคลังทันที ไม่ต้องกดแพ็กและส่ง'}
        </p>
      </div>
      {later && <CustomerFields details={details} onChange={onChange} phoneOptional={false} />}
    </>
  )
}

export function OnlineDetails({
  details,
  onChange,
  duplicate,
  onRefBlur,
}: DetailsProps & { duplicate: OrderSummary | null; onRefBlur: () => void }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-ink-2">ลูกค้าสั่งมาทางไหน</span>
        <Segmented
          label="ลูกค้าสั่งมาทางไหน"
          value={details.channel}
          onChange={(channel) => {
            onChange({ channel })
          }}
          options={(['shopee', 'line'] as const).map((c) => ({
            value: c,
            label: (
              <>
                <ChannelIcon channel={c} />
                {channelLabel[c]}
              </>
            ),
          }))}
        />
        {details.channel === '' && (
          <p className="text-xs text-ink-3">
            เลือกช่องทางก่อน แล้วระบบจะถามข้อมูลที่ช่องทางนั้นต้องใช้
          </p>
        )}
      </div>

      {details.channel === 'shopee' && (
        <>
          <Field label="เลขออเดอร์ Shopee" hint="ระบบจะเตือนถ้าออเดอร์นี้เคยคีย์ไว้แล้ว">
            <Input
              value={details.externalRef}
              maxLength={100}
              placeholder="เช่น 241004ABCD1234"
              onChange={(e) => {
                onChange({ externalRef: e.target.value })
              }}
              onBlur={onRefBlur}
            />
          </Field>
          {duplicate && (
            <ErrorAlert>
              ออเดอร์ Shopee นี้บันทึกไว้แล้วเป็น{' '}
              <Link
                to="/orders/$orderId"
                params={{ orderId: duplicate.id }}
                className="font-medium underline"
              >
                {duplicate.order_no}
              </Link>{' '}
              ไม่ต้องคีย์ซ้ำ
            </ErrorAlert>
          )}
        </>
      )}

      {details.channel === 'line' && (
        <>
          <CustomerFields details={details} onChange={onChange} phoneOptional />
          <Field label="ที่อยู่จัดส่ง (ไม่ใส่ก็ได้)">
            <Input
              value={details.address}
              maxLength={500}
              onChange={(e) => {
                onChange({ address: e.target.value })
              }}
            />
          </Field>
        </>
      )}
    </>
  )
}
