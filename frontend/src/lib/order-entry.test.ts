import { describe, expect, it } from 'vitest'

import { emptyDetails, missingDetail, orderFields, type EntryDetails } from '@/lib/order-entry'

const details = (overrides: Partial<EntryDetails>): EntryDetails => ({
  ...emptyDetails,
  ...overrides,
})

describe('missingDetail', () => {
  it.each([
    ['store sale handed over', 'store', details({}), false],
    ['store pickup with nobody', 'store', details({ handover: 'later', name: ' ' }), true],
    [
      'store pickup with a phone',
      'store',
      details({ handover: 'later', phone: '0812345678' }),
      false,
    ],
    ['online without a channel', 'online', details({}), true],
    ['shopee without its number', 'online', details({ channel: 'shopee' }), true],
    [
      'shopee with its number',
      'online',
      details({ channel: 'shopee', externalRef: '2410' }),
      false,
    ],
    ['line without a name', 'online', details({ channel: 'line', phone: '0812345678' }), true],
    ['line with a name', 'online', details({ channel: 'line', name: 'มะลิ' }), false],
  ] as const)('%s', (_, mode, d, missing) => {
    expect(missingDetail(mode, d) !== null).toBe(missing)
  })
})

describe('orderFields', () => {
  it('hands a store sale over unless it is picked up later', () => {
    expect(orderFields('store', details({ name: 'มะลิ' }))).toEqual({
      channel: 'store',
      handed_over: true,
    })
    expect(orderFields('store', details({ handover: 'later', name: ' มะลิ ' }))).toEqual({
      channel: 'store',
      customer: { name: 'มะลิ', phone: undefined, address: undefined },
    })
  })

  it('sends only what the chosen channel uses', () => {
    expect(
      orderFields('online', details({ channel: 'shopee', externalRef: ' 2410 ', name: 'x' })),
    ).toEqual({ channel: 'shopee', external_ref: '2410' })
    expect(
      orderFields('online', details({ channel: 'line', externalRef: 'x', name: 'มะลิ' })),
    ).toEqual({ channel: 'line', customer: { name: 'มะลิ', phone: undefined, address: undefined } })
  })
})
