import { describe, expect, it } from 'vitest'
import { readViewMode, writeViewMode } from './viewMode'

function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial }
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
  }
}

describe('viewMode', () => {
  it('ברירת מחדל cards כשאין ערך שמור', () => {
    expect(readViewMode(fakeStorage())).toBe('cards')
  })

  it('קורא table אחרי כתיבה', () => {
    const storage = fakeStorage()
    writeViewMode(storage, 'table')
    expect(readViewMode(storage)).toBe('table')
  })

  it('ערך זר נופל ל-cards', () => {
    expect(readViewMode(fakeStorage({ 'mi:view-mode': 'bogus' }))).toBe('cards')
  })
})
