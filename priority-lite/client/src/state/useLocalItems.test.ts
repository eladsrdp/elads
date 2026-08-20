import { describe, expect, it } from 'vitest'
import { taskQuery } from './useLocalItems'

describe('taskQuery', () => {
  it('בלי taskId — מחרוזת ריקה', () => {
    expect(taskQuery(undefined)).toBe('')
  })

  it('עם taskId — פרמטר בנתיב', () => {
    expect(taskQuery(42)).toBe('?taskId=42')
  })
})
