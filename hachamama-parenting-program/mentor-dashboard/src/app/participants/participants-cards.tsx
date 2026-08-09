// hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-cards.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { calculateDay1Date } from '@/lib/program-day'
import { sortParticipantsByAttention, type ParticipantListItem } from '@/lib/mentor-view'
import { BRAND, buttonPrimaryStyle } from '@/lib/brand'

const textInputStyle = {
  padding: '6px 10px',
  border: `1px solid ${BRAND.greenMuted}`,
  borderRadius: 8,
  fontSize: 14,
} as const

export function ParticipantsCards({
  initialParticipants,
  currentMentorUserId,
}: {
  initialParticipants: ParticipantListItem[]
  currentMentorUserId: string | null
}) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)
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

  const visible = participants.filter((p) => !onlyMine || p.assignedMentorId === currentMentorUserId)
  const sorted = sortParticipantsByAttention(visible)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, margin: '16px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={textInputStyle} placeholder="שם מלא" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input style={textInputStyle} placeholder="טלפון" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        <button style={buttonPrimaryStyle} onClick={handleAdd}>
          + נרשם חדש
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto', color: BRAND.greenDark, fontSize: 14 }}>
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
          רק שלי
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {sorted.map((p) => {
          const needsAttention = (p.missedStreak ?? 0) >= 2
          return (
            <Link
              key={p.id}
              href={`/participants/${p.id}`}
              style={{
                display: 'block',
                background: BRAND.white,
                border: `1px solid ${needsAttention ? BRAND.copper : BRAND.border}`,
                borderRadius: 10,
                padding: 12,
                textDecoration: 'none',
                color: BRAND.greenDark,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{p.fullName}</div>
              <div style={{ fontSize: 13, marginBottom: 2 }}>{p.clickedToday ? '✅ לחצה היום' : '❌ עדיין לא היום'}</div>
              <div
                style={{
                  fontSize: 13,
                  marginBottom: 2,
                  color: needsAttention ? BRAND.copper : BRAND.greenMuted,
                  fontWeight: needsAttention ? 700 : 400,
                }}
              >
                {p.missedStreak === null ? `סטטוס: ${p.status}` : `רצף אי-לחיצה: ${p.missedStreak} ימים`}
              </div>
              <div style={{ fontSize: 13, marginBottom: 2 }}>🎥 {p.videoCount} סרטונים</div>
              <div style={{ fontSize: 13 }}>
                נשלח {p.deliveriesSent}/{p.deliveriesTotal}
              </div>
              {p.assignedMentorName && (
                <div style={{ fontSize: 12, color: BRAND.greenMuted, marginTop: 6 }}>מנחה: {p.assignedMentorName}</div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
