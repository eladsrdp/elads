// hachamama-parenting-program/mentor-dashboard/src/app/content/content-grid.tsx
'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseContentDataSource } from '@/lib/content-data-source'
import type { DayGroup } from '@/lib/content-view'
import { EditPanel } from './edit-panel'

export function ContentGrid({ initialGroups }: { initialGroups: DayGroup[] }) {
  const [groups, setGroups] = useState(initialGroups)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [panelMessageId, setPanelMessageId] = useState<string | null>(null)
  const dataSource = createSupabaseContentDataSource(createSupabaseBrowserClient())

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

  async function handleAddMessage(dayNumber: number) {
    await dataSource.ensureContentDay(dayNumber)
    const orderInDay = groups.find((g) => g.dayNumber === dayNumber)?.messages.length ?? 0
    const created = await dataSource.createMessage({ contentDayNumber: dayNumber, sendOffsetTime: '06:45', orderInDay })
    setGroups((prev) => prev.map((g) => (g.dayNumber !== dayNumber ? g : { ...g, messages: [...g.messages, created] })))
  }

  async function handleDelete(messageId: string, dayNumber: number) {
    const hasDeliveries = await dataSource.hasDeliveries(messageId)
    if (hasDeliveries && !window.confirm('ההודעה הזו כבר נשלחה/מתוזמנת למישהו. למחוק בכל זאת?')) return
    if (!hasDeliveries && !window.confirm('למחוק את ההודעה?')) return
    await dataSource.deleteMessage(messageId)
    setGroups((prev) => prev.map((g) => (g.dayNumber !== dayNumber ? g : { ...g, messages: g.messages.filter((m) => m.id !== messageId) })))
  }

  function handleMediaSaved(messageId: string, dayNumber: number, mediaUrl: string, mediaType: string) {
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
      {groups.map((group) => (
        <div key={group.dayNumber}>
          <div
            style={{
              position: 'sticky',
              top: 0,
              background: 'var(--surface-1, #f5f5f5)',
              fontWeight: 500,
              padding: '4px 8px',
              zIndex: 1,
            }}
          >
            יום {group.dayNumber} {group.title ? `— ${group.title}` : ''}
          </div>
          {group.messages.map((message) => (
            <div
              key={message.id}
              style={{ display: 'grid', gridTemplateColumns: '60px 1fr 60px 90px', gap: 8, padding: '4px 8px', alignItems: 'center' }}
            >
              <span>{message.send_offset_time}</span>
              {editingMessageId === message.id ? (
                <input
                  autoFocus
                  defaultValue={message.body_text}
                  onBlur={(e) => handleBodySave(message.id, group.dayNumber, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                />
              ) : (
                <span onClick={() => setEditingMessageId(message.id)} style={{ cursor: 'text' }}>
                  {message.body_text || '(ריק)'}
                </span>
              )}
              <span>{message.media_url ? '🖼' : '-'}</span>
              <span>
                <button onClick={() => setPanelMessageId(message.id)}>⤢</button>
                <button onClick={() => handleDelete(message.id, group.dayNumber)}>🗑</button>
              </span>
            </div>
          ))}
          <button onClick={() => handleAddMessage(group.dayNumber)}>+ הודעה</button>
        </div>
      ))}

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
