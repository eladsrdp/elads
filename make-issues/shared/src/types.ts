// טיפוסים משותפים בין השרת לקליינט.

export const ISSUE_TYPES = [
  'עומדות להיגמר האופרציות',
  'נגמרו האופרציות',
  'תקלה בסנריו',
  'סנריו נפל',
] as const

export type IssueType = (typeof ISSUE_TYPES)[number]

export const ISSUE_STATUSES = ['open', 'handled', 'ignored'] as const
export type IssueStatus = (typeof ISSUE_STATUSES)[number]

/** תקלה כפי שהיא מוצגת בלוח הבקרה. */
export interface Issue {
  id: string
  clientName: string
  scenarioName: string
  description: string
  issueType: IssueType
  status: IssueStatus
  scenarioLink: string
  runLink: string
  createdAt: string // ISO
  resolvedAt: string | null // ISO
  resolvedBy: string | null // username
}

/** גוף ה-webhook שנשלח מ-Make.com. */
export interface WebhookIssueInput {
  clientName: string
  scenarioName: string
  description: string
  issueType: IssueType
  scenarioLink: string
  runLink: string
}

/** המשתמש המחובר. */
export interface Me {
  username: string
}
