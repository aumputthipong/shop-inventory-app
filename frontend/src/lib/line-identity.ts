import type { LineSettings } from '@/lib/api'

export interface LineIdentity {
  idToken: string
  displayName: string
  inClient: boolean
  close: () => void
}

export const DEV_CUSTOMER = 'ลูกค้าทดลอง'

// Resolves to null while LIFF redirects to LINE Login; the page reloads signed in.
export async function signInWithLine(
  settings: LineSettings,
  search: string,
): Promise<LineIdentity | null> {
  if (settings.mode === 'dev') {
    const asked = new URLSearchParams(search).get('as')?.trim() ?? ''
    const name = asked === '' ? DEV_CUSTOMER : asked
    return {
      idToken: `dev:${name}`,
      displayName: name,
      inClient: false,
      close: () => undefined,
    }
  }

  const { default: liff } = await import('@line/liff')
  await liff.init({ liffId: settings.liff_id })
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href })
    return null
  }
  const idToken = liff.getIDToken()
  if (!idToken) {
    throw new Error('LINE returned no ID token; turn on the openid scope for the LIFF app')
  }
  return {
    idToken,
    displayName: liff.getDecodedIDToken()?.name ?? '',
    inClient: liff.isInClient(),
    close: () => {
      liff.closeWindow()
    },
  }
}
