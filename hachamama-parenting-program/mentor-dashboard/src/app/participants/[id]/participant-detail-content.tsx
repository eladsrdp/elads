// hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/participant-detail-content.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseMentorDataSource, type MentorRecord } from '@/lib/mentor-data-source'
import { canDeleteParticipant, type ParticipantDetailView } from '@/lib/mentor-view'
import { BRAND, buttonPrimaryStyle, buttonSecondaryStyle, buttonDangerStyle } from '@/lib/brand'

const fieldStyle = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  border: `1px solid ${BRAND.greenMuted}`,
  borderRadius: 8,
  fontSize: 14,
  marginTop: 4,
  boxSizing: 'border-box' as const,
}

export function ParticipantDetailContent({
  detail,
  mentors,
}: {
  detail: ParticipantDetailView
  mentors: MentorRecord[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(detail.fullName)
  const [phone, setPhone] = useState(detail.phone)
  const [status, setStatus] = useState(detail.status)
  const [assignedMentorId, setAssignedMentorId] = useState(detail.assignedMentorId ?? '')
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const dataSource = createSupabaseMentorDataSource(createSupabaseBrowserClient())

  async function handleSave() {
    setSaving(true)
    await dataSource.updateParticipant(detail.id, { fullName, phone, status, assignedMentorId: assignedMentorId || null })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  async function handleDelete() {
    const counts = await dataSource.getParticipantHistoryCounts(detail.id)
    if (!canDeleteParticipant(counts)) {
      setBlockedMessage('לא ניתן למחוק — יש לנרשם היסטוריית הודעות. אפשר לשנות סטטוס ל"מושהה" במקום.')
      return
    }
    if (!window.confirm('למחוק את הנרשם?')) return
    await dataSource.deleteParticipant(detail.id)
    router.push('/participants')
  }

  return (
    <div>
      {blockedMessage && <p style={{ color: BRAND.copper }}>{blockedMessage}</p>}

      {editing ? (
        <div style={{ marginBottom: 16, maxWidth: 360 }}>
          <label style={{ fontSize: 13, color: BRAND.greenDark }}>
            שם מלא
            <input style={fieldStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label style={{ fontSize: 13, color: BRAND.greenDark, display: 'block', marginTop: 10 }}>
            טלפון
            <input style={fieldStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label style={{ fontSize: 13, color: BRAND.greenDark, display: 'block', marginTop: 10 }}>
            סטטוס
            <select style={fieldStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="completed">completed</option>
            </select>
          </label>
          <label style={{ fontSize: 13, color: BRAND.greenDark, display: 'block', marginTop: 10 }}>
            מנחה מוצמדת
            <select style={fieldStyle} value={assignedMentorId} onChange={(e) => setAssignedMentorId(e.target.value)}>
              <option value="">—</option>
              {mentors.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </label>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button style={buttonPrimaryStyle} onClick={handleSave} disabled={saving}>
              {saving ? 'שומר...' : 'שמור'}
            </button>
            <button style={buttonSecondaryStyle} onClick={() => setEditing(false)}>
              בטל
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={buttonSecondaryStyle} onClick={() => setEditing(true)}>
            ✎ עריכה
          </button>
          <button style={buttonDangerStyle} onClick={handleDelete}>
            🗑 מחיקה
          </button>
        </div>
      )}
    </div>
  )
}
