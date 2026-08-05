import { describe, expect, it } from 'vitest'
import type { IssueType } from '@make-issues/shared'
import { badgeColorForType } from './issueBadge'

describe('badgeColorForType', () => {
  it('מחזיר צבע שונה לכל אחד מ-4 סוגי התקלה', () => {
    const types: IssueType[] = [
      'עומדות להיגמר האופרציות',
      'נגמרו האופרציות',
      'תקלה בסנריו',
      'סנריו נפל',
    ]
    const colors = types.map(badgeColorForType)
    expect(new Set(colors).size).toBe(4)
  })

  it('נופל לצבע ברירת מחדל על ערך לא מוכר', () => {
    expect(badgeColorForType('לא קיים' as IssueType)).toBe('#64748b')
  })
})
