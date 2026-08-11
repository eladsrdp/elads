// hachamama-parenting-program/mentor-dashboard/src/app/content/content-grid.tsx
'use client'

import { useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseContentDataSource } from '@/lib/content-data-source'
import { calculateWeekdayName, calculateWeekNumber } from '@/lib/program-day'
import { BRAND, buttonPrimaryStyle, buttonSecondaryStyle, buttonDangerStyle } from '@/lib/brand'
import type { DayGroup } from '@/lib/content-view'
import { EditPanel } from './edit-panel'

const MEDIA_TYPE_ICON: Record<string, string> = {
  video: '🎬',
  audio: '🎵',
  document: '📄',
}

const HEADER_ROW_HEIGHT = 34
const DEFAULT_COL_WIDTHS = { time: 70, media: 44, actions: 108 }

type ResizableColumn = keyof typeof DEFAULT_COL_WIDTHS

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <span
      onMouseDown={onMouseDown}
      style={{
        cursor: 'col-resize',
        width: 8,
        marginInlineStart: 'auto',
        alignSelf: 'stretch',
        borderInlineStart: `2px solid ${BRAND.border}`,
      }}
    />
  )
}

export function ContentGrid({ initialGroups }: { initialGroups: DayGroup[] }) {
  const [groups, setGroups] = useState(initialGroups)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingTimeMessageId, setEditingTimeMessageId] = useState<string | null>(null)
  const [panelMessageId, setPanelMessageId] = useState<string | null>(null)
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS)
  const dragState = useRef<{ col: ResizableColumn; startX: number; startWidth: number } | null>(null)
  const dataSource = createSupabaseContentDataSource(createSupabaseBrowserClient())

  function handleResizeMove(e: MouseEvent) {
    if (!dragState.current) return
    const delta = e.clientX - dragState.current.startX
    const newWidth = Math.max(30, dragState.current.startWidth - delta)
    setColWidths((prev) => ({ ...prev, [dragState.current!.col]: newWidth }))
  }

  function handleResizeEnd() {
    dragState.current = null
    window.removeEventListener('mousemove', handleResizeMove)
    window.removeEventListener('mouseup', handleResizeEnd)
  }

  function startResize(col: ResizableColumn, e: React.MouseEvent) {
    e.preventDefault()
    dragState.current = { col, startX: e.clientX, startWidth: colWidths[col] }
    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)
  }

  const rowGridColumns = `${colWidths.time}px 1fr ${colWidths.media}px ${colWidths.actions}px`

  async function handleBodySave(messageId: string, dayNumber: number, newBody: string) {
    await dataSource.updateMessageBody(messageId, newBody)
    setGroups((prev) =>
      prev.map((g) =>
        g.dayNumber !== dayNumber
          ? g
          : { ...g, messages: g.messages.map((m) => (m.id === messageId ? { ...m, body_text: newBody } : m)) },
      ),
    )
    setEditingMessageId(null)
  }

  async function handleTimeSave(messageId: string, dayNumber: number, newTime: string) {
    setEditingTimeMessageId(null)
    if (!newTime) return
    await dataSource.updateMessageTime(messageId, newTime)
    setGroups((prev) =>
      prev.map((g) =>
        g.dayNumber !== dayNumber
          ? g
          : { ...g, messages: g.messages.map((m) => (m.id === messageId ? { ...m, send_offset_time: newTime } : m)) },
      ),
    )
  }

  async function handleAddDay() {
    const dayInput = window.prompt('מספר היום החדש בתוכנית (למשל 30)?')
    if (!dayInput) return
    const dayNumber = Number(dayInput)
    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      window.alert('יש להזין מספר יום תקין (1 ומעלה)')
      return
    }
    if (groups.some((g) => g.dayNumber === dayNumber)) {
      window.alert(`יום ${dayNumber} כבר קיים`)
      return
    }
    const title = window.prompt('כותרת ליום (אופציונלי — אפשר להשאיר ריק)')
    try {
      const created = await dataSource.createContentDay(dayNumber, title || null)
      setGroups((prev) =>
        [...prev, { dayNumber: created.day_number, title: created.title, messages: [] }].sort((a, b) => a.dayNumber - b.dayNumber),
      )
    } catch (err) {
      window.alert(`יצירת היום נכשלה: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  function handleAddToDayPrompt() {
    const input = window.prompt('להוסיף הודעה חדשה — לאיזה יום בתוכנית?')
    if (!input) return
    const dayNumber = Number(input)
    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      window.alert('יש להזין מספר יום תקין (1 ומעלה)')
      return
    }
    handleInsertMessage(dayNumber, null)
  }

  async function handleInsertMessage(dayNumber: number, afterMessageId: string | null) {
    await dataSource.ensureContentDay(dayNumber)
    const existing = groups.find((g) => g.dayNumber === dayNumber)?.messages ?? []
    const insertIndex = afterMessageId ? existing.findIndex((m) => m.id === afterMessageId) + 1 : existing.length
    const created = await dataSource.createMessage({ contentDayNumber: dayNumber, sendOffsetTime: '06:45', orderInDay: insertIndex })
    const combined = [...existing.slice(0, insertIndex), created, ...existing.slice(insertIndex)]
    const reindexed = combined.map((m, i) => ({ ...m, order_in_day: i }))
    await Promise.all(
      reindexed.filter((m, i) => combined[i].order_in_day !== i).map((m) => dataSource.updateMessageOrder(m.id, m.order_in_day)),
    )
    setGroups((prev) => prev.map((g) => (g.dayNumber !== dayNumber ? g : { ...g, messages: reindexed })))
  }

  async function handleDelete(messageId: string, dayNumber: number) {
    const hasDeliveries = await dataSource.hasDeliveries(messageId)
    if (hasDeliveries && !window.confirm('ההודעה הזו כבר נשלחה/מתוזמנת למישהו. למחוק בכל זאת?')) return
    if (!hasDeliveries && !window.confirm('למחוק את ההודעה?')) return
    await dataSource.deleteMessage(messageId)
    setGroups((prev) => prev.map((g) => (g.dayNumber !== dayNumber ? g : { ...g, messages: g.messages.filter((m) => m.id !== messageId) })))
  }

  function handleMediaSaved(messageId: string, dayNumber: number, mediaUrl: string | null, mediaType: string | null) {
    setGroups((prev) =>
      prev.map((g) =>
        g.dayNumber !== dayNumber
          ? g
          : {
              ...g,
              messages: g.messages.map((m) => (m.id === messageId ? { ...m, media_url: mediaUrl, media_type: mediaType as never } : m)),
            },
      ),
    )
  }

  const panelMessage = groups.flatMap((g) => g.messages).find((m) => m.id === panelMessageId) ?? null

  return (
    <div>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'grid',
          gridTemplateColumns: rowGridColumns,
          gap: 8,
          height: HEADER_ROW_HEIGHT,
          alignItems: 'center',
          padding: '0 8px',
          background: BRAND.white,
          borderBottom: `2px solid ${BRAND.greenDark}`,
          fontSize: 12,
          fontWeight: 600,
          color: BRAND.greenMuted,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          שעה
          <ResizeHandle onMouseDown={(e) => startResize('time', e)} />
        </div>
        <span>תוכן</span>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          מדיה
          <ResizeHandle onMouseDown={(e) => startResize('media', e)} />
        </div>
        <span>פעולות</span>
      </div>

      {groups.map((group) => (
        <div key={group.dayNumber}>
          <div
            style={{
              position: 'sticky',
              top: HEADER_ROW_HEIGHT,
              background: BRAND.paper,
              color: BRAND.greenDark,
              fontWeight: 600,
              padding: '6px 8px',
              borderBottom: `1px solid ${BRAND.border}`,
              zIndex: 1,
            }}
          >
            שבוע {calculateWeekNumber(group.dayNumber)} — יום {calculateWeekdayName(group.dayNumber)} — יום {group.dayNumber}{' '}
            {group.title ? `— ${group.title}` : ''}
          </div>
          {group.messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'grid',
                gridTemplateColumns: rowGridColumns,
                gap: 8,
                padding: '6px 8px',
                alignItems: 'center',
                borderBottom: `1px solid ${BRAND.border}`,
              }}
            >
              {editingTimeMessageId === message.id ? (
                <input
                  type="time"
                  autoFocus
                  defaultValue={message.send_offset_time}
                  onBlur={(e) => handleTimeSave(message.id, group.dayNumber, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                />
              ) : (
                <span onClick={() => setEditingTimeMessageId(message.id)} style={{ cursor: 'text' }}>
                  {message.send_offset_time}
                </span>
              )}
              {editingMessageId === message.id ? (
                <input
                  autoFocus
                  defaultValue={message.body_text}
                  onBlur={(e) => handleBodySave(message.id, group.dayNumber, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              ) : (
                <span onClick={() => setEditingMessageId(message.id)} style={{ cursor: 'text' }}>
                  {message.body_text || '(ריק)'}
                </span>
              )}
              {message.media_url && message.media_type === 'image' ? (
                <a href={message.media_url} target="_blank" rel="noreferrer">
                  <img
                    src={message.media_url}
                    alt="תצוגה מקדימה"
                    style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, display: 'block' }}
                  />
                </a>
              ) : message.media_url ? (
                <a href={message.media_url} target="_blank" rel="noreferrer" title={message.media_type ?? undefined}>
                  {MEDIA_TYPE_ICON[message.media_type ?? ''] ?? '📎'}
                </a>
              ) : (
                <span>-</span>
              )}
              <span>
                <button style={buttonSecondaryStyle} title="הוסף הודעה אחרי זו" onClick={() => handleInsertMessage(group.dayNumber, message.id)}>
                  +
                </button>
                <button style={{ ...buttonSecondaryStyle, marginRight: 4 }} onClick={() => setPanelMessageId(message.id)}>
                  ⤢
                </button>
                <button style={{ ...buttonDangerStyle, marginRight: 4 }} onClick={() => handleDelete(message.id, group.dayNumber)}>
                  🗑
                </button>
              </span>
            </div>
          ))}
        </div>
      ))}

      <button
        style={{
          ...buttonSecondaryStyle,
          position: 'fixed',
          bottom: 88,
          left: 24,
          borderRadius: '50%',
          width: 52,
          height: 52,
          fontSize: 22,
          background: BRAND.white,
          boxShadow: '0 2px 10px rgba(47, 95, 71, 0.25)',
          zIndex: 3,
        }}
        title="הוסף יום חדש"
        onClick={handleAddDay}
      >
        📅+
      </button>

      <button
        style={{
          ...buttonPrimaryStyle,
          position: 'fixed',
          bottom: 24,
          left: 24,
          borderRadius: '50%',
          width: 52,
          height: 52,
          fontSize: 26,
          boxShadow: '0 2px 10px rgba(47, 95, 71, 0.35)',
          zIndex: 3,
        }}
        title="הוסף הודעה חדשה"
        onClick={handleAddToDayPrompt}
      >
        +
      </button>

      {panelMessage && (
        <EditPanel
          message={panelMessage}
          onClose={() => setPanelMessageId(null)}
          onBodySave={(body) => handleBodySave(panelMessage.id, panelMessage.content_day_number, body)}
          onMediaSaved={(url, type) => handleMediaSaved(panelMessage.id, panelMessage.content_day_number, url, type)}
        />
      )}
    </div>
  )
}
