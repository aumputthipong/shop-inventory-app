const LEADING_VOWELS = /^[เ-ไ]/

// Thai names often open with a vowel that is written before its consonant (เ แ โ ใ ไ).
export function productInitial(name: string): string {
  const trimmed = name.trim().replace(LEADING_VOWELS, '')
  return (/\p{L}/u.exec(trimmed)?.[0] ?? '?').toUpperCase()
}
