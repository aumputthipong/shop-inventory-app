// Registers the jest-dom matchers (toBeInTheDocument and friends) on Vitest's
// expect, and their types on the Assertion interface.
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library only auto-cleans when test globals are enabled. They are
// not, so unmount explicitly to keep tests isolated.
afterEach(() => {
  cleanup()
})
