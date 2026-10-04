import { MessageCircleIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function LineChatButton({ url, className }: { url: string; className?: string }) {
  return (
    <Button asChild variant="outline" className={className}>
      <a href={url} target="_blank" rel="noreferrer">
        <MessageCircleIcon className="text-[#22a95b]" aria-hidden="true" />
        แชทกับร้านทาง LINE
      </a>
    </Button>
  )
}
