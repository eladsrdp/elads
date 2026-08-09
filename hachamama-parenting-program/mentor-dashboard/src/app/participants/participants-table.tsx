// hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-table.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseMentorDataSource, type MentorRecord } from '@/lib/mentor-data-source'
import { calculateDay1Date } from '@/lib/program-day'
import { canDeleteParticipant, type ParticipantListItem } from '@/lib/mentor-view'
import { BRAND, buttonPrimaryStyle, buttonSecondaryStyle, buttonDangerStyle } from '@/lib/brand'

const textInputStyle = {
  padding: '6px 10px',
  border: `1px solid ${BRAND.greenMuted}`,
  borderRadius: 8,
  fontSize: 14,
} as const

export function ParticipantsTable({
  initialParticipants,
  mentors,
}: {
  initialParticipants: ParticipantListItem[]
  mentors: MentorRecord[]
}) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const dataSource = createSupabaseMentorDataSource(createSupabaseBrowserClient())

  async function handleAdd() {
    if (!newName || !newPhone) return
    const day1Date = calculateDay1Date(new Date())
    const created = await dataSource.createParticipant({
      fullName: newName,
      phone: newPhone,
      day1Date,
      assignedMentorId: null,
    })
    setParticipants((prev) => [
      ...prev,
      {
        id: created.id,
        fullName: created.full_name,
        phone: created.phone,
        status: created.status,
        programDay: 1,
        clickedToday: false,
        missedStreak: 0,
        videoCount: 0,
        deliveriesSent: 0,
        deliveriesTotal: 0,
        assignedMentorId: null,
        assignedMentorName: null,
      },
    ])
    setNewName('')
    setNewPhone('')
  }

  async function handleFieldSave(
    id: string,
    fields: { fullName: string; phone: string; status: string; assignedMentorId: string | null },
  ) {
    await dataSource.updateParticipant(id, fields)
    setParticipants((prev) =>
      prev.map((p) =>
        p.id !== id
          ? p
          : {
              ...p,
              fullName: fields.fullName,
              phone: fields.phone,
              status: fields.status,
              assignedMentorId: fields.assignedMentorId,
              assignedMentorName: mentors.find((m) => m.user_id === fields.assignedMentorId)?.full_name ?? null,
            },
      ),
    )
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    const counts = await dataSource.getParticipantHistoryCounts(id)
    if (!canDeleteParticipant(counts)) {
      setBlockedMessage('לא ניתן למחוק — יש להם היסטוריית הודעות. אפשר לשנות סטטוס ל"מושהה" במקום.')
      return
    }
    if (!window.confirm('למחוק את הנרשם?')) return
    await dataSource.deleteParticipant(id)
    setParticipants((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div>
      {blockedMessage && (
        <p style={{ color: BRAND.copper }}>
          {blockedMessage}{' '}
          <button style={buttonSecondaryStyle} onClick={() => setBlockedMessage(null)}>
            סגור
          </button>
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input style={textInputStyle} placeholder="שם מלא" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input style={textInputStyle} placeholder="טלפון" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        <button style={buttonPrimaryStyle} onClick={handleAdd}>
          + נרשם חדש
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: BRAND.paper }}>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>שם</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>טלפון</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>יום בתוכנית</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>לחץ היום?</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>סטטוס</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>מנחה מוצמדת</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}></th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) =>
            editingId === p.id ? (
              <EditRow key={p.id} participant={p} mentors={mentors} onSave={handleFieldSave} onCancel={() => setEditingId(null)} />
            ) : (
              <tr key={p.id} style={{ borderTop: `1px solid ${BRAND.border}` }}>
                <td style={{ padding: '6px' }}>
                  <Link href={`/participants/${p.id}`} style={{ color: BRAND.greenDark }}>
                    {p.fullName}
                  </Link>
                </td>
                <td style={{ padding: '6px' }}>{p.phone}</td>
                <td style={{ padding: '6px' }}>{p.programDay}</td>
                <td style={{ padding: '6px' }}>{p.clickedToday ? '✅' : '❌'}</td>
                <td style={{ padding: '6px' }}>{p.status}</td>
                <td style={{ padding: '6px' }}>{p.assignedMentorName ?? '—'}</td>
                <td style={{ padding: '6px' }}>
                  <button style={buttonSecondaryStyle} onClick={() => setEditingId(p.id)}>
                    ✎
                  </button>
                  <button style={{ ...buttonDangerStyle, marginRight: 4 }} onClick={() => handleDelete(p.id)}>
                    🗑
                  </button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}

function EditRow({
  participant,
  mentors,
  onSave,
  onCancel,
}: {
  participant: ParticipantListItem
  mentors: MentorRecord[]
  onSave: (id: string, fields: { fullName: string; phone: string; status: string; assignedMentorId: string | null }) => void
  onCancel: () => void
}) {
  const [fullName, setFullName] = useState(participant.fullName)
  const [phone, setPhone] = useState(participant.phone)
  const [status, setStatus] = useState(participant.status)
  const [assignedMentorId, setAssignedMentorId] = useState(participant.assignedMentorId ?? '')

  return (
    <tr style={{ borderTop: `1px solid ${BRAND.border}` }}>
      <td style={{ padding: '6px' }}>
        <input style={textInputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </td>
      <td style={{ padding: '6px' }}>
        <input style={textInputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </td>
      <td style={{ padding: '6px' }}>{participant.programDay}</td>
      <td style={{ padding: '6px' }}>{participant.clickedToday ? '✅' : '❌'}</td>
      <td style={{ padding: '6px' }}>
        <select style={textInputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">active</option>
          <option value="paused">paused</option>
          <option value="completed">completed</option>
        </select>
      </td>
      <td style={{ padding: '6px' }}>
        <select style={textInputStyle} value={assignedMentorId} onChange={(e) => setAssignedMentorId(e.target.value)}>
          <option value="">—</option>
          {mentors.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: '6px' }}>
        <button
          style={{ ...buttonPrimaryStyle, marginLeft: 4 }}
          onClick={() => onSave(participant.id, { fullName, phone, status, assignedMentorId: assignedMentorId || null })}
        >
          שמור
        </button>
        <button style={buttonSecondaryStyle} onClick={onCancel}>
          בטל
        </button>
      </td>
    </tr>
  )
}
