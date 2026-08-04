import type { IssueType } from '@make-issues/shared'
import { badgeColorForType } from '../lib/issueBadge'

export function IssueBadge({ type }: { type: IssueType }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: badgeColorForType(type) }}
    >
      {type}
    </span>
  )
}
