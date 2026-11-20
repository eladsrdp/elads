// hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-table.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseMentorDataSource, type MentorRecord } from '@/lib/mentor-data-source'
import type { ContentVersionRecord } from '@/lib/content-data-source'
import { calculateDay1Date, calculateWeekdayName, day1DateForProgramDay, localWeekdayName } from '@/lib/program-day'
import { canDeleteParticipant, type ParticipantListItem } from '@/lib/mentor-view'
import { DEFAULT_TIMEZONE, timezoneLabel, timezoneOptionsFor } from '@/lib/timezones'
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
  versions,
}: {
  initialParticipants: ParticipantListItem[]
  mentors: MentorRecord[]
  versions: ContentVersionRecord[]
}) {
  const versionName = (id: string) => versions.find((v) => v.id === id)?.name ?? '—'
  const [participants, setParticipants] = useState(initialParticipants)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newTimezone, setNewTimezone] = useState(DEFAULT_TIMEZONE)
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const dataSource = createSupabaseMentorDataSource(createSupabaseBrowserClient())

  async function handleAdd() {
    if (!newName || !newPhone) return
    setErrorMessage(null)
    setAdding(true)
    try {
      // יום 1 = הראשון הקרוב לפי השעון המקומי של הנרשמת, לא של ישראל.
      const day1Date = calculateDay1Date(new Date(), newTimezone)
      const created = await dataSource.createParticipant({
        fullName: newName,
        phone: newPhone,
        day1Date,
        assignedMentorId: null,
        timezone: newTimezone,
      })
      setParticipants((prev) => [
        ...prev,
        {
          id: created.id,
          fullName: created.full_name,
          phone: created.phone,
          status: created.status,
          timezone: created.timezone,
          contentVersionId: created.content_version_id,
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
      setNewTimezone(DEFAULT_TIMEZONE)
      setSuccessMessage(`✓ ${created.full_name} נוסף/ה בהצלחה`)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (error) {
      setErrorMessage(`הוספת הנרשם נכשלה: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setAdding(false)
    }
  }

  async function handleFieldSave(
    id: string,
    fields: {
      fullName: string
      phone: string
      status: string
      assignedMentorId: string | null
      timezone: string
      programDay: number
      contentVersionId: string
    },
  ) {
    setErrorMessage(null)
    try {
      const current = participants.find((p) => p.id === id)
      // "היום בתוכנית" נגזר מ-day1_date — עריכה ידנית = הזזת day1_date כך שהיום המבוקש יהיה היום (לפי
      // השעון המקומי שלה). מעדכנים רק אם הערך באמת שונה. טריגר של *היום* שכבר נוצר נשאר עם היום הישן;
      // השינוי נכנס לתוקף מהטריגר הבא.
      const programDayChanged = !current || fields.programDay !== current.programDay
      if (programDayChanged) {
        const now = new Date()
        if (calculateWeekdayName(fields.programDay) !== localWeekdayName(now, fields.timezone)) {
          const ok = window.confirm(
            'יום ' + fields.programDay + ' בתוכנית מתוכנן ליום ' + calculateWeekdayName(fields.programDay) +
              ', אבל היום אצלה יום ' + localWeekdayName(now, fields.timezone) +
              '. התוכן ישלח ביום שבוע שלא תואם. להמשיך?',
          )
          if (!ok) return
        }
      }
      const { programDay, ...rest } = fields
      await dataSource.updateParticipant(id, {
        ...rest,
        ...(programDayChanged ? { day1Date: day1DateForProgramDay(programDay, new Date(), fields.timezone) } : {}),
      })
      setParticipants((prev) =>
        prev.map((p) =>
          p.id !== id
            ? p
            : {
                ...p,
                fullName: fields.fullName,
                phone: fields.phone,
                status: fields.status,
                timezone: fields.timezone,
                contentVersionId: fields.contentVersionId,
                programDay: fields.programDay,
                assignedMentorId: fields.assignedMentorId,
                assignedMentorName: mentors.find((m) => m.user_id === fields.assignedMentorId)?.full_name ?? null,
              },
        ),
      )
      setEditingId(null)
    } catch (error) {
      setErrorMessage(`שמירת השינויים נכשלה: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function handleDelete(id: string) {
    setErrorMessage(null)
    try {
      const counts = await dataSource.getParticipantHistoryCounts(id)
      if (!canDeleteParticipant(counts)) {
        setBlockedMessage('לא ניתן למחוק — יש להם היסטוריית הודעות. אפשר לשנות סטטוס ל"מושהה" במקום.')
        return
      }
      if (!window.confirm('למחוק את הנרשם?')) return
      await dataSource.deleteParticipant(id)
      setParticipants((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      setErrorMessage(`מחיקת הנרשם נכשלה: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div>
      {errorMessage && (
        <p style={{ color: BRAND.copper }}>
          {errorMessage}{' '}
          <button style={buttonSecondaryStyle} onClick={() => setErrorMessage(null)}>
            סגור
          </button>
        </p>
      )}
      {blockedMessage && (
        <p style={{ color: BRAND.copper }}>
          {blockedMessage}{' '}
          <button style={buttonSecondaryStyle} onClick={() => setBlockedMessage(null)}>
            סגור
          </button>
        </p>
      )}
      {successMessage && <p style={{ color: BRAND.greenDark, fontWeight: 600 }}>{successMessage}</p>}

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input style={textInputStyle} placeholder="שם מלא" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input style={textInputStyle} placeholder="טלפון" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        <select style={textInputStyle} value={newTimezone} onChange={(e) => setNewTimezone(e.target.value)} aria-label="אזור זמן">
          {timezoneOptionsFor(newTimezone).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button style={buttonPrimaryStyle} onClick={handleAdd} disabled={adding}>
          {adding ? 'מוסיף...' : '+ נרשם חדש'}
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: BRAND.paper }}>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>שם</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>טלפון</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>אזור זמן</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>גרסת תוכן</th>
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
              <EditRow key={p.id} participant={p} mentors={mentors} versions={versions} onSave={handleFieldSave} onCancel={() => setEditingId(null)} />
            ) : (
              <tr key={p.id} style={{ borderTop: `1px solid ${BRAND.border}` }}>
                <td style={{ padding: '6px' }}>
                  <Link href={`/participants/${p.id}`} style={{ color: BRAND.greenDark }}>
                    {p.fullName}
                  </Link>
                </td>
                <td style={{ padding: '6px' }}>{p.phone}</td>
                <td style={{ padding: '6px' }}>{timezoneLabel(p.timezone)}</td>
                <td style={{ padding: '6px' }}>{versionName(p.contentVersionId)}</td>
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
  versions,
  onSave,
  onCancel,
}: {
  participant: ParticipantListItem
  mentors: MentorRecord[]
  versions: ContentVersionRecord[]
  onSave: (
    id: string,
    fields: {
      fullName: string
      phone: string
      status: string
      assignedMentorId: string | null
      timezone: string
      programDay: number
      contentVersionId: string
    },
  ) => void
  onCancel: () => void
}) {
  const [fullName, setFullName] = useState(participant.fullName)
  const [phone, setPhone] = useState(participant.phone)
  const [status, setStatus] = useState(participant.status)
  const [timezone, setTimezone] = useState(participant.timezone)
  const [contentVersionId, setContentVersionId] = useState(participant.contentVersionId)
  const [programDayText, setProgramDayText] = useState(String(participant.programDay))
  const programDay = Number(programDayText)
  const programDayValid = Number.isInteger(programDay) && programDay >= 1
  const [assignedMentorId, setAssignedMentorId] = useState(participant.assignedMentorId ?? '')

  return (
    <tr style={{ borderTop: `1px solid ${BRAND.border}` }}>
      <td style={{ padding: '6px' }}>
        <input style={textInputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </td>
      <td style={{ padding: '6px' }}>
        <input style={textInputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </td>
      <td style={{ padding: '6px' }}>
        <select style={textInputStyle} value={timezone} onChange={(e) => setTimezone(e.target.value)} aria-label="אזור זמן">
          {timezoneOptionsFor(timezone).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: '6px' }}>
        <select
          style={textInputStyle}
          value={contentVersionId}
          onChange={(e) => setContentVersionId(e.target.value)}
          aria-label="גרסת תוכן"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: '6px' }}>
        <input
          style={{ ...textInputStyle, width: 70 }}
          type="number"
          min={1}
          value={programDayText}
          onChange={(e) => setProgramDayText(e.target.value)}
          aria-label="יום בתוכנית"
        />
      </td>
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
          disabled={!programDayValid}
          onClick={() =>
            onSave(participant.id, {
              fullName,
              phone,
              status,
              timezone,
              programDay,
              contentVersionId,
              assignedMentorId: assignedMentorId || null,
            })
          }
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
