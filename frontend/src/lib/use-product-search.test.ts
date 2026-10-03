import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useProductSearch } from '@/lib/use-product-search'

const products = [
  { name: 'เสื้อยืดคอกลม', sku: 'SKU-0001' },
  { name: 'Hair Dryer', sku: 'SKU-0005' },
]

describe('useProductSearch', () => {
  it('returns everything until something is typed', () => {
    const { result } = renderHook(() => useProductSearch(products))
    expect(result.current.results).toEqual(products)
  })

  it('matches name or SKU, ignoring case and surrounding spaces', () => {
    const { result } = renderHook(() => useProductSearch(products))

    act(() => {
      result.current.setQuery('  hair ')
    })
    expect(result.current.results.map((p) => p.sku)).toEqual(['SKU-0005'])

    act(() => {
      result.current.setQuery('sku-0001')
    })
    expect(result.current.results.map((p) => p.name)).toEqual(['เสื้อยืดคอกลม'])
  })
})
