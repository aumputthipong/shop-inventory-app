import { describe, expect, it } from 'vitest'

import { productInitial, productTone } from '@/lib/avatar'

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

describe('productTone', () => {
  it('gives the same product the same colour every time', () => {
    expect(productTone('SKU-0005')).toBe(productTone('SKU-0005'))
  })
})
