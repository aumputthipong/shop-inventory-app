import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { RefreshCwIcon } from 'lucide-react'

import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/lib/api'

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const offline = !isApiError(error) || error.status >= 500

  return (
    <div className="mx-auto max-w-lg py-16">
      <EmptyState
        title={offline ? 'เชื่อมต่อระบบไม่ได้ตอนนี้' : 'เปิดหน้านี้ไม่สำเร็จ'}
        body={
          offline
            ? 'เช็กอินเทอร์เน็ต หรือรอสักครู่แล้วลองใหม่ ข้อมูลที่บันทึกไปแล้วไม่หาย'
            : 'ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้กลับไปหน้าสต็อก'
        }
        action={
          <div className="flex gap-2.5">
            <Button
              onClick={() => {
                reset()
                void router.invalidate()
              }}
            >
              <RefreshCwIcon aria-hidden="true" />
              ลองใหม่
            </Button>
            <Button asChild variant="outline">
              <Link to="/stock">ไปหน้าสต็อก</Link>
            </Button>
          </div>
        }
      />
    </div>
  )
}

export function RouteNotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <EmptyState
        title="ไม่เจอหน้านี้"
        body="ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว"
        action={
          <Button asChild>
            <Link to="/stock">ไปหน้าสต็อก</Link>
          </Button>
        }
      />
    </div>
  )
}
