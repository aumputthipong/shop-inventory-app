import { useState } from 'react'

export function useProductSearch<T extends { name: string; sku: string }>(products: T[]) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const results =
    q === ''
      ? products
      : products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  return { query, setQuery, results }
}
