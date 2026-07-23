import { describe, expect, it } from 'vitest'
import { chunk } from './array'

describe('chunk', () => {
  it('מפצל בכפולה מדויקת', () => {
    expect(chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ])
  })

  it('שארית בקבוצה האחרונה — 10 בגודל 3 → 3,3,3,1', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [10],
    ])
  })

  it('מערך ריק → מערך קבוצות ריק', () => {
    expect(chunk([], 3)).toEqual([])
  })

  it('גודל קבוצה גדול מהמערך → קבוצה אחת', () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]])
  })
})
