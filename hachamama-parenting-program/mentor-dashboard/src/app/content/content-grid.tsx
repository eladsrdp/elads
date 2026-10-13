// hachamama-parenting-program/mentor-dashboard/src/app/content/content-grid.tsx
'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
const SELECTED_WEEK_STORAGE_KEY = 'content-selected-week'
const DEFAULT_COL_WIDTHS = { time: 70, media: 44, actions: 108 }
// עמודות היום עצמו (מס"ד/שבוע/יום-בשבוע/כותרת) — מחושבות ונעולות מתוך מספר היום
// (יום 1 הוא תמיד ראשון, ראו program-day.ts), לא ניתנות לעריכה נפרדת מכוונת.
const DAY_COLS_GRID = '70px 70px 90px 1fr'
const DAYS_PER_WEEK = 7

// קו מפריד עדין בין עמודות — מיושם על כל עמודה חוץ מהאחרונה בכל שורה/כותרת, כדי ששתי
// הרשתות השונות (מידע-יום מול הודעות) ייראו כל אחת כטבלה אחידה בפני עצמה, במקום טקסט צף.
function colDividerStyle(isLast: boolean): CSSProperties {
  return isLast ? {} : { borderInlineEnd: `1px solid ${BRAND.border}`, paddingInlineEnd: 8 }
}

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

  // כרטיסיות שבוע: ברירת מחדל — השבוע האחרון שיש בו הודעות (שם בדרך כלל עובדים). הבחירה האחרונה
  // נשמרת ב-localStorage (per-viewer, לא קריטי — עטוף ב-try/catch).
  const weekNumbers = useMemo(
    () => [...new Set(groups.map((g) => calculateWeekNumber(g.dayNumber)))].sort((a, b) => a - b),
    [groups],
  )
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    const weeksWithMessages = groups.filter((g) => g.messages.length > 0).map((g) => calculateWeekNumber(g.dayNumber))
    return weeksWithMessages.length ? Math.max(...weeksWithMessages) : (weekNumbers[0] ?? 1)
  })
  // ימים מכווצים (ברירת מחדל — הכל פתוח)
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set())

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(SELECTED_WEEK_STORAGE_KEY))
      if (saved && weekNumbers.includes(saved)) setSelectedWeek(saved)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectWeek(week: number) {
    setSelectedWeek(week)
    try {
      window.localStorage.setItem(SELECTED_WEEK_STORAGE_KEY, String(week))
    } catch {}
  }

  const weekGroups = groups.filter((g) => calculateWeekNumber(g.dayNumber) === selectedWeek)

  function toggleDay(dayNumber: number) {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayNumber)) next.delete(dayNumber)
      else next.add(dayNumber)
      return next
    })
  }

  function expandAll() {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      weekGroups.forEach((g) => next.delete(g.dayNumber))
      return next
    })
  }

  function collapseAll() {
    setCollapsedDays((prev) => new Set([...prev, ...weekGroups.map((g) => g.dayNumber)]))
  }

  function jumpToDay(dayNumber: number) {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      next.delete(dayNumber)
      return next
    })
    setTimeout(() => document.getElementById(`day-${dayNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }
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

  // כרטיסיה חדשה = שבוע חדש (7 ימים ריקים) אחרי השבוע האחרון הקיים.
  async function handleAddWeek() {
    const nextWeek = Math.max(0, ...weekNumbers) + 1
    const firstDay = (nextWeek - 1) * DAYS_PER_WEEK + 1
    const dayNumbers = Array.from({ length: DAYS_PER_WEEK }, (_, i) => firstDay + i).filter(
      (n) => !groups.some((g) => g.dayNumber === n),
    )
    try {
      const created = await dataSource.createContentDays(dayNumbers)
      setGroups((prev) =>
        [...prev, ...created.map((d) => ({ dayNumber: d.day_number, title: d.title, messages: [] }))].sort(
          (a, b) => a.dayNumber - b.dayNumber,
        ),
      )
      selectWeek(nextWeek)
    } catch (err) {
      window.alert(`הוספת השבוע נכשלה: ${err instanceof Error ? err.message : String(err)}`)
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
    try {
      const hasDeliveries = await dataSource.hasDeliveries(messageId)
      if (hasDeliveries && !window.confirm('ההודעה הזו כבר נשלחה/מתוזמנת למישהו. למחוק בכל זאת? (תימחק גם היסטוריית השליחה שלה)')) return
      if (!hasDeliveries && !window.confirm('למחוק את ההודעה?')) return
      await dataSource.deleteMessage(messageId)
      if (panelMessageId === messageId) setPanelMessageId(null)
      setGroups((prev) => prev.map((g) => (g.dayNumber !== dayNumber ? g : { ...g, messages: g.messages.filter((m) => m.id !== messageId) })))
    } catch (err) {
      window.alert(`מחיקת ההודעה נכשלה: ${err instanceof Error ? err.message : String(err)}`)
    }
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
      {/* כרטיסיות שבועות (כמו חוצצים בקלסר) + בחירת יום + פתח/כווץ הכל — דביק בראש המסך */}
      <div style={{ position: 'sticky', top: 0, zIndex: 4, background: BRAND.white, paddingTop: 4 }}>
        <div role="tablist" style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: `2px solid ${BRAND.greenDark}` }}>
          {weekNumbers.map((week) => {
            const active = week === selectedWeek
            return (
              <button
                key={week}
                role="tab"
                aria-selected={active}
                onClick={() => selectWeek(week)}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${BRAND.border}`,
                  borderBottom: active ? `2px solid ${BRAND.white}` : `1px solid ${BRAND.border}`,
                  marginBottom: -2,
                  borderRadius: '8px 8px 0 0',
                  background: active ? BRAND.greenDark : BRAND.paper,
                  color: active ? BRAND.white : BRAND.greenDark,
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                שבוע {week}
              </button>
            )
          })}
          <button
            onClick={handleAddWeek}
            title="הוסף שבוע חדש (7 ימים ריקים)"
            style={{ ...buttonSecondaryStyle, borderRadius: '8px 8px 0 0', marginBottom: -2, whiteSpace: 'nowrap' }}
          >
            + שבוע
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 6,
            padding: '8px 0',
            background: BRAND.white,
            borderBottom: `1px solid ${BRAND.border}`,
          }}
        >
          <span style={{ fontSize: 13, color: BRAND.greenMuted }}>קפוץ ליום:</span>
          {weekGroups.map((g) => (
            <button
              key={g.dayNumber}
              onClick={() => jumpToDay(g.dayNumber)}
              style={{
                ...buttonSecondaryStyle,
                padding: '3px 10px',
                fontSize: 13,
                opacity: collapsedDays.has(g.dayNumber) ? 0.6 : 1,
              }}
            >
              {calculateWeekdayName(g.dayNumber)} · {g.dayNumber}
            </button>
          ))}
          <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 6 }}>
            <button style={{ ...buttonSecondaryStyle, padding: '3px 10px', fontSize: 13 }} onClick={expandAll}>
              ▾ הרחב הכל
            </button>
            <button style={{ ...buttonSecondaryStyle, padding: '3px 10px', fontSize: 13 }} onClick={collapseAll}>
              ▸ כווץ הכל
            </button>
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: DAY_COLS_GRID,
          gap: 8,
          height: HEADER_ROW_HEIGHT,
          alignItems: 'center',
          padding: '0 8px',
          background: BRAND.paper,
          borderBottom: `1px solid ${BRAND.border}`,
          fontSize: 12,
          fontWeight: 600,
          color: BRAND.greenMuted,
        }}
      >
        <span style={colDividerStyle(false)}>מס&quot;ד</span>
        <span style={colDividerStyle(false)}>שבוע</span>
        <span style={colDividerStyle(false)}>יום בשבוע</span>
        <span style={colDividerStyle(true)}>כותרת</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: rowGridColumns,
          gap: 8,
          height: HEADER_ROW_HEIGHT,
          alignItems: 'center',
          padding: '0 8px',
          background: BRAND.white,
          borderTop: `1px solid ${BRAND.border}`,
          borderBottom: `2px solid ${BRAND.greenDark}`,
          fontSize: 12,
          fontWeight: 600,
          color: BRAND.greenMuted,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', ...colDividerStyle(false) }}>
          שעה
          <ResizeHandle onMouseDown={(e) => startResize('time', e)} />
        </div>
        <span style={colDividerStyle(false)}>תוכן</span>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', ...colDividerStyle(false) }}>
          מדיה
          <ResizeHandle onMouseDown={(e) => startResize('media', e)} />
        </div>
        <span style={colDividerStyle(true)}>פעולות</span>
      </div>

      {weekGroups.map((group) => {
        const collapsed = collapsedDays.has(group.dayNumber)
        return (
        <div key={group.dayNumber} id={`day-${group.dayNumber}`} style={{ scrollMarginTop: 110 }}>
          <div
            role="button"
            tabIndex={0}
            aria-expanded={!collapsed}
            onClick={() => toggleDay(group.dayNumber)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleDay(group.dayNumber)
              }
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: DAY_COLS_GRID,
              gap: 8,
              background: BRAND.paper,
              color: BRAND.greenDark,
              fontWeight: 600,
              padding: '6px 8px',
              borderBottom: `1px solid ${BRAND.border}`,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span style={colDividerStyle(false)}>
              {collapsed ? '▸' : '▾'} {group.dayNumber}
            </span>
            <span style={colDividerStyle(false)}>{calculateWeekNumber(group.dayNumber)}</span>
            <span style={colDividerStyle(false)}>{calculateWeekdayName(group.dayNumber)}</span>
            <span style={colDividerStyle(true)}>
              {group.title ?? '—'}
              {collapsed && group.messages.length > 0 ? ` (${group.messages.length} הודעות)` : ''}
            </span>
          </div>
          {!collapsed && group.messages.map((message) => (
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
              <div style={colDividerStyle(false)}>
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
              </div>
              <div style={colDividerStyle(false)}>
                {editingMessageId === message.id ? (
                  <textarea
                    autoFocus
                    defaultValue={message.body_text}
                    rows={3}
                    onBlur={(e) => handleBodySave(message.id, group.dayNumber, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        ;(e.target as HTMLTextAreaElement).blur()
                      }
                    }}
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', fontSize: 'inherit' }}
                  />
                ) : (
                  <span
                    onClick={() => (panelMessageId ? setPanelMessageId(message.id) : setEditingMessageId(message.id))}
                    style={{ cursor: 'text' }}
                  >
                    {message.body_text || '(ריק)'}
                  </span>
                )}
              </div>
              <div style={colDividerStyle(false)}>
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
              </div>
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
        )
      })}

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
          key={panelMessage.id}
          message={panelMessage}
          onClose={() => setPanelMessageId(null)}
          onBodySave={(body) => handleBodySave(panelMessage.id, panelMessage.content_day_number, body)}
          onMediaSaved={(url, type) => handleMediaSaved(panelMessage.id, panelMessage.content_day_number, url, type)}
        />
      )}
    </div>
  )
}
