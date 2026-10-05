import { describe, expect, it } from 'vitest'

import { productInitial } from '@/lib/avatar'

describe('productInitial', () => {
  it.each([
    ['ไดร์เป่าผม', 'ด'],
    ['เสื้อยืดคอกลม', 'ส'],
    ['แก้วน้ำ', 'ก'],
    ['กระเป๋าผ้า canvas', 'ก'],
    ['canvas tote', 'C'],
    ['  123 hair dryer', 'H'],
    ['', '?'],
  ])('%s starts with %s', (name, want) => {
    expect(productInitial(name)).toBe(want)
  })
})
