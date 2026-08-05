// צבע התג המוצג עבור כל אחד מ-4 סוגי התקלה (חומרה עולה).
import type { IssueType } from '@make-issues/shared'

const COLORS: Record<IssueType, string> = {
  'עומדות להיגמר האופרציות': '#d97706',
  'נגמרו האופרציות': '#ea580c',
  'תקלה בסנריו': '#dc2626',
  'סנריו נפל': '#991b1b',
}

export function badgeColorForType(type: IssueType): string {
  return COLORS[type] ?? '#64748b'
}
