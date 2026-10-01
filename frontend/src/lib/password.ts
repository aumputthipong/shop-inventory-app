export const MIN_PASSWORD_LENGTH = 8

export function checkNewPassword(next: string, confirm: string) {
  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH
  const mismatch = confirm.length > 0 && confirm !== next
  return { tooShort, mismatch, ok: next.length >= MIN_PASSWORD_LENGTH && confirm === next }
}
