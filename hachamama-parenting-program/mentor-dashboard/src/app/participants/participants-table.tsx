'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseMentorDataSource, type MentorRecord } from '@/lib/mentor-data-source'
import { calculateDay1Date } from '@/lib/program-day'
import { canDeleteParticipant, type ParticipantListItem } from '@/lib/mentor-view'

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
        <p style={{ color: 'red' }}>
          {blockedMessage} <button onClick={() => setBlockedMessage(null)}>סגור</button>
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input placeholder="שם מלא" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input placeholder="טלפון" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        <button onClick={handleAdd}>+ נרשם חדש</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'right' }}>שם</th>
            <th style={{ textAlign: 'right' }}>טלפון</th>
            <th style={{ textAlign: 'right' }}>יום בתוכנית</th>
            <th style={{ textAlign: 'right' }}>לחץ היום?</th>
            <th style={{ textAlign: 'right' }}>סטטוס</th>
            <th style={{ textAlign: 'right' }}>מנחה מוצמדת</th>
            <th style={{ textAlign: 'right' }}></th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) =>
            editingId === p.id ? (
              <EditRow key={p.id} participant={p} mentors={mentors} onSave={handleFieldSave} onCancel={() => setEditingId(null)} />
            ) : (
              <tr key={p.id} style={{ borderTop: '1px solid #ddd' }}>
                <td>
                  <Link href={`/participants/${p.id}`}>{p.fullName}</Link>
                </td>
                <td>{p.phone}</td>
                <td>{p.programDay}</td>
                <td>{p.clickedToday ? '✅' : '❌'}</td>
                <td>{p.status}</td>
                <td>{p.assignedMentorName ?? '—'}</td>
                <td>
                  <button onClick={() => setEditingId(p.id)}>✎</button>
                  <button onClick={() => handleDelete(p.id)}>🗑</button>
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
    <tr style={{ borderTop: '1px solid #ddd' }}>
      <td>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </td>
      <td>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </td>
      <td>{participant.programDay}</td>
      <td>{participant.clickedToday ? '✅' : '❌'}</td>
      <td>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">active</option>
          <option value="paused">paused</option>
          <option value="completed">completed</option>
        </select>
      </td>
      <td>
        <select value={assignedMentorId} onChange={(e) => setAssignedMentorId(e.target.value)}>
          <option value="">—</option>
          {mentors.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <button onClick={() => onSave(participant.id, { fullName, phone, status, assignedMentorId: assignedMentorId || null })}>
          שמור
        </button>
        <button onClick={onCancel}>בטל</button>
      </td>
    </tr>
  )
}
