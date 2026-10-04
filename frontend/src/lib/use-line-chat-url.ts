import { useQuery } from '@tanstack/react-query'

import { lineSettingsQueryOptions } from '@/lib/queries'

export function useLineChatUrl(): string | null {
  const url = useQuery(lineSettingsQueryOptions).data?.oa_url
  return url === undefined || url === '' ? null : url
}
