const LEADING_VOWELS = /^[เ-ไ]/
const TILE_TONES = [
  'bg-[#f7e6c4] text-[#7a4b00]',
  'bg-[#e3efe6] text-[#2f5f3f]',
  'bg-[#e6ecf6] text-[#34507e]',
  'bg-[#f3e4ea] text-[#7a3450]',
  'bg-[#e8e3f3] text-[#4d3f7c]',
  'bg-[#e0efef] text-[#1f5d5f]',
  'bg-[#f2e6dc] text-[#744a2c]',
]

// Thai names often open with a vowel that is written before its consonant (เ แ โ ใ ไ).
export function productInitial(name: string): string {
  const trimmed = name.trim().replace(LEADING_VOWELS, '')
  return (/\p{L}/u.exec(trimmed)?.[0] ?? '?').toUpperCase()
}

export function productTone(key: string): string {
  let hash = 0
  for (const ch of key) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  }
  return TILE_TONES[hash % TILE_TONES.length]
}
